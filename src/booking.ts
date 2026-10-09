import type { BookableResource, ReservationSummary, Service, Slot, StayOptions } from './api'
import { direction, locale, t } from './i18n'

// Calendar and formatting helpers for the booking panel. Dates are wall-clock
// strings of the business ("2026-10-02", "2026-10-02T09:00:00"): they are
// handled as UTC so that the visitor's own time zone never shifts them.

/**
 * What is booked: a service (serviceId set; resourceId is then the chosen
 * performer, null: anyone), or a stay (serviceId null, resourceId the resource).
 */
export interface BookingState {
  services: Service[] | null
  /** The resources booked by the night. */
  resources: BookableResource[] | null
  serviceId: number | null
  resourceId: number | null
  /** "2026-10" */
  month: string
  /** For the choice and month; null while loading. */
  availableDays: string[] | null
  /** The end of the business's booking window, from the backend; null until days were loaded. */
  lastBookableDay: string | null
  /** The chosen day; the check-in day for a resource booked by the night. */
  date: string | null
  /** A service's free starts on `date`. */
  slots: Slot[] | null
  slot: Slot | null
  /** Booked by the night: the stays that can start on `date`; null until loaded. */
  stayOptions: StayOptions | null
  checkOutDay: string | null
}

export function emptyBooking(): BookingState {
  return {
    services: null,
    resources: null,
    serviceId: null,
    resourceId: null,
    month: currentMonth(),
    availableDays: null,
    lastBookableDay: null,
    date: null,
    slots: null,
    slot: null,
    stayOptions: null,
    checkOutDay: null,
  }
}

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

/**
 * The last month the calendar can show: the one of the backend's last bookable
 * day (each business has its own booking window). The current month until it is known.
 */
export function lastBookableMonth(lastBookableDay: string | null): string {
  return lastBookableDay ? monthOf(lastBookableDay) : currentMonth()
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

/** The nights between two days ("2026-01-05", "2026-01-08" → 3); date-times work too. */
export function nightsBetween(start: string, end: string): number {
  return Math.round((utc(end.slice(0, 10)).getTime() - utc(start.slice(0, 10)).getTime()) / 86_400_000)
}

/** A stay's check-in or check-out as a date-time: "2026-01-05", "14:00:00" → "2026-01-05T14:00:00". */
export const dayAt = (day: string, time: string) => `${day}T${time.length === 5 ? `${time}:00` : time}`

/**
 * "Fri, 2 Oct 09:00–09:30"; a stay shows both days and its nights:
 * "Mon, 5 Jan 14:00 → Thu, 8 Jan 11:00 (3 nights)". The backend says which it
 * is: `nights` is the stay's nights, null (or absent) for a time slot, even one
 * that ends at midnight on the next day.
 */
export function formatSlot(slot: Slot, nights?: number | null): string {
  const start = `${formatDay(slot.startAt.slice(0, 10))} ${formatTime(slot.startAt)}`
  if (nights == null) {
    return `${start}–${formatTime(slot.endAt)}`
  }
  // The arrow follows the reading direction.
  const arrow = direction() === 'rtl' ? '←' : '→'
  return `${start} ${arrow} ${formatDay(slot.endAt.slice(0, 10))} ${formatTime(slot.endAt)} (${t().nights(nights)})`
}

/**
 * An amount with 2 decimals and the currency code after it: "350.00 AED".
 * Latin digits and no thousands separator in every language.
 */
export const formatAmount = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`

/** The quoted total of a reservation, or null without a price. */
export function reservationPrice(reservation: ReservationSummary): string | null {
  return reservation.price != null && reservation.currency ? formatAmount(reservation.price, reservation.currency) : null
}

/**
 * A resource in the choice: "Dr Lina - Dermatology - 350.00 AED",
 * "Palm villa - 799.50 AED / night"; without a price, nothing about it.
 */
export function describeResource(resource: BookableResource): string {
  const parts = [resource.name]
  if (resource.specialty) {
    parts.push(t().specialties[resource.specialty])
  }
  if (resource.price != null && resource.currency) {
    const amount = formatAmount(resource.price, resource.currency)
    parts.push(resource.bookingMode === 'NIGHTS' ? `${amount} ${t().perNight}` : amount)
  }
  return parts.join(' - ')
}

/** A service in the choice: "Colour - 1 h 30 min - 120.00 AED"; without a price, nothing about it. */
export function describeService(service: Service): string {
  const parts = [service.name, t().duration(service.durationMinutes)]
  if (service.price != null && service.currency) {
    parts.push(formatAmount(service.price, service.currency))
  }
  return parts.join(' - ')
}

/** "Colour with Anna", or the stay's resource ("Palm villa") without a service. */
export function reservationTitle(reservation: Pick<ReservationSummary, 'resourceName' | 'serviceName'>): string {
  return reservation.serviceName
    ? t().serviceWith(reservation.serviceName, reservation.resourceName)
    : reservation.resourceName
}

/**
 * "Colour with Anna, Fri, 2 Oct 09:00–10:30", or a stay with both days and its
 * nights; with the quoted total after it: "... (3 nights) - 2398.50 AED".
 */
export function describeReservation(reservation: ReservationSummary): string {
  const price = reservationPrice(reservation)
  const slot = `${reservationTitle(reservation)}${t().separator}${formatSlot(reservation, reservation.nights)}`
  return price ? `${slot} - ${price}` : slot
}
