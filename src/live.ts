// A Server-Sent Events stream read with fetch: EventSource can't send the
// X-Conversation-Access-Token header. Reconnects with a growing delay when
// the connection drops, until stopped.

export interface LiveEvent {
  event: string
  data: string
}

export class LiveStreamError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface LiveStreamOptions {
  url: string
  headers: Record<string, string>
  onEvent: (event: LiveEvent) => void
  /** An HTTP error: return false to stop for good (e.g. the token is no longer valid). */
  onError: (error: LiveStreamError) => boolean
  /** false after a drop or failed attempt, true once (re)connected. */
  onConnectionChange?: (connected: boolean) => void
}

const retryDelays = [1, 2, 5, 10, 30]

export class LiveStream {
  private readonly options: LiveStreamOptions
  private readonly abort = new AbortController()
  private failures = 0

  constructor(options: LiveStreamOptions) {
    this.options = options
    void this.loop()
  }

  stop() {
    this.abort.abort()
  }

  private async loop() {
    while (!this.abort.signal.aborted) {
      try {
        await this.connect()
        this.options.onConnectionChange?.(false)
      } catch (error) {
        this.options.onConnectionChange?.(false)
        if (this.abort.signal.aborted) {
          return
        }
        if (error instanceof LiveStreamError) {
          if (!this.options.onError(error)) {
            return
          }
          // Too many live connections, or the chat is unavailable: wait longer.
          this.failures = Math.max(this.failures, retryDelays.length - 1)
        }
      }
      const delay = retryDelays[Math.min(this.failures, retryDelays.length - 1)]
      this.failures++
      await new Promise((resolve) => setTimeout(resolve, delay * 1000))
    }
  }

  private async connect() {
    const response = await fetch(this.options.url, {
      headers: { Accept: 'text/event-stream', ...this.options.headers },
      signal: this.abort.signal,
    })

    if (!response.ok || !response.body) {
      throw new LiveStreamError(response.status, await errorMessage(response))
    }

    this.failures = 0
    this.options.onConnectionChange?.(true)
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''

    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        return
      }
      buffer += value.replaceAll('\r\n', '\n')

      // Events are separated by a blank line.
      let end: number
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        const event = parseEvent(block)
        if (event) {
          this.options.onEvent(event)
        }
      }
    }
  }
}

/** One SSE block: "event:" and "data:" lines; ":" lines are keep-alive comments. */
function parseEvent(block: string): LiveEvent | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) {
      continue
    }
    const colon = line.indexOf(':')
    const field = colon < 0 ? line : line.slice(0, colon)
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
    if (field === 'event') {
      event = value
    } else if (field === 'data') {
      data.push(value)
    }
  }
  return data.length > 0 ? { event, data: data.join('\n') } : null
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    return body.message ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
