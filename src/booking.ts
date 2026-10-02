import type { BookableResource, Slot, VisitorReservation } from './api'
import { locale, t } from './i18n'

// Calendar and formatting helpers for the booking panel. Dates are wall-clock
// strings of the business ("2026-10-02", "2026-10-02T09:00:00"): they are
// handled as UTC so that the visitor's own time zone never shifts them.

export interface BookingState {
  tab: 'book' | 'mine'
  resources: BookableResource[] | null
  resourceId: number | null
  /** "2026-10" */
  month: string
  /** For resourceId and month; null while loading. */
  availableDays: string[] | null
  date: string | null
  slots: Slot[] | null
  slot: Slot | null
  reservations: VisitorReservation[] | null
  /** The reservation whose cancellation awaits confirmation. */
  cancelling: number | null
}

export function emptyBooking(): BookingState {
  return {
    tab: 'book',
    resources: null,
    resourceId: null,
    month: currentMonth(),
    availableDays: null,
    date: null,
    slots: null,
    slot: null,
    reservations: null,
    cancelling: null,
  }
}

/** Bookings are open from today to today + 29 days (the backend enforces it). */
const bookingWindowDays = 29

const utc = (date: string) => new Date(`${date}T00:00:00Z`)
const monthOfDate = (date: Date) => date.toISOString().slice(0, 7)

export const monthOf = (date: string) => date.slice(0, 7)

/** A local date's month, e.g. "2026-10" (not UTC's: it may still be yesterday there). */
const localMonth = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

/** The visitor's current month; close enough to the business's for navigation. */
export function currentMonth(): string {
  return localMonth(new Date())
}

export function lastBookableMonth(): string {
  const last = new Date()
  last.setDate(last.getDate() + bookingWindowDays)
  return localMonth(last)
}

export function addMonths(month: string, count: number): string {
  const date = utc(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + count)
  return monthOfDate(date)
}

/** The days of a month in weeks starting on Monday; null cells pad the first week. */
export function calendarCells(month: string): (string | null)[] {
  const first = utc(`${month}-01`)
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const cells: (string | null)[] = Array(mondayOffset).fill(null)
  for (const day = new Date(first); monthOfDate(day) === month; day.setUTCDate(day.getUTCDate() + 1)) {
    cells.push(day.toISOString().slice(0, 10))
  }
  return cells
}

// Formats in the widget's language (see i18n.ts), created once per locale.
const formats = new Map<string, Record<'month' | 'day' | 'dayNumber' | 'time' | 'weekday', Intl.DateTimeFormat>>()

function format(kind: 'month' | 'day' | 'dayNumber' | 'time' | 'weekday'): Intl.DateTimeFormat {
  const tag = locale()
  let set = formats.get(tag)
  if (!set) {
    const options = (extra: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { ...extra, timeZone: 'UTC' })
    set = {
      month: options({ month: 'long', year: 'numeric' }),
      day: options({ weekday: 'short', day: 'numeric', month: 'short' }),
      dayNumber: options({ day: 'numeric' }),
      time: options({ hour: 'numeric', minute: '2-digit' }),
      weekday: options({ weekday: 'narrow' }),
    }
    formats.set(tag, set)
  }
  return set[kind]
}

/** Monday to Sunday, e.g. "M T W T F S S" (2024-01-01 was a Monday). */
export const weekdayInitials = () =>
  Array.from({ length: 7 }, (_, i) => format('weekday').format(utc(`2024-01-0${i + 1}`)))

/** "2026-10" → "October 2026" */
export const formatMonth = (month: string) => format('month').format(utc(`${month}-01`))

/** "2026-10-02" → "Fri, 2 Oct" */
export const formatDay = (date: string) => format('day').format(utc(date))

/** "2026-10-02" → "2", in the language's digits. */
export const formatDayNumber = (date: string) => format('dayNumber').format(utc(date))

/** "2026-10-02T09:00:00" → "09:00" or "9:00 AM", as the language writes it. */
export const formatTime = (dateTime: string) => format('time').format(new Date(`${dateTime.slice(0, 19)}Z`))

/** "Fri, 2 Oct 09:00–09:30" */
export function formatSlot(slot: Slot): string {
  return `${formatDay(slot.startAt.slice(0, 10))} ${formatTime(slot.startAt)}–${formatTime(slot.endAt)}`
}

/** "Dr Lina, Fri, 2 Oct 09:00–09:30" */
export function describeReservation(reservation: VisitorReservation): string {
  return `${reservation.resourceName}${t().separator}${formatSlot(reservation)}`
}
