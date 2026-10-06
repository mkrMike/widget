import {
  ApiError,
  type Api,
  type BookingDraft,
  type BookingForm,
  type ChatReply,
  type ContactDetails,
  type ContactForm,
  type ConversationMode,
  type LiveEventData,
  type ReservationSummary,
  type Slot,
} from './api'
import {
  addMonths,
  type BookingState,
  calendarCells,
  currentMonth,
  describeReservation,
  emptyBooking,
  formatDay,
  formatDayNumber,
  formatMonth,
  formatSlot,
  formatTime,
  lastBookableMonth,
  monthOf,
  weekdayInitials,
} from './booking'
import { detailsChangedError, type ErrorPlace, isolate, knownError, maskEmail, maskPhone } from './contact'
import { h } from './dom'
import { direction, language, t } from './i18n'
import { LiveStream } from './live'
import { type ChatMessage, emptyChat, loadChat, saveChat, type StoredChat } from './storage'
import styles from './widget.css?inline'

const contactFields: (keyof ContactDetails)[] = ['firstName', 'lastName', 'email', 'phone']

/** "Resend code" is active this long after a code was sent. */
const resendDelayMs = 30_000

const senderFrom: Record<string, ChatMessage['from']> = {
  CUSTOMER: 'visitor',
  ASSISTANT: 'assistant',
  USER: 'employee',
}

/** A stream message and a response are the same message if they arrive this close together. */
const matchWindowMs = 60_000

function sameMessage(message: ChatMessage, from: ChatMessage['from'], text: string): boolean {
  return (
    message.from === from &&
    message.text.trim() === text.trim() &&
    Date.now() - (message.at ?? 0) < matchWindowMs
  )
}

/**
 * The chat bubble and its panel, rendered in a Shadow DOM so that the host
 * page's CSS can't break it and ours can't leak into the page.
 *
 * The panel shows either the chat or the booking panel, where the visitor
 * books and cancels (the assistant only opens it). Every user action
 * re-renders the panel from the state below. All user and server text goes
 * through textContent, never innerHTML.
 */
export class ChatWidget {
  private readonly api: Api
  private readonly widgetKey: string
  private readonly container: HTMLDivElement
  private readonly root: ShadowRoot

  private open = false
  private view: 'chat' | 'booking' = 'chat'
  private busy = false
  private error: string | null = null
  private chat: StoredChat
  private booking: BookingState = emptyBooking()
  /** Kept across re-renders so a failed request doesn't wipe what was typed. */
  private draft = ''
  private codeDraft = ''
  /** The contact and code errors, translated, shown under their field. */
  private fieldErrors: Partial<Record<ErrorPlace, string>> = {}
  /** "We sent you a new code." */
  private info: string | null = null
  /** No more codes on this channel for now (too many requested). */
  private resendBlocked = false
  /** After a 429 on the form, its buttons wait until then (ms; 0: not waiting). */
  private blockedUntil = 0
  /** Updates the resend countdown and ends the 429 wait. */
  private ticker: number | null = null
  /** A chat message is on its way: the "…" bubble. */
  private sendingMessage = false
  /**
   * The booking summary card above the input (a reservation the assistant
   * found by its code), and its stage: the summary, the cancel question, or
   * cancelled. Null: no card. Not stored: after a reload its status could be
   * stale (the business confirms or cancels); the customer asks again.
   */
  private summary: { reservation: ReservationSummary; stage: 'card' | 'confirm' | 'cancelled' } | null = null
  private summaryError: string | null = null
  /**
   * The booking form card: what the assistant collected in the chat (a free
   * slot), read-only with Confirm and Edit. In memory only, like the summary.
   */
  private bookingDraft: BookingDraft | null = null
  /**
   * The slot an anonymous visitor chose (Confirm, or "Request this time"):
   * booked automatically once the SMS code is verified. In memory only.
   */
  private bookAfterVerify: { resourceId: number; startAt: string } | null = null
  /** New messages arrived while the panel was closed: a dot on the bubble. */
  private unread = false
  private live: LiveStream | null = null
  /** The conversation and token the live stream is open for. */
  private liveKey: string | null = null

  constructor(api: Api, widgetKey: string) {
    this.api = api
    this.widgetKey = widgetKey
    this.chat = loadChat(widgetKey)

    const host = document.createElement('div')
    host.id = hostId
    const root = host.attachShadow({ mode: 'open' })
    this.root = root
    root.append(h('style', { textContent: styles }))
    // Arabic reads right to left: the layout mirrors (see widget.css).
    this.container = h('div', { className: 'widget', lang: language(), dir: direction() })
    root.append(this.container)
    document.body.append(host)

    this.render()
    this.syncLiveStream()
  }

  // Chat and verification

  private async sendMessage(text: string) {
    this.draft = text
    this.sendingMessage = true
    let bookingForm: BookingForm | null = null

    await this.run(async () => {
      const { conversationId, accessToken } = this.chat
      let reply: ChatReply
      if (conversationId === null || accessToken === null) {
        reply = await this.startConversation(text)
      } else {
        try {
          reply = await this.api.send(conversationId, accessToken, text)
        } catch (error) {
          if (!(error instanceof ApiError && error.sessionExpired)) {
            throw error
          }
          // The chat ended meanwhile (e.g. closed while the laptop slept and
          // the live event was missed): a new one starts with this message.
          this.endChat()
          reply = await this.startConversation(text)
        }
      }

      this.draft = ''

      // No employee can answer: the assistant says to try again later and the
      // backend closes the conversation (its token is revoked). The reply is
      // shown, then the chat ends; the next message starts a new one.
      if (reply.closed) {
        this.addFromResponse('visitor', text, reply.customerMessageId)
        this.addAssistantMessage(reply.assistantMessage, reply.assistantMessageId)
        this.endChat()
        return
      }

      this.chat.conversationId = reply.conversationId
      this.chat.accessToken = reply.accessToken

      // Null messageId: the anonymous limit is reached and the message was not stored.
      const limitReached = reply.messageId === null
      if (limitReached) {
        this.chat.messages.push({ from: 'visitor', text, notSent: true, at: Date.now() })
      } else {
        this.addFromResponse('visitor', text, reply.customerMessageId)
      }
      if (reply.mode) {
        this.setMode(reply.mode)
      }
      // The assistant collected the details in the chat (contactForm), or the
      // limit is reached: open the form. (contactRequired: an older backend
      // without contactForm; without either flag, on the limit only.)
      const contactRequired =
        (reply.contactForm != null || (reply.contactRequired ?? limitReached)) && !this.chat.verified

      // On the limit, our own text in the visitor's language instead of the
      // backend's English one. (A null reply otherwise: an employee will answer.)
      if (limitReached && contactRequired) {
        this.addAssistantMessage(t().contactLimit)
      } else if (limitReached && this.chat.step === 'verify') {
        this.addAssistantMessage(t().codeLimit)
      } else {
        this.addAssistantMessage(reply.assistantMessage, reply.assistantMessageId)
      }

      this.showSummary(reply.reservation)
      this.showDraft(reply.bookingDraft)

      if (contactRequired) {
        this.showContactForm(reply.contactForm ?? null)
        // Verification first, then the booking panel.
        this.chat.pendingBooking = reply.bookingForm ?? this.chat.pendingBooking
      } else {
        bookingForm = reply.bookingForm ?? null
      }
    })

    if (bookingForm) {
      this.openBooking(bookingForm)
    }
  }

  /**
   * A new, anonymous conversation (a returning customer verifies again). The
   * previous one's messages leave the window and storage, so two conversations
   * never mix (also for privacy on shared computers): one line remains.
   */
  private async startConversation(text: string): Promise<ChatReply> {
    const reply = await this.api.start(text)
    // Without a conversation, any message left is from one that ended.
    this.chat.messages =
      this.chat.messages.length > 0 ? [{ from: 'notice', text: t().previousChatEnded, at: Date.now() }] : []
    return reply
  }

  /** The conversation can't be continued (closed, or its token is no longer valid). */
  private endChat() {
    // Once, even if the closed event, a closed reply and a refused request all
    // say so. (A new conversation keeps no earlier "chat ended" line.)
    const messages = this.chat.messages
    const alreadyEnded =
      this.chat.conversationId === null && messages.some((message) => message.text === t().chatEnded)
    this.chat = {
      ...emptyChat(),
      messages: alreadyEnded ? messages : [...messages, { from: 'notice', text: t().chatEnded }],
    }
    this.view = 'chat'
    this.booking = emptyBooking()
    this.codeDraft = ''
    this.fieldErrors = {}
    this.info = null
    this.resendBlocked = false
    this.blockedUntil = 0
    this.summary = null
    this.summaryError = null
    this.bookingDraft = null
    this.bookAfterVerify = null
  }

  /** A new reservation in a reply replaces the card. */
  private showSummary(reservation: ReservationSummary | null | undefined) {
    if (reservation) {
      this.summary = { reservation, stage: 'card' }
      this.summaryError = null
    }
  }

  /**
   * Every reply carries the draft as it is now: a new one replaces the card,
   * null hides it (dropped, booked, or waiting for a new time). Absent from an
   * older backend: the card stays as it is.
   */
  private showDraft(draft: BookingDraft | null | undefined) {
    if (draft !== undefined) {
      this.bookingDraft = draft
    }
  }

  private setSummaryStage(stage: 'card' | 'confirm') {
    if (this.summary) {
      this.summary.stage = stage
      this.summaryError = null
      this.render()
    }
  }

  /** "Yes, cancel it": the same summary comes back, CANCELLED. */
  private cancelSummary() {
    const summary = this.summary
    if (!summary) {
      return
    }
    return this.run(async () => {
      try {
        const reservation = await this.api.cancelByCode(...this.session(), summary.reservation.code)
        this.summary = { reservation, stage: 'cancelled' }
      } catch (error) {
        // Back to the summary with the reason; others (e.g. 429) above the form.
        const reason =
          error instanceof ApiError && error.message === 'This reservation can no longer be cancelled'
            ? t().summary.notCancellable
            : error instanceof ApiError && error.message === 'Reservation not found'
              ? t().summary.notFound
              : null
        if (reason === null) {
          throw error
        }
        this.summary = { reservation: { ...summary.reservation, cancellable: false }, stage: 'card' }
        this.summaryError = reason
      }
    })
  }

  /**
   * Pre-filled with what the assistant collected (null values keep what the
   * visitor typed), read-only when all four are known. During the code step,
   * the backend only sends contactForm when the visitor corrected a detail in
   * the chat: the codes are invalid, the visitor confirms again.
   */
  private showContactForm(form: ContactForm | null) {
    if (this.chat.step === 'verify') {
      if (form === null) {
        return
      }
      this.confirmAgain()
    }
    const contact = this.chat.contact
    for (const name of contactFields) {
      contact[name] = form?.[name]?.trim() || contact[name]
    }
    this.chat.contactLocked = form !== null && contactFields.every((name) => form[name]?.trim())
    this.chat.step = 'contact'
  }

  /** The details changed since they were confirmed: back to the read-only form. */
  private confirmAgain() {
    this.chat.step = 'contact'
    this.chat.contactLocked = contactFields.every((name) => this.chat.contact[name].trim())
    this.chat.verificationRequired = []
    this.chat.codeSentAt = null
    this.chat.codeSentTo = null
    this.codeDraft = ''
    this.info = t().detailsChanged
  }

  /** The submitted form is the source of truth: sent as shown or edited. */
  private submitContact(details: ContactDetails) {
    this.chat.contact = details
    return this.run(async () => {
      try {
        const reply = await this.api.contact(...this.session(), details)
        this.chat.verificationRequired = reply.verificationRequired
        this.chat.step = reply.verificationRequired.length > 0 ? 'verify' : 'chat'
        this.codeSent(reply.codeSentTo)
      } catch (error) {
        if (!this.showFormError(error, 'form')) {
          throw error
        }
      }
    })
  }

  /** The email code first; the SMS is only sent once it is right. */
  private async submitCode(code: string) {
    const channel = this.chat.verificationRequired[0]
    let bookingForm: BookingForm | null = null
    // Set inside the request below (a plain `= null` would narrow it to null).
    let toBook = null as { resourceId: number; startAt: string } | null

    // The SMS code completes the verification (the email one comes first, and
    // PHONE is only listed after it): with a slot to send right after, the
    // booking's reply is the one.
    const bookingPending = channel === 'PHONE' && this.bookAfterVerify !== null

    await this.run(async () => {
      let reply
      try {
        reply = await this.api.verify(...this.session(), channel, code, bookingPending)
      } catch (error) {
        if (this.showFormError(error, 'code')) {
          return
        }
        throw error
      }
      this.codeDraft = ''

      // E.g. verified to talk to an employee, and none can answer: the reply,
      // then the chat ends (see sendMessage).
      if (reply.closed) {
        this.addAssistantMessage(reply.assistantMessage, reply.assistantMessageId)
        this.endChat()
        return
      }

      this.chat.verificationRequired = reply.verificationRequired
      if (reply.verificationRequired.length > 0) {
        // The next channel's code was just sent.
        this.codeSent(reply.codeSentTo)
      } else {
        // The old token is revoked: from now on only the new one works.
        this.chat.accessToken = reply.accessToken ?? this.chat.accessToken
        this.chat.verified = true
        this.chat.step = 'chat'
        this.addAssistantMessage(reply.assistantMessage, reply.assistantMessageId)
        this.showSummary(reply.reservation)
        this.showDraft(reply.bookingDraft)
        // The slot chosen before verification is sent now; otherwise the
        // assistant usually reopens the panel for the booking in progress.
        toBook = this.bookAfterVerify
        bookingForm = toBook ? null : (reply.bookingForm ?? this.chat.pendingBooking)
        this.bookAfterVerify = null
        this.chat.pendingBooking = null
      }
    })

    if (toBook) {
      await this.reserve(toBook.resourceId, toBook.startAt)
    } else if (bookingForm) {
      this.openBooking(bookingForm)
    }
  }

  private resendCode() {
    const channel = this.chat.verificationRequired[0]
    return this.run(async () => {
      try {
        await this.api.resend(...this.session(), channel)
        // Same destination: the resend answers 204 without it.
        this.codeSent(this.chat.codeSentTo)
        this.info = t().codeResent
      } catch (error) {
        if (!this.showFormError(error, 'code')) {
          throw error
        }
      }
    })
  }

  /** A new code is on its way: the resend countdown starts again. */
  private codeSent(sentTo: string | null | undefined) {
    this.chat.codeSentAt = Date.now()
    this.chat.codeSentTo = sentTo ?? null
    this.codeDraft = ''
    this.resendBlocked = false
  }

  /**
   * The contact and code errors under their field, translated. Returns false
   * for the others (shown above the form as before).
   */
  private showFormError(error: unknown, place: 'form' | 'code'): boolean {
    if (!(error instanceof ApiError)) {
      return false
    }
    // Too many attempts from this browser: the buttons wait for Retry-After.
    if (error.status === 429) {
      this.blockedUntil = error.retryAfterSeconds ? Date.now() + error.retryAfterSeconds * 1000 : 0
      this.fieldErrors[place] = t().formErrors.waitFewMinutes
      return true
    }
    if (error.status !== 400) {
      return false
    }
    if (error.message === detailsChangedError) {
      this.confirmAgain()
      return true
    }
    const known = knownError(error.message)
    if (!known) {
      return false
    }
    const [key, field, sent] = known
    if (key === 'tooManyCodes') {
      this.resendBlocked = true
    }
    // In the contact step, a code error (too many codes) goes above the buttons.
    this.fieldErrors[place === 'code' ? 'code' : field === 'code' ? 'form' : field] =
      key ? t().formErrors[key] : sent
    return true
  }

  private resendWaitSeconds(): number {
    const sentAt = this.chat.codeSentAt
    return sentAt === null ? 0 : Math.max(0, Math.ceil((sentAt + resendDelayMs - Date.now()) / 1000))
  }

  private blocked(): boolean {
    return this.blockedUntil > Date.now()
  }

  private resendButton(): Pick<HTMLButtonElement, 'textContent' | 'disabled'> {
    const wait = this.resendWaitSeconds()
    return {
      textContent: wait > 0 ? `${t().resendCode} (0:${String(wait).padStart(2, '0')})` : t().resendCode,
      disabled: this.busy || wait > 0 || this.resendBlocked || this.blocked(),
    }
  }

  /** Ticks every second while the form shows a countdown or waits after a 429. */
  private keepTicking() {
    const waiting =
      this.open && this.view === 'chat' && this.chat.step !== 'chat' && (this.resendWaitSeconds() > 0 || this.blocked())
    if (waiting && this.ticker === null) {
      this.ticker = window.setInterval(() => this.tick(), 1000)
    } else if (!waiting && this.ticker !== null) {
      window.clearInterval(this.ticker)
      this.ticker = null
    }
  }

  private tick() {
    if (this.blockedUntil !== 0 && !this.blocked()) {
      this.blockedUntil = 0
      this.render()
      return
    }
    // Only the link changes: no re-render while the visitor types the code.
    const resend = this.root.querySelector<HTMLButtonElement>('button.resend')
    if (resend) {
      Object.assign(resend, this.resendButton())
    }
    this.keepTicking()
  }

  // Booking panel

  /**
   * Opens the panel, pre-selecting the resource and day when given, the time
   * if it is still free, and showing why the panel opened (a refused booking).
   */
  private openBooking(form?: BookingForm, options: { startAt?: string; error?: string } = {}) {
    if (this.chat.conversationId === null) {
      return
    }

    this.open = true
    this.view = 'booking'
    this.booking = {
      ...emptyBooking(),
      resources: this.booking.resources,
      resourceId: form?.resourceId ?? this.booking.resourceId,
      date: form?.date ?? null,
      month: form?.date ? monthOf(form.date) : currentMonth(),
    }

    void this.run(async () => {
      const resources = await this.api.resources(...this.session())
      this.booking.resources = resources
      // Pre-selected by the assistant but not bookable (any more): choose again.
      if (!resources.some((resource) => resource.id === this.booking.resourceId)) {
        this.booking = { ...this.booking, resourceId: null, date: null }
      }
      await this.loadDaysAndSlots()
      const { startAt, error } = options
      if (startAt) {
        this.booking.slot =
          this.booking.slots?.find((slot) => slot.startAt.slice(0, 19) === startAt.slice(0, 19)) ?? null
      }
      if (error) {
        this.error = error
      }
    })
  }

  private async loadDaysAndSlots() {
    const { resourceId, month, date } = this.booking
    if (resourceId === null) {
      return
    }
    const days = await this.api.availableDays(...this.session(), resourceId, month)
    this.booking.availableDays = days.days
    this.booking.lastBookableDay = days.lastBookableDay
    if (date) {
      this.booking.slots = await this.api.slots(...this.session(), resourceId, date)
    }
  }

  private selectResource(resourceId: number | null) {
    this.booking = { ...this.booking, resourceId, availableDays: null, date: null, slots: null, slot: null }
    void this.run(() => this.loadDaysAndSlots())
  }

  private changeMonth(count: number) {
    this.booking = {
      ...this.booking,
      month: addMonths(this.booking.month, count),
      availableDays: null,
      date: null,
      slots: null,
      slot: null,
    }
    void this.run(() => this.loadDaysAndSlots())
  }

  private selectDay(date: string) {
    this.booking = { ...this.booking, date, slots: null, slot: null }
    void this.run(() => this.loadDaysAndSlots())
  }

  private selectSlot(slot: Slot) {
    this.booking.slot = slot
    this.error = null
    this.render()
  }

  /** "Request this time" in the panel. */
  private book() {
    const { resourceId, slot } = this.booking
    if (resourceId === null || slot === null) {
      return
    }
    return this.reserve(resourceId, slot.startAt)
  }

  /**
   * Books a slot, from the panel or the booking form card. An anonymous
   * visitor verifies first; the same slot is then sent automatically.
   */
  private async reserve(resourceId: number, startAt: string) {
    if (!this.chat.verified) {
      this.verifyThenBook(resourceId, startAt)
      return
    }

    let refused = null as string | null
    await this.run(async () => {
      try {
        const reservation = await this.api.book(...this.session(), resourceId, startAt)
        // The code is shown here even when the assistant doesn't reply.
        const sent: ChatMessage = {
          from: 'event',
          text: t().requestSent(describeReservation(reservation), isolate(reservation.code)),
        }
        // The live stream may have shown the assistant's reply already: this goes before it.
        const replyAt =
          reservation.assistantMessageId == null
            ? -1
            : this.chat.messages.findIndex((message) => message.id === reservation.assistantMessageId)
        if (replyAt >= 0) {
          this.chat.messages.splice(replyAt, 0, sent)
        } else {
          this.chat.messages.push(sent)
        }
        // The assistant's reply about the booking, in the customer's language
        // (already saved in the conversation); our own text if the AI failed.
        const reply = reservation.assistantMessage?.trim()
        if (reply) {
          this.addAssistantMessage(reply, reservation.assistantMessageId)
        } else {
          this.addAssistantMessage(t().afterBookingFallback)
        }
        this.bookingDraft = null
        this.booking = { ...emptyBooking(), resources: this.booking.resources }
        this.view = 'chat'
      } catch (error) {
        // Not verified after all (e.g. another tab): verification first.
        if (error instanceof ApiError && error.status === 403) {
          this.verifyThenBook(resourceId, startAt)
          this.error = error.message
          return
        }
        // Most likely the slot was taken meanwhile ("This time is not available
        // anymore: please choose another slot"): the panel on that day.
        if (error instanceof ApiError && error.status === 400) {
          refused = error.message
          return
        }
        throw error
      }
    })

    if (refused) {
      this.openBooking({ resourceId, date: startAt.slice(0, 10) }, { error: refused })
    }
  }

  private verifyThenBook(resourceId: number, startAt: string) {
    this.bookAfterVerify = { resourceId, startAt }
    this.askToVerify({ resourceId, date: startAt.slice(0, 10) })
  }

  /** Verification first; the panel reopens on the same resource and day afterwards. */
  private askToVerify(pending: BookingForm) {
    this.chat.pendingBooking = pending
    this.view = 'chat'
    this.goToStep('contact')
  }

  // Requests

  /** Runs a request with the busy state, error handling and persistence around it. */
  private async run(request: () => Promise<void>) {
    this.busy = true
    this.error = null
    this.fieldErrors = {}
    this.info = null
    this.summaryError = null
    this.render()

    try {
      await request()
    } catch (error) {
      this.handleError(error)
    } finally {
      this.busy = false
      this.sendingMessage = false
      this.commit()
    }
  }

  private handleError(error: unknown) {
    if (error instanceof ApiError && error.sessionExpired) {
      this.endChat()
      return
    }

    // Booking while anonymous.
    if (error instanceof ApiError && error.status === 403) {
      this.askToVerify({ resourceId: this.booking.resourceId, date: this.booking.date })
      this.error = error.message
      return
    }

    // An unknown widget key, or the business is deactivated. The conversation
    // is kept: it works again if the business is reactivated. (A reservation or
    // resource that isn't found has its own message.)
    if (error instanceof ApiError && error.status === 404 && !/^(Reservation|Resource) not found/.test(error.message)) {
      this.error = t().chatUnavailable
      return
    }

    if (error instanceof ApiError && error.status === 429) {
      this.error = error.retryAfterSeconds
        ? t().tooManyRequestsIn(error.retryAfterSeconds)
        : t().tooManyRequests
      return
    }

    // E.g. the assistant timed out: the message stays in the box to send again.
    if (error instanceof ApiError && error.status >= 500) {
      this.error = t().serverError
      return
    }

    this.error =
      error instanceof ApiError
        ? error.message
        : t().connectionError
  }

  private session(): [number, string] {
    const { conversationId, accessToken } = this.chat
    if (conversationId === null || accessToken === null) {
      throw new ApiError(401, 'No conversation', null)
    }
    return [conversationId, accessToken]
  }

  private addAssistantMessage(text: string | null, id?: number | null) {
    if (text) {
      this.addFromResponse('assistant', text, id)
    }
  }

  /**
   * A message from a response: skipped if the live stream already showed it.
   * Matched by id; responses without one (older backend, our own texts) fall
   * back to the same sender and text within a minute.
   */
  private addFromResponse(from: ChatMessage['from'], text: string, id?: number | null) {
    if (id != null) {
      const shown = this.chat.messages.find((message) => message.id === id)
      if (shown) {
        shown.streamed = false
      } else {
        this.chat.messages.push({ from, text, id, at: Date.now() })
      }
      return
    }

    const streamed = this.chat.messages.find((message) => message.streamed && sameMessage(message, from, text))
    if (streamed) {
      streamed.streamed = false
      return
    }
    this.chat.messages.push({ from, text, at: Date.now() })
  }

  // Live stream: employee messages, mode changes, and the echo of every other
  // non-SYSTEM message of the conversation (matched with the ones shown).

  /** Keeps one live stream open for the current conversation and token. */
  private syncLiveStream() {
    const { conversationId, accessToken } = this.chat
    const key = conversationId !== null && accessToken !== null ? `${conversationId}:${accessToken}` : null
    if (key === this.liveKey) {
      return
    }

    this.live?.stop()
    this.live = null
    this.liveKey = key
    if (conversationId === null || accessToken === null) {
      return
    }

    this.live = new LiveStream({
      url: this.api.eventsUrl(conversationId),
      headers: { 'X-Conversation-Access-Token': accessToken },
      onEvent: (event) => this.onLiveEvent(event.data),
      onError: (error) => {
        const apiError = new ApiError(error.status, error.message, null)
        if (!apiError.sessionExpired) {
          return true
        }
        // The token is no longer valid (expired, or replaced): the chat has ended.
        if (this.chat.accessToken === accessToken) {
          this.handleError(apiError)
          this.commit()
        }
        return false
      },
    })
  }

  private onLiveEvent(raw: string) {
    let data: LiveEventData
    try {
      data = JSON.parse(raw) as LiveEventData
    } catch {
      return
    }

    // Closed after 10 minutes without any message: its tokens are revoked.
    // Ending the chat also stops the stream (commit below).
    if (data.type === 'CLOSED') {
      if (this.chat.conversationId !== null) {
        this.endChat()
        this.error = null
        this.unread = !this.open
      }
      this.commit()
      return
    }
    if (data.type === 'MODE' && data.mode) {
      this.setMode(data.mode)
    }
    if (data.type === 'MESSAGE' && data.message) {
      const from = senderFrom[data.message.senderType]
      if (from && this.receive(from, data.message.content, data.message.id) && !this.open) {
        this.unread = true
      }
    }
    this.commit()
  }

  /** A message from the live stream. Returns whether it is new. */
  private receive(from: ChatMessage['from'], text: string, id: number): boolean {
    const messages = this.chat.messages
    if (messages.some((message) => message.id === id)) {
      return false
    }
    // Already shown from a response: just remember its id.
    const shown = messages.find(
      (message) => message.id === undefined && !message.notSent && sameMessage(message, from, text),
    )
    if (shown) {
      shown.id = id
      return false
    }
    messages.push({ from, text, id, streamed: true, at: Date.now() })
    return true
  }

  /** Who answers: a notice when it changes. */
  private setMode(mode: ConversationMode) {
    const previous = this.chat.mode
    if (mode === previous) {
      return
    }
    this.chat.mode = mode
    const notice =
      mode === 'WAITING_FOR_EMPLOYEE'
        ? t().waitingForEmployee
        : mode === 'WITH_EMPLOYEE'
          ? t().employeeJoined
          : t().backToAssistant
    this.chat.messages.push({ from: 'notice', text: notice, at: Date.now() })
  }

  /** Saves, follows the conversation with the live stream, and re-renders. */
  private commit() {
    saveChat(this.widgetKey, this.chat)
    this.syncLiveStream()
    this.render()
  }

  /** The contact form opened by the visitor ("Verify my details", "Change my details") is editable. */
  private goToStep(step: 'chat' | 'contact') {
    this.chat.step = step
    this.chat.contactLocked = false
    this.error = null
    this.fieldErrors = {}
    this.info = null
    saveChat(this.widgetKey, this.chat)
    this.render()
  }

  private showView(view: 'chat' | 'booking') {
    if (view === 'booking') {
      this.openBooking()
      return
    }
    this.view = view
    this.error = null
    this.render()
  }

  // Rendering

  private render() {
    this.keepTicking()
    // Live events re-render while the visitor types: keep the focus and caret.
    const active = this.root.activeElement
    const typing =
      active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
        ? { name: active.name, start: active.selectionStart, end: active.selectionEnd }
        : null

    const bubble = h('button', {
      type: 'button',
      className: `bubble${this.unread && !this.open ? ' unread' : ''}`,
      ariaLabel: this.open ? t().closeChat : t().openChat,
      textContent: this.open ? '×' : '💬',
      onclick: () => {
        this.open = !this.open
        this.unread = false
        this.render()
      },
    })

    this.container.replaceChildren(bubble)

    if (!this.open) {
      return
    }

    // The booking endpoints need a conversation: none before the first message.
    const canBook = this.chat.conversationId !== null && this.chat.step === 'chat'
    const header = h(
      'header',
      { className: 'panel-header' },
      h('span', { textContent: this.view === 'booking' ? t().book : t().title }),
      this.view === 'booking'
        ? h('button', {
            type: 'button',
            className: 'header-button',
            textContent: t().backToChat,
            onclick: () => this.showView('chat'),
          })
        : canBook
          ? h('button', {
              type: 'button',
              className: 'header-button',
              textContent: t().book,
              disabled: this.busy,
              onclick: () => this.showView('booking'),
            })
          : null,
    )

    const errorLine = this.error
      ? h('p', { className: 'error', role: 'alert', textContent: this.error })
      : null

    if (this.view === 'booking') {
      const body = this.renderBooking()
      this.container.append(
        h(
          'section',
          { className: 'panel', ariaLabel: t().book },
          header,
          body,
          errorLine ? h('div', { className: 'footer' }, errorLine) : null,
        ),
      )
      return
    }

    const messages = h(
      'ol',
      { className: 'messages' },
      ...this.chat.messages.map((message) =>
        h(
          'li',
          { className: `message ${message.from}${message.notSent ? ' not-sent' : ''}` },
          message.from === 'employee' ? h('span', { className: 'sender', textContent: t().employee }) : null,
          message.text,
          message.notSent ? h('span', { className: 'hint', textContent: t().notSent }) : null,
        ),
      ),
      this.sendingMessage
        ? h('li', { className: 'message assistant typing', textContent: '…' })
        : null,
    )

    const panel = h(
      'section',
      { className: 'panel', ariaLabel: t().title },
      header,
      this.chat.messages.length === 0
        ? h('p', { className: 'empty', textContent: t().greeting })
        : messages,
      // While the contact or code form is open, the visitor can still chat.
      h(
        'div',
        { className: 'footer' },
        errorLine,
        this.renderStepForm(),
        this.renderSummary(),
        this.renderDraft(),
        this.renderMessageForm(),
      ),
    )

    this.container.append(panel)
    messages.scrollTop = messages.scrollHeight
    const field = typing?.name
      ? panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${typing.name}"]`)
      : null
    if (field && typing) {
      field.focus()
      try {
        field.setSelectionRange(typing.start, typing.end)
      } catch {
        // Email inputs don't support selection ranges.
      }
    } else {
      panel.querySelector<HTMLElement>('.footer input:not([readonly]), .footer textarea')?.focus()
    }
  }

  private renderStepForm(): HTMLElement | null {
    switch (this.chat.step) {
      case 'contact':
        return this.renderContactForm()
      case 'verify':
        return this.renderVerifyForm()
      default:
        return null
    }
  }

  /** Resource, day and times (the business's wall clock), status and code. */
  private renderSummary(): HTMLElement | null {
    if (!this.summary) {
      return null
    }
    const { reservation, stage } = this.summary
    const texts = t().summary

    const buttons =
      stage === 'confirm'
        ? h(
            'div',
            { className: 'confirm-cancel' },
            texts.cancelQuestion,
            h('button', {
              type: 'button',
              className: 'danger',
              textContent: texts.yesCancel,
              disabled: this.busy,
              onclick: () => void this.cancelSummary(),
            }),
            h('button', {
              type: 'button',
              textContent: t().no,
              disabled: this.busy,
              onclick: () => this.setSummaryStage('card'),
            }),
          )
        : h(
            'div',
            { className: 'form-buttons' },
            h('button', {
              type: 'button',
              className: 'primary',
              textContent: texts.ok,
              disabled: this.busy,
              onclick: () => {
                this.summary = null
                this.summaryError = null
                this.render()
              },
            }),
            stage === 'card' && reservation.cancellable
              ? h('button', {
                  type: 'button',
                  textContent: t().cancel,
                  disabled: this.busy,
                  onclick: () => this.setSummaryStage('confirm'),
                })
              : null,
          )

    return h(
      'section',
      { className: 'summary', ariaLabel: texts.title },
      h('strong', { textContent: texts.title }),
      h('span', { textContent: reservation.resourceName }),
      h('span', { textContent: formatSlot(reservation) }),
      h('span', {
        className: `status ${reservation.status.toLowerCase()}`,
        textContent: texts.status[reservation.status],
      }),
      h(
        'span',
        { className: 'small' },
        h('span', { className: 'muted', textContent: `${texts.code} ` }),
        h('bdi', { className: 'code', textContent: reservation.code }),
      ),
      stage === 'cancelled' ? h('p', { className: 'info', role: 'status', textContent: texts.cancelled }) : null,
      this.summaryError ? h('p', { className: 'field-error', role: 'alert', textContent: this.summaryError }) : null,
      buttons,
    )
  }

  /** The booking the assistant prepared: Confirm books it, Edit opens the panel on it. */
  private renderDraft(): HTMLElement | null {
    const draft = this.bookingDraft
    if (!draft) {
      return null
    }
    const date = draft.startAt.slice(0, 10)

    return h(
      'section',
      { className: 'summary draft', ariaLabel: t().draftTitle },
      h('strong', { textContent: t().draftTitle }),
      h('span', { textContent: draft.resourceName }),
      h('span', { textContent: formatSlot(draft) }),
      h('span', { className: 'muted small', textContent: t().requestNote }),
      h(
        'div',
        { className: 'form-buttons' },
        h('button', {
          type: 'button',
          className: 'primary',
          textContent: t().confirm,
          disabled: this.busy,
          onclick: () => void this.reserve(draft.resourceId, draft.startAt),
        }),
        h('button', {
          type: 'button',
          textContent: t().edit,
          disabled: this.busy,
          onclick: () => this.openBooking({ resourceId: draft.resourceId, date }, { startAt: draft.startAt }),
        }),
      ),
    )
  }

  private fieldError(place: ErrorPlace): HTMLElement | null {
    const text = this.fieldErrors[place]
    return text ? h('p', { className: 'field-error', role: 'alert', textContent: text }) : null
  }

  private renderMessageForm() {
    const input = h('textarea', {
      name: 'message',
      rows: 2,
      placeholder: t().messagePlaceholder,
      required: true,
      value: this.draft,
      disabled: this.busy,
      oninput: () => {
        this.draft = input.value
      },
      onkeydown: (event: KeyboardEvent) => {
        // Enter sends, Shift+Enter adds a line.
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          form.requestSubmit()
        }
      },
    })

    const form = h(
      'form',
      {
        className: 'message-form',
        onsubmit: (event: SubmitEvent) => {
          event.preventDefault()
          const text = input.value.trim()
          if (text) {
            void this.sendMessage(text)
          }
        },
      },
      input,
      h('button', { type: 'submit', className: 'primary', textContent: t().send, disabled: this.busy }),
    )

    // Anonymous visitors can identify themselves at any time, e.g. to book; the
    // form also opens by itself when the backend asks for it (contactRequired).
    // Hidden before the first reply, since there is no conversation yet.
    const canVerify = this.chat.conversationId !== null && !this.chat.verified && this.chat.step === 'chat'

    return h(
      'div',
      {},
      form,
      canVerify
        ? h('button', {
            type: 'button',
            className: 'link verify-link',
            textContent: t().verifyMyDetails,
            disabled: this.busy,
            onclick: () => this.goToStep('contact'),
          })
        : null,
    )
  }

  private renderContactForm() {
    const contact = this.chat.contact
    const locked = this.chat.contactLocked
    const field = (name: keyof ContactDetails, label: string, type: string, autocomplete: AutoFill) =>
      h(
        'label',
        {},
        label,
        h('input', {
          name,
          type,
          autocomplete,
          required: true,
          value: contact[name],
          readOnly: locked,
          ariaInvalid: this.fieldErrors[name] ? 'true' : 'false',
          disabled: this.busy,
          oninput: (event: Event) => {
            contact[name] = (event.target as HTMLInputElement).value
          },
        }),
        this.fieldError(name),
      )

    const disabled = this.busy || this.blocked()
    // Pre-filled by the assistant: Confirm as shown, or Edit (then Send).
    const buttons = locked
      ? h(
          'div',
          { className: 'form-buttons' },
          h('button', { type: 'submit', className: 'primary', textContent: t().confirm, disabled }),
          h('button', {
            type: 'button',
            textContent: t().edit,
            disabled: this.busy,
            onclick: () => {
              this.chat.contactLocked = false
              this.commit()
            },
          }),
        )
      : h('button', { type: 'submit', className: 'primary', textContent: t().send, disabled })

    return h(
      'form',
      {
        className: 'stacked-form',
        onsubmit: (event: SubmitEvent) => {
          event.preventDefault()
          const data = new FormData(event.target as HTMLFormElement)
          const value = (name: keyof ContactDetails) => String(data.get(name) ?? '').trim()
          void this.submitContact({
            firstName: value('firstName'),
            lastName: value('lastName'),
            email: value('email'),
            phone: value('phone'),
          })
        },
      },
      h('p', {
        className: 'intro',
        textContent: locked ? t().contactCheckIntro : t().contactIntro,
      }),
      field('firstName', t().firstName, 'text', 'given-name'),
      field('lastName', t().lastName, 'text', 'family-name'),
      field('email', t().email, 'email', 'email'),
      field('phone', t().phone, 'tel', 'tel'),
      // "Your details have changed. Please confirm them."
      this.info ? h('p', { className: 'info', role: 'status', textContent: this.info }) : null,
      this.fieldError('form'),
      buttons,
      // After the message limit, sending again just brings the form back.
      h('button', {
        type: 'button',
        className: 'link',
        textContent: t().backToChatLink,
        disabled: this.busy,
        onclick: () => this.goToStep('chat'),
      }),
    )
  }

  private renderVerifyForm() {
    const channel = this.chat.verificationRequired[0]
    const { email, phone } = this.chat.contact
    // Masked by the backend; our own mask for an older one.
    const sentTo = this.chat.codeSentTo
      ? isolate(this.chat.codeSentTo)
      : channel === 'EMAIL'
        ? maskEmail(email)
        : maskPhone(phone)

    return h(
      'form',
      {
        className: 'stacked-form',
        onsubmit: (event: SubmitEvent) => {
          event.preventDefault()
          const data = new FormData(event.target as HTMLFormElement)
          const code = String(data.get('code') ?? '').trim()
          if (code) {
            void this.submitCode(code)
          }
        },
      },
      h('p', {
        className: 'intro',
        textContent: channel === 'EMAIL' ? t().codeSentToEmail(sentTo) : t().codeSentBySms(sentTo),
      }),
      h(
        'label',
        {},
        t().code,
        h('input', {
          name: 'code',
          value: this.codeDraft,
          oninput: (event: Event) => {
            this.codeDraft = (event.target as HTMLInputElement).value
          },
          inputMode: 'numeric',
          autocomplete: 'one-time-code',
          maxLength: 12,
          required: true,
          ariaInvalid: this.fieldErrors.code ? 'true' : 'false',
          disabled: this.busy,
        }),
        this.fieldError('code'),
      ),
      this.info ? h('p', { className: 'info', role: 'status', textContent: this.info }) : null,
      h('button', {
        type: 'submit',
        className: 'primary',
        textContent: t().confirm,
        disabled: this.busy || this.blocked(),
      }),
      // Updated every second by tick().
      h('button', {
        type: 'button',
        className: 'link resend',
        ...this.resendButton(),
        onclick: () => void this.resendCode(),
      }),
      h('button', {
        type: 'button',
        className: 'link',
        textContent: t().changeMyDetails,
        disabled: this.busy,
        // Submitting the details again starts over with a new email code.
        onclick: () => this.goToStep('contact'),
      }),
    )
  }

  private renderBooking(): HTMLElement {
    return h('div', { className: 'booking' }, this.renderNewBooking())
  }

  private renderNewBooking(): HTMLElement {
    const { resources, resourceId, month, availableDays, lastBookableDay, date, slots, slot } = this.booking

    if (resources === null) {
      return h('p', { className: 'muted', textContent: this.busy ? t().loading : '' })
    }
    if (resources.length === 0) {
      return h('p', { className: 'muted', textContent: t().nothingBookable })
    }

    const resourceSelect = h(
      'label',
      {},
      t().whatToBook,
      h(
        'select',
        {
          disabled: this.busy,
          onchange: (event: Event) => {
            const value = (event.target as HTMLSelectElement).value
            this.selectResource(value ? Number(value) : null)
          },
        },
        h('option', { value: '', textContent: t().choose, selected: resourceId === null, disabled: true }),
        ...resources.map((resource) =>
          h('option', {
            value: String(resource.id),
            textContent: resource.name,
            selected: resource.id === resourceId,
          }),
        ),
      ),
    )

    if (resourceId === null) {
      return h('div', { className: 'booking-body' }, resourceSelect)
    }

    const calendar = h(
      'div',
      { className: 'calendar' },
      h(
        'div',
        { className: 'calendar-header' },
        h('button', {
          type: 'button',
          ariaLabel: t().previousMonth,
          textContent: '‹',
          disabled: this.busy || month <= currentMonth(),
          onclick: () => this.changeMonth(-1),
        }),
        h('span', { textContent: formatMonth(month) }),
        h('button', {
          type: 'button',
          ariaLabel: t().nextMonth,
          textContent: '›',
          disabled: this.busy || month >= lastBookableMonth(lastBookableDay),
          onclick: () => this.changeMonth(1),
        }),
      ),
      h(
        'div',
        { className: 'calendar-grid' },
        ...weekdayInitials().map((initial) => h('span', { className: 'weekday', textContent: initial })),
        ...calendarCells(month).map((day) =>
          day === null
            ? h('span', {})
            : h('button', {
                type: 'button',
                className: `day${day === date ? ' selected' : ''}`,
                textContent: formatDayNumber(day),
                ariaLabel: formatDay(day),
                disabled: this.busy || !availableDays?.includes(day),
                onclick: () => this.selectDay(day),
              }),
        ),
      ),
      availableDays?.length === 0
        ? h('p', { className: 'muted small', textContent: t().noFreeDays })
        : null,
    )

    const slotList =
      date === null || slots === null
        ? null
        : slots.length === 0
          ? h('p', { className: 'muted small', textContent: t().noFreeTimes(formatDay(date)) })
          : h(
              'div',
              { className: 'slots' },
              ...slots.map((candidate) =>
                h('button', {
                  type: 'button',
                  className: `slot${candidate.startAt === slot?.startAt ? ' selected' : ''}`,
                  textContent: formatTime(candidate.startAt),
                  disabled: this.busy,
                  onclick: () => this.selectSlot(candidate),
                }),
              ),
            )

    const resourceName = resources.find((resource) => resource.id === resourceId)?.name ?? ''
    const summary = slot
      ? h(
          'div',
          { className: 'booking-summary' },
          h('strong', { textContent: `${resourceName}, ${formatSlot(slot)}` }),
          h('p', {
            className: 'muted small',
            textContent: t().requestNote,
          }),
          h('button', {
            type: 'button',
            className: 'primary',
            textContent: this.chat.verified ? t().requestThisTime : t().verifyToBook,
            disabled: this.busy,
            onclick: () => void this.book(),
          }),
        )
      : null

    return h('div', { className: 'booking-body' }, resourceSelect, calendar, slotList, summary)
  }

}

export const hostId = 'samatrica-chat-widget'
