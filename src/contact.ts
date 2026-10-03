import type { ContactDetails } from './api'
import type { FormError } from './i18n'

// Where the codes were sent, and the backend's contact and verification errors.

/** Keeps an email address or phone number left to right inside Arabic text. */
export const isolate = (text: string) => `⁨${text}⁩`

// The backend sends the masked destination (codeSentTo); these are the
// fallback for an older backend without it.

/** "jane@example.com" → "j***@example.com" */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  return isolate(at < 1 ? email : `${email[0]}***${email.slice(at)}`)
}

/**
 * All but the last 2 digits: "+971 50 123 4567" → "+971 ••• ••67". The
 * country code is kept only when typed apart from the number.
 */
export function maskPhone(phone: string): string {
  const lastDigits = phone.replace(/\D/g, '').slice(-2)
  const countryCode = /^\s*(\+\d{1,3})[\s.-]/.exec(phone)?.[1]
  return isolate(`${countryCode ? `${countryCode} ` : ''}••• ••${lastDigits}`)
}

/** Where an error is shown: under a contact field, under the code, or above the buttons. */
export type ErrorPlace = keyof ContactDetails | 'code' | 'form'

/**
 * The details were changed in the chat after they were confirmed: the codes
 * are invalid, the visitor confirms again.
 */
export const detailsChangedError = 'No verification code expected'

/** The backend's 400 messages that have a translation, and their field. */
const knownErrors: Record<string, [FormError, ErrorPlace]> = {
  'Invalid phone number': ['invalidPhone', 'phone'],
  'Invalid verification code': ['invalidCode', 'code'],
  'Verification code has expired': ['codeExpired', 'code'],
  'Maximum verification attempts exceeded': ['tooManyAttempts', 'code'],
  'Too many verification codes requested': ['tooManyCodes', 'code'],
  'No active verification challenge': ['noActiveChallenge', 'code'],
  // From the collection in the chat, which the assistant handles: not
  // expected here, harmless to keep.
  'First name is required': ['firstNameRequired', 'firstName'],
  'Last name is required': ['lastNameRequired', 'lastName'],
  'Email is required': ['emailRequired', 'email'],
  'Phone is required': ['phoneRequired', 'phone'],
  'Invalid email address': ['invalidEmail', 'email'],
}

/** Bean validation on /contact: "<field>: <message>", e.g. "email: must not be blank". */
const fieldMessage = /^(firstName|lastName|email|phone): (.+)$/

const requiredError: Record<keyof ContactDetails, FormError> = {
  firstName: 'firstNameRequired',
  lastName: 'lastNameRequired',
  email: 'emailRequired',
  phone: 'phoneRequired',
}

/**
 * Where a 400 message goes, and its translation (null: shown as sent, under
 * its field). Undefined: not a contact or code error.
 */
export function knownError(message: string): [FormError | null, ErrorPlace, string] | undefined {
  if (Object.hasOwn(knownErrors, message)) {
    const [key, place] = knownErrors[message]
    return [key, place, message]
  }
  const match = fieldMessage.exec(message)
  if (!match) {
    return undefined
  }
  const field = match[1] as keyof ContactDetails
  const detail = match[2]
  const key =
    detail === 'must not be blank'
      ? requiredError[field]
      : detail === 'must be a well-formed email address'
        ? 'invalidEmail'
        : null
  return [key, field, detail]
}
