import {
  ApiError,
  type Api,
  type BookingForm,
  type ChatReply,
  type ContactDetails,
  type ConversationMode,
  type LiveEventData,
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
import { h } from './dom'
import { direction, language, t } from './i18n'
import { LiveStream } from './live'
import { type ChatMessage, emptyChat, loadChat, saveChat, type StoredChat } from './storage'
import styles from './widget.css?inline'

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
  private contact: ContactDetails = { firstName: '', lastName: '', email: '', phone: '' }
  private codeDraft = ''
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

      this.chat.conversationId = reply.conversationId
      this.chat.accessToken = reply.accessToken
      this.draft = ''

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
      // On the limit, our own text in the visitor's language instead of the
      // backend's English one. (A null reply otherwise: an employee will answer.)
      if (limitReached && reply.contactRequired) {
        this.addAssistantMessage(t().contactLimit)
      } else {
        this.addAssistantMessage(reply.assistantMessage, reply.assistantMessageId)
      }

      // The assistant asks the visitor to "fill in the form shown in the chat
      // window": open it. (An older backend without the flag: on the limit only.)
      const contactRequired = (reply.contactRequired ?? reply.messageId === null) && !this.chat.verified
      if (contactRequired) {
        this.chat.step = 'contact'
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
    // Once, even if both the closed event and a refused request say so.
    const messages = this.chat.messages
    const alreadyEnded = this.chat.conversationId === null && messages.at(-1)?.text === t().chatEnded
    this.chat = {
      ...emptyChat(),
      messages: alreadyEnded ? messages : [...messages, { from: 'notice', text: t().chatEnded }],
    }
    this.view = 'chat'
    this.booking = emptyBooking()
    this.contact = { firstName: '', lastName: '', email: '', phone: '' }
    this.codeDraft = ''
  }

  private submitContact(details: ContactDetails) {
    this.contact = details
    return this.run(async () => {
      const reply = await this.api.contact(...this.session(), details)
      this.chat.verificationRequired = reply.verificationRequired
      this.chat.step = reply.verificationRequired.length > 0 ? 'verify' : 'chat'
    })
  }

  private async submitCode(code: string) {
    const channel = this.chat.verificationRequired[0]
    let bookingForm: BookingForm | null = null

    await this.run(async () => {
      const reply = await this.api.verify(...this.session(), channel, code)
      this.chat.verificationRequired = reply.verificationRequired
      this.codeDraft = ''

      if (reply.verificationRequired.length === 0) {
        // The old token is revoked: from now on only the new one works.
        this.chat.accessToken = reply.accessToken ?? this.chat.accessToken
        this.chat.verified = true
        this.chat.step = 'chat'
        this.addAssistantMessage(reply.assistantMessage, reply.assistantMessageId)
        // Usually the assistant reopens the panel for the booking in progress.
        bookingForm = reply.bookingForm ?? this.chat.pendingBooking
        this.chat.pendingBooking = null
      }
    })

    if (bookingForm) {
      this.openBooking(bookingForm)
    }
  }

  // Booking panel

  /** Opens the panel, pre-selecting the resource and day when given. */
  private openBooking(form?: BookingForm) {
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
    })
  }

  private async loadDaysAndSlots() {
    const { resourceId, month, date } = this.booking
    if (resourceId === null) {
      return
    }
    const days = await this.api.availableDays(...this.session(), resourceId, month)
    this.booking.availableDays = days.days
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

  private book() {
    const { resourceId, slot, date } = this.booking
    if (resourceId === null || slot === null) {
      return
    }

    if (!this.chat.verified) {
      this.askToVerify({ resourceId, date })
      return
    }

    return this.run(async () => {
      try {
        const reservation = await this.api.book(...this.session(), resourceId, slot.startAt)
        this.chat.messages.push({
          from: 'event',
          text: t().requestSent(describeReservation(reservation)),
        })
        // The assistant's reply about the booking, in the customer's language
        // (already saved in the conversation); our own text if the AI failed.
        const reply = reservation.assistantMessage?.trim()
        if (reply) {
          this.addAssistantMessage(reply, reservation.assistantMessageId)
        } else {
          this.addAssistantMessage(t().afterBookingFallback)
        }
        this.booking = { ...emptyBooking(), resources: this.booking.resources }
        this.view = 'chat'
      } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
          // Most likely the slot was taken meanwhile: show the day's slots again.
          this.booking.slot = null
          await this.loadDaysAndSlots().catch(() => undefined)
        }
        throw error
      }
    })
  }

  private showReservations() {
    this.booking.tab = 'mine'
    this.error = null
    if (!this.chat.verified) {
      this.render()
      return
    }
    void this.run(async () => {
      this.booking.reservations = await this.api.reservations(...this.session())
    })
  }

  private cancelReservation(reservationId: number) {
    return this.run(async () => {
      const cancelled = await this.api.cancel(...this.session(), reservationId)
      this.booking.cancelling = null
      // The tab only lists upcoming reservations that can still be cancelled.
      this.booking.reservations =
        this.booking.reservations?.filter((reservation) => reservation.id !== cancelled.id) ?? null
      this.chat.messages.push({ from: 'event', text: t().cancelled(describeReservation(cancelled)) })
    })
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
    this.render()

    try {
      await request()
    } catch (error) {
      this.handleError(error)
    } finally {
      this.busy = false
      this.commit()
    }
  }

  private handleError(error: unknown) {
    if (error instanceof ApiError && error.sessionExpired) {
      this.endChat()
      return
    }

    // Booking or listing reservations while anonymous.
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

  private goToStep(step: 'chat' | 'contact') {
    this.chat.step = step
    this.error = null
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
      this.busy && this.chat.step === 'chat'
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
      h('div', { className: 'footer' }, errorLine, this.renderStep()),
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
      panel.querySelector<HTMLElement>('.footer input, .footer textarea')?.focus()
    }
  }

  private renderStep(): HTMLElement {
    switch (this.chat.step) {
      case 'contact':
        return this.renderContactForm()
      case 'verify':
        return this.renderVerifyForm()
      default:
        return this.renderMessageForm()
    }
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
    const canVerify = this.chat.conversationId !== null && !this.chat.verified

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
          value: this.contact[name],
          disabled: this.busy,
          oninput: (event: Event) => {
            this.contact[name] = (event.target as HTMLInputElement).value
          },
        }),
      )

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
        textContent: t().contactIntro,
      }),
      field('firstName', t().firstName, 'text', 'given-name'),
      field('lastName', t().lastName, 'text', 'family-name'),
      field('email', t().email, 'email', 'email'),
      field('phone', t().phone, 'tel', 'tel'),
      h('button', { type: 'submit', className: 'primary', textContent: t().continue, disabled: this.busy }),
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
    const sentTo = channel === 'EMAIL' ? this.contact.email : this.contact.phone

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
        textContent: `${t().verifyIntro(channel)}${sentTo ? ` (${sentTo})` : ''}.`,
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
          disabled: this.busy,
        }),
      ),
      h('button', { type: 'submit', className: 'primary', textContent: t().confirm, disabled: this.busy }),
      h('button', {
        type: 'button',
        className: 'link',
        textContent: t().changeMyDetails,
        disabled: this.busy,
        // Submitting the details again sends new codes.
        onclick: () => this.goToStep('contact'),
      }),
    )
  }

  private renderBooking(): HTMLElement {
    const tab = (id: BookingState['tab'], label: string, onclick: () => void) =>
      h('button', {
        type: 'button',
        className: `tab${this.booking.tab === id ? ' selected' : ''}`,
        textContent: label,
        disabled: this.busy,
        onclick,
      })

    return h(
      'div',
      { className: 'booking' },
      h(
        'div',
        { className: 'tabs', role: 'tablist' },
        tab('book', t().newBooking, () => {
          this.booking.tab = 'book'
          this.error = null
          this.render()
        }),
        tab('mine', t().myReservations, () => this.showReservations()),
      ),
      this.booking.tab === 'book' ? this.renderNewBooking() : this.renderMyReservations(),
    )
  }

  private renderNewBooking(): HTMLElement {
    const { resources, resourceId, month, availableDays, date, slots, slot } = this.booking

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
          disabled: this.busy || month >= lastBookableMonth(),
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

  private renderMyReservations(): HTMLElement {
    if (!this.chat.verified) {
      return h(
        'div',
        { className: 'booking-body' },
        h('p', { textContent: t().verifyToSeeReservations }),
        h('button', {
          type: 'button',
          className: 'primary',
          textContent: t().verifyMyDetails,
          onclick: () => this.askToVerify({ resourceId: null, date: null }),
        }),
      )
    }

    const { reservations, cancelling } = this.booking
    if (reservations === null) {
      return h('p', { className: 'muted', textContent: this.busy ? t().loading : '' })
    }
    if (reservations.length === 0) {
      return h('p', { className: 'muted', textContent: t().noUpcoming })
    }

    return h(
      'ul',
      { className: 'reservations' },
      ...reservations.map((reservation) =>
        h(
          'li',
          {},
          h('span', { textContent: describeReservation(reservation) }),
          h('span', {
            className: `status ${reservation.status.toLowerCase()}`,
            textContent: t().status[reservation.status],
          }),
          !reservation.cancellable
            ? null
            : cancelling === reservation.id
              ? h(
                  'div',
                  { className: 'confirm-cancel' },
                  t().cancelQuestion,
                  h('button', {
                    type: 'button',
                    className: 'danger',
                    textContent: t().yesCancel,
                    disabled: this.busy,
                    onclick: () => void this.cancelReservation(reservation.id),
                  }),
                  h('button', {
                    type: 'button',
                    textContent: t().no,
                    disabled: this.busy,
                    onclick: () => {
                      this.booking.cancelling = null
                      this.render()
                    },
                  }),
                )
              : h('button', {
                  type: 'button',
                  className: 'link',
                  textContent: t().cancel,
                  disabled: this.busy,
                  onclick: () => {
                    this.booking.cancelling = reservation.id
                    this.error = null
                    this.render()
                  },
                }),
        ),
      ),
    )
  }
}

export const hostId = 'samatrica-chat-widget'
