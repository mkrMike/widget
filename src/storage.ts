import type { BookingForm, Channel, ConversationMode } from './api'

export type Step = 'chat' | 'contact' | 'verify'

export interface ChatMessage {
  /** event: a booking or cancellation made in the booking panel. employee: a person of the business. */
  from: 'visitor' | 'assistant' | 'employee' | 'notice' | 'event'
  text: string
  /** A visitor message the backend refused (anonymous limit reached). */
  notSent?: boolean
  /** The server's id, once known (from the live stream). */
  id?: number
  /** Arrived on the live stream before the response that also contains it. */
  streamed?: boolean
  /** When it was added (ms), to match the stream with the responses. */
  at?: number
}

/**
 * Everything needed to continue the chat after a page reload. The backend
 * has no public endpoint to read the history back, so the messages are kept
 * here too.
 */
export interface StoredChat {
  conversationId: number | null
  accessToken: string | null
  step: Step
  /** Channels still to verify, in order. */
  verificationRequired: Channel[]
  /** The visitor is identified as a customer: the token was replaced by /verify. */
  verified: boolean
  /** The booking panel to open once the visitor is verified. */
  pendingBooking: BookingForm | null
  mode: ConversationMode
  messages: ChatMessage[]
}

export function emptyChat(): StoredChat {
  return {
    conversationId: null,
    accessToken: null,
    step: 'chat',
    verificationRequired: [],
    verified: false,
    pendingBooking: null,
    mode: 'ASSISTANT',
    messages: [],
  }
}

// One chat per widget key and browser tab. Storage can be blocked (privacy
// settings, sandboxed iframes): the chat then just doesn't survive a reload.

const storageKey = (widgetKey: string) => `samatrica-widget:${widgetKey}`

export function loadChat(widgetKey: string): StoredChat {
  try {
    const raw = sessionStorage.getItem(storageKey(widgetKey))
    return raw ? { ...emptyChat(), ...(JSON.parse(raw) as Partial<StoredChat>) } : emptyChat()
  } catch {
    return emptyChat()
  }
}

export function saveChat(widgetKey: string, chat: StoredChat): void {
  try {
    sessionStorage.setItem(storageKey(widgetKey), JSON.stringify(chat))
  } catch {
    // See above.
  }
}
