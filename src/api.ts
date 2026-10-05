import type { WidgetConfig } from './config'

// The public widget API (no login): /api/public/widgets/{publicKey}/chat/**.
// Dates and times are wall-clock in the business's time zone, without offset.

export type Channel = 'EMAIL' | 'PHONE'

/** The assistant asks to open the booking panel, pre-selecting what it knows. */
export interface BookingForm {
  resourceId: number | null
  /** "2026-10-02" */
  date: string | null
}

/** Who answers the visitor: the assistant, or an employee (requested or joined). */
export type ConversationMode = 'ASSISTANT' | 'WAITING_FOR_EMPLOYEE' | 'WITH_EMPLOYEE'

/** A message on the live stream. USER = an employee (never identified). SYSTEM ones aren't sent. */
export interface LiveMessage {
  id: number
  senderType: 'CUSTOMER' | 'ASSISTANT' | 'USER'
  content: string
  createdAt: string
}

/**
 * The data of a live stream event ("message", "mode" or "closed"). CLOSED: the
 * conversation was closed after 10 minutes without any message; its tokens are
 * revoked and the server ends the stream.
 */
export interface LiveEventData {
  type: 'MESSAGE' | 'MODE' | 'CLOSED'
  message: LiveMessage | null
  mode: ConversationMode | null
}

export interface ChatReply {
  conversationId: number
  accessToken: string
  /** Null when the anonymous message limit is reached: the message was not stored. */
  messageId: number | null
  assistantMessage: string | null
  /**
   * Open the contact form now: the limit is reached, or the assistant needs the
   * visitor identified (e.g. to book). The reply is shown either way.
   * @deprecated True whenever contactForm is set; to be removed.
   */
  contactRequired: boolean
  /**
   * Open the contact form pre-filled with what the assistant collected in the
   * chat (null: not known yet). Absent from an older backend.
   */
  contactForm?: ContactForm | null
  bookingForm: BookingForm | null
  /**
   * While not ASSISTANT, the AI doesn't answer: assistantMessage is null but
   * messageId is set (the message was stored; an employee will answer).
   */
  mode?: ConversationMode
  /** The stored messages of this exchange (the live stream repeats them). Null: none. */
  customerMessageId?: number | null
  assistantMessageId?: number | null
  /**
   * The backend closed the conversation with this reply (no employee can
   * answer): its token is revoked, the next message starts a new one.
   */
  closed?: boolean
  /** Show this booking's summary card (found by its code). */
  reservation?: ReservationSummary | null
}

/** One of the customer's bookings, found by the code in their emails. */
export interface ReservationSummary {
  /** "K7QM-2X9P" */
  code: string
  resourceName: string
  startAt: string
  endAt: string
  status: ReservationStatus
  cancellable: boolean
}

export interface ContactDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type ContactForm = { [K in keyof ContactDetails]: string | null }

export interface ContactReply {
  conversationId: number
  /** ["EMAIL"]: only the email code is sent at this point. */
  verificationRequired: Channel[]
  /** Where the code just went, masked ("j***@example.com"). Absent from an older backend. */
  codeSentTo?: string | null
}

export interface VerifyReply {
  conversationId: number
  /** ["PHONE"] once the email code is right: only then is the SMS sent. */
  verificationRequired: Channel[]
  /** Set when a code was just sent ("+971 ••• ••67"), null otherwise. */
  codeSentTo?: string | null
  /** The reply after verification closed the conversation (see ChatReply.closed). */
  closed?: boolean
  reservation?: ReservationSummary | null
  /** Only once verificationRequired is empty: a NEW token, the old one is revoked. */
  accessToken: string | null
  messageId: number | null
  assistantMessage: string | null
  bookingForm: BookingForm | null
  assistantMessageId?: number | null
}

/** A resource that can be booked (it has opening hours). */
export interface BookableResource {
  id: number
  name: string
  type: string
  slotMinutes: number
}

export interface AvailableDays {
  resourceId: number
  /** "2026-10" */
  month: string
  /** Days with at least one free slot, e.g. "2026-10-02". */
  days: string[]
}

export interface Slot {
  startAt: string
  endAt: string
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

/** The booking response: the new reservation's summary, plus the assistant's reply about it. */
export interface BookingReply extends ReservationSummary {
  /** In the customer's language, already saved in the conversation; null if the AI failed. */
  assistantMessage: string | null
  assistantMessageId?: number | null
}

export class ApiError extends Error {
  readonly status: number
  /** From the Retry-After header of a 429. */
  readonly retryAfterSeconds: number | null

  constructor(status: number, message: string, retryAfterSeconds: number | null) {
    super(message)
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }

  /** The stored conversation can't be used any more: start a new chat. */
  get sessionExpired(): boolean {
    return (
      this.status === 401 ||
      (this.status === 400 && this.message === 'Invalid conversation access token')
    )
  }
}

export type Api = ReturnType<typeof createApi>

export function createApi({ widgetKey, apiUrl }: WidgetConfig) {
  const base = `${apiUrl}/api/public/widgets/${encodeURIComponent(widgetKey)}/chat`

  async function request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    accessToken?: string,
  ): Promise<T> {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { 'X-Conversation-Access-Token': accessToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (!response.ok) {
      const retryAfter = Number(response.headers.get('Retry-After'))
      throw new ApiError(
        response.status,
        await errorMessage(response),
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  }

  const post = <T>(path: string, body: unknown, accessToken?: string) =>
    request<T>('POST', path, body, accessToken)
  const get = <T>(path: string, accessToken: string) =>
    request<T>('GET', path, undefined, accessToken)

  return {
    /** The live stream of the conversation (Server-Sent Events): see live.ts. */
    eventsUrl: (conversationId: number) => `${base}/${conversationId}/events`,

    start: (message: string) => post<ChatReply>('', { message }),

    send: (conversationId: number, accessToken: string, message: string) =>
      post<ChatReply>(`/${conversationId}`, { message }, accessToken),

    contact: (conversationId: number, accessToken: string, details: ContactDetails) =>
      post<ContactReply>(`/${conversationId}/contact`, details, accessToken),

    verify: (conversationId: number, accessToken: string, channel: Channel, code: string) =>
      post<VerifyReply>(`/${conversationId}/verify`, { channel, code }, accessToken),

    /** A new code on the same channel (204). */
    resend: (conversationId: number, accessToken: string, channel: Channel) =>
      post<void>(`/${conversationId}/verify/resend`, { channel }, accessToken),

    // Booking panel. Browsing works while anonymous; booking answers 403 until
    // the visitor is verified. Existing bookings are only reached by their code.

    resources: (conversationId: number, accessToken: string) =>
      get<BookableResource[]>(`/${conversationId}/resources`, accessToken),

    availableDays: (conversationId: number, accessToken: string, resourceId: number, month: string) =>
      get<AvailableDays>(
        `/${conversationId}/resources/${resourceId}/available-days?month=${month}`,
        accessToken,
      ),

    slots: (conversationId: number, accessToken: string, resourceId: number, date: string) =>
      get<Slot[]>(`/${conversationId}/resources/${resourceId}/slots?date=${date}`, accessToken),

    book: (conversationId: number, accessToken: string, resourceId: number, startAt: string) =>
      post<BookingReply>(`/${conversationId}/reservations`, { resourceId, startAt }, accessToken),

    /** The reservation of the summary card: the same summary back, CANCELLED. */
    cancelByCode: (conversationId: number, accessToken: string, code: string) =>
      request<ReservationSummary>(
        'POST',
        `/${conversationId}/reservations/code/${encodeURIComponent(code)}/cancel`,
        undefined,
        accessToken,
      ),
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    return body.message ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
