import type { ReservationStatus, Specialty } from './api'

export type FormError =
  | 'firstNameRequired'
  | 'lastNameRequired'
  | 'emailRequired'
  | 'phoneRequired'
  | 'invalidEmail'
  | 'invalidPhone'
  | 'phoneAlreadyUsed'
  | 'invalidCode'
  | 'codeExpired'
  | 'tooManyAttempts'
  | 'tooManyCodes'
  | 'noActiveChallenge'
  /** A 429 from this browser. */
  | 'waitFewMinutes'

// Every text the widget writes itself, per language. Server messages (the
// assistant's replies, 4xx error messages) are shown as the backend sends them.
// To add a language: add an object below and its code to `languages`.

export interface Strings {
  openChat: string
  closeChat: string
  title: string
  book: string
  /** Header button back from the booking panel; the arrow follows the reading direction. */
  backToChat: string
  greeting: string
  notSent: string
  messagePlaceholder: string
  send: string
  verifyMyDetails: string

  /** Above the editable contact form. */
  contactIntro: string
  /** Above the contact form pre-filled by the assistant, read-only until "Edit". */
  contactCheckIntro: string
  firstName: string
  lastName: string
  email: string
  phone: string
  edit: string
  backToChatLink: string
  /** The masked email address, e.g. "j***@example.com". */
  codeSentToEmail: (to: string) => string
  /** The masked phone number, e.g. "+971 ••• ••67". */
  codeSentBySms: (to: string) => string
  code: string
  confirm: string
  /** Followed by a countdown "(0:25)" until it can be used. */
  resendCode: string
  codeResent: string
  /** The details were corrected in the chat: the code step closes, the form asks to confirm again. */
  detailsChanged: string
  changeMyDetails: string
  /** The backend's contact and verification errors, shown under the field. */
  formErrors: Record<FormError, string>
  /** Replaces the assistant's reply when the anonymous message limit is reached. */
  contactLimit: string
  /** The same, while the code form is open. */
  codeLimit: string

  chatUnavailable: string
  tooManyRequestsIn: (seconds: number) => string
  tooManyRequests: string
  connectionError: string
  /** A 5xx, e.g. the assistant timed out. */
  serverError: string
  chatEnded: string
  /** The one line kept from the previous conversation when a new one starts. */
  previousChatEnded: string

  loading: string
  nothingBookable: string
  whatToBook: string
  choose: string
  previousMonth: string
  nextMonth: string
  noFreeDays: string
  noFreeTimes: (day: string) => string
  requestNote: string
  requestThisTime: string
  verifyToBook: string

  // A stay: a resource booked by the night.
  chooseCheckIn: string
  chooseCheckOut: string
  changeCheckIn: string
  /** The times as the language writes them, e.g. "14:00" and "11:00". */
  stayTimes: (checkIn: string, checkOut: string) => string
  /** "1 night", "3 nights", with the language's plural forms. */
  nights: (count: number) => string
  /** The shortest and longest stay from the chosen check-in day, already as "2 nights". */
  stayRange: (shortest: string, longest: string) => string
  noStayFrom: (day: string) => string
  requestThisStay: string
  /** The booking form card, for a stay. */
  draftStayTitle: string

  /** After a price per night: "799.50 AED / night". */
  perNight: string
  /** A doctor's specialty, in the resource choice. */
  specialties: Record<Specialty, string>
  /** The booking form card the assistant prepared. */
  draftTitle: string
  no: string
  cancel: string

  /** The summary card of one reservation, found by its code by the assistant. */
  summary: {
    title: string
    status: Record<ReservationStatus, string>
    /** The label of the booking code, e.g. "K7QM-2X9P". */
    code: string
    ok: string
    cancelQuestion: string
    yesCancel: string
    cancelled: string
    notCancellable: string
    notFound: string
  }

  /** Separates the resource from the date in "Dr Lina, Fri 2 Oct 09:00–09:30". */
  separator: string
  /** The code is from the booking response, already isolated for right-to-left text. */
  requestSent: (reservation: string, code: string) => string
  /** After a booking, when the assistant couldn't answer. */
  afterBookingFallback: string

  /** The label of a message written by a person of the business. */
  employee: string
  waitingForEmployee: string
  employeeJoined: string
  backToAssistant: string
}

const en: Strings = {
  openChat: 'Open chat',
  closeChat: 'Close chat',
  title: 'Chat with us',
  book: 'Book',
  backToChat: '← Chat',
  greeting: 'Hi! How can we help you today?',
  notSent: 'Not sent',
  messagePlaceholder: 'Type your message…',
  send: 'Send',
  verifyMyDetails: 'Verify my details',

  contactIntro: 'Leave your details so we can identify you. We will send you a code by email, then one by SMS.',
  contactCheckIntro: 'Please check your details. We will send you a code by email, then one by SMS.',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  edit: 'Edit',
  backToChatLink: 'Back to chat',
  codeSentToEmail: (to) => `Enter the code we sent to ${to}`,
  codeSentBySms: (to) => `Enter the code we sent by SMS to ${to}`,
  code: 'Code',
  confirm: 'Confirm',
  resendCode: 'Resend code',
  codeResent: 'We sent you a new code.',
  detailsChanged: 'Your details have changed. Please confirm them.',
  changeMyDetails: 'Change my details',
  formErrors: {
    firstNameRequired: 'Please enter your first name.',
    lastNameRequired: 'Please enter your last name.',
    emailRequired: 'Please enter your email address.',
    phoneRequired: 'Please enter your phone number.',
    invalidEmail: 'This email address is not valid.',
    invalidPhone: 'This phone number is not valid.',
    phoneAlreadyUsed: 'This phone number is already used by another customer. Please use a different number.',
    invalidCode: 'This code is not correct.',
    codeExpired: 'This code has expired. Use “Resend code” to get a new one.',
    tooManyAttempts: 'Too many wrong codes. Use “Resend code” to get a new one.',
    tooManyCodes: 'Too many codes were requested. Please try again later.',
    noActiveChallenge: 'No code is waiting. Use “Resend code” to get a new one.',
    waitFewMinutes: 'Too many attempts. Please wait a few minutes.',
  },
  contactLimit:
    'To continue, please fill in your details in the form below. You will receive a verification code by email, then by SMS.',
  codeLimit: 'To continue, please enter the verification code we sent you in the form below.',

  chatUnavailable: 'Chat is currently unavailable. Please try again later.',
  tooManyRequestsIn: (seconds) => `Too many requests. Please try again in ${seconds} seconds.`,
  tooManyRequests: 'Too many requests. Please try again in a moment.',
  connectionError: 'Could not reach the chat. Please check your connection and try again.',
  serverError: 'Something went wrong on our side. Please try again.',
  chatEnded: 'This chat has ended. Send a message to start a new one.',
  previousChatEnded: 'Previous conversation ended',

  loading: 'Loading…',
  nothingBookable: 'Nothing can be booked online at the moment.',
  whatToBook: 'What would you like to book?',
  choose: 'Choose…',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  noFreeDays: 'No free days this month.',
  noFreeTimes: (day) => `No free times on ${day}.`,
  requestNote: 'This sends a request: the business will confirm it.',
  requestThisTime: 'Request this time',
  verifyToBook: 'Verify my details to book',

  chooseCheckIn: 'Choose your check-in day.',
  chooseCheckOut: 'Now choose your check-out day.',
  changeCheckIn: 'Change the check-in day',
  stayTimes: (checkIn, checkOut) => `Check-in ${checkIn}, check-out ${checkOut}`,
  nights: (count) => (count === 1 ? '1 night' : `${count} nights`),
  stayRange: (shortest, longest) =>
    shortest === longest ? `Stay: ${shortest}.` : `Stay: from ${shortest} to ${longest}.`,
  noStayFrom: (day) => `No stay can start on ${day}. Please choose another day.`,
  requestThisStay: 'Request this stay',
  draftStayTitle: 'Book this stay?',

  perNight: '/ night',
  specialties: {
    GENERAL_PRACTICE: 'General practice',
    FAMILY_MEDICINE: 'Family medicine',
    INTERNAL_MEDICINE: 'Internal medicine',
    PEDIATRICS: 'Pediatrics',
    OBSTETRICS_GYNECOLOGY: 'Obstetrics and gynecology',
    DERMATOLOGY: 'Dermatology',
    AESTHETIC_MEDICINE: 'Aesthetic medicine',
    DENTISTRY: 'Dentistry',
    ORTHODONTICS: 'Orthodontics',
    OPHTHALMOLOGY: 'Ophthalmology',
    ENT: 'Ear, nose and throat (ENT)',
    CARDIOLOGY: 'Cardiology',
    ENDOCRINOLOGY: 'Endocrinology',
    GASTROENTEROLOGY: 'Gastroenterology',
    NEUROLOGY: 'Neurology',
    ORTHOPEDICS: 'Orthopedics',
    UROLOGY: 'Urology',
    PSYCHIATRY: 'Psychiatry',
    PSYCHOLOGY: 'Psychology',
    PHYSIOTHERAPY: 'Physiotherapy',
    NUTRITION: 'Nutrition',
    RADIOLOGY: 'Radiology',
    OTHER: 'Other',
  },
  draftTitle: 'Book this time?',
  no: 'No',
  cancel: 'Cancel',

  summary: {
    title: 'Your reservation',
    status: {
      PENDING: 'Waiting for the business to confirm',
      CONFIRMED: 'Confirmed',
      CANCELLED: 'Cancelled',
      COMPLETED: 'Completed',
    },
    code: 'Booking code',
    ok: 'OK',
    cancelQuestion: 'Do you really want to cancel your reservation?',
    yesCancel: 'Yes, cancel it',
    cancelled: 'Your reservation was cancelled.',
    notCancellable: 'This reservation can no longer be cancelled.',
    notFound: 'Reservation not found.',
  },

  separator: ', ',
  requestSent: (reservation, code) => `Request sent: ${reservation} — awaiting confirmation. Booking code: ${code}`,
  afterBookingFallback:
    'Your request has been sent to the business. You will be notified once they confirm it. Is there anything else I can help you with?',

  employee: 'Employee',
  waitingForEmployee: 'An employee will answer you here.',
  employeeJoined: 'An employee has joined the chat.',
  backToAssistant: 'You’re chatting with the assistant again.',
}

const fr: Strings = {
  openChat: 'Ouvrir le chat',
  closeChat: 'Fermer le chat',
  title: 'Discutons',
  book: 'Réserver',
  backToChat: '← Chat',
  greeting: 'Bonjour ! Comment pouvons-nous vous aider ?',
  notSent: 'Non envoyé',
  messagePlaceholder: 'Écrivez votre message…',
  send: 'Envoyer',
  verifyMyDetails: 'Vérifier mes coordonnées',

  contactIntro:
    'Indiquez vos coordonnées pour que nous puissions vous identifier. Nous vous enverrons un code par e-mail, puis un autre par SMS.',
  contactCheckIntro: 'Vérifiez vos coordonnées. Nous vous enverrons un code par e-mail, puis un autre par SMS.',
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  edit: 'Modifier',
  backToChatLink: 'Retour au chat',
  codeSentToEmail: (to) => `Saisissez le code envoyé à ${to}`,
  codeSentBySms: (to) => `Saisissez le code envoyé par SMS au ${to}`,
  code: 'Code',
  confirm: 'Confirmer',
  resendCode: 'Renvoyer le code',
  codeResent: 'Nous vous avons envoyé un nouveau code.',
  detailsChanged: 'Vos coordonnées ont changé. Veuillez les confirmer.',
  changeMyDetails: 'Modifier mes coordonnées',
  formErrors: {
    firstNameRequired: 'Veuillez saisir votre prénom.',
    lastNameRequired: 'Veuillez saisir votre nom.',
    emailRequired: 'Veuillez saisir votre adresse e-mail.',
    phoneRequired: 'Veuillez saisir votre numéro de téléphone.',
    invalidEmail: 'Cette adresse e-mail n’est pas valide.',
    invalidPhone: 'Ce numéro de téléphone n’est pas valide.',
    phoneAlreadyUsed: 'Ce numéro de téléphone est déjà utilisé par un autre client. Veuillez saisir un autre numéro.',
    invalidCode: 'Ce code est incorrect.',
    codeExpired: 'Ce code a expiré. Utilisez « Renvoyer le code » pour en recevoir un nouveau.',
    tooManyAttempts: 'Trop de codes incorrects. Utilisez « Renvoyer le code » pour en recevoir un nouveau.',
    tooManyCodes: 'Trop de codes ont été demandés. Veuillez réessayer plus tard.',
    noActiveChallenge: 'Aucun code n’est en attente. Utilisez « Renvoyer le code » pour en recevoir un nouveau.',
    waitFewMinutes: 'Trop de tentatives. Veuillez patienter quelques minutes.',
  },
  contactLimit:
    'Pour continuer, veuillez remplir vos coordonnées dans le formulaire ci-dessous. Vous recevrez un code de vérification par e-mail, puis par SMS.',
  codeLimit: 'Pour continuer, veuillez saisir dans le formulaire ci-dessous le code de vérification que nous vous avons envoyé.',

  chatUnavailable: 'Le chat est momentanément indisponible. Veuillez réessayer plus tard.',
  tooManyRequestsIn: (seconds) => `Trop de demandes. Veuillez réessayer dans ${seconds} secondes.`,
  tooManyRequests: 'Trop de demandes. Veuillez réessayer dans un instant.',
  connectionError: 'Impossible de joindre le chat. Vérifiez votre connexion et réessayez.',
  serverError: 'Un problème est survenu de notre côté. Veuillez réessayer.',
  chatEnded: 'Cette conversation est terminée. Envoyez un message pour en commencer une nouvelle.',
  previousChatEnded: 'Conversation précédente terminée',

  loading: 'Chargement…',
  nothingBookable: 'Rien ne peut être réservé en ligne pour le moment.',
  whatToBook: 'Que souhaitez-vous réserver ?',
  choose: 'Choisir…',
  previousMonth: 'Mois précédent',
  nextMonth: 'Mois suivant',
  noFreeDays: 'Aucun jour disponible ce mois-ci.',
  noFreeTimes: (day) => `Aucun créneau disponible le ${day}.`,
  requestNote: 'Ceci envoie une demande : l’établissement la confirmera.',
  requestThisTime: 'Demander ce créneau',
  verifyToBook: 'Vérifier mes coordonnées pour réserver',

  chooseCheckIn: 'Choisissez votre jour d’arrivée.',
  chooseCheckOut: 'Choisissez maintenant votre jour de départ.',
  changeCheckIn: 'Changer le jour d’arrivée',
  stayTimes: (checkIn, checkOut) => `Arrivée ${checkIn}, départ ${checkOut}`,
  nights: (count) => (count <= 1 ? `${count} nuit` : `${count} nuits`),
  stayRange: (shortest, longest) =>
    shortest === longest ? `Séjour : ${shortest}.` : `Séjour : de ${shortest} à ${longest}.`,
  noStayFrom: (day) => `Aucun séjour ne peut commencer le ${day}. Veuillez choisir un autre jour.`,
  requestThisStay: 'Demander ce séjour',
  draftStayTitle: 'Réserver ce séjour ?',

  perNight: '/ nuit',
  specialties: {
    GENERAL_PRACTICE: 'Médecine générale',
    FAMILY_MEDICINE: 'Médecine familiale',
    INTERNAL_MEDICINE: 'Médecine interne',
    PEDIATRICS: 'Pédiatrie',
    OBSTETRICS_GYNECOLOGY: 'Gynécologie-obstétrique',
    DERMATOLOGY: 'Dermatologie',
    AESTHETIC_MEDICINE: 'Médecine esthétique',
    DENTISTRY: 'Dentisterie',
    ORTHODONTICS: 'Orthodontie',
    OPHTHALMOLOGY: 'Ophtalmologie',
    ENT: 'Oto-rhino-laryngologie (ORL)',
    CARDIOLOGY: 'Cardiologie',
    ENDOCRINOLOGY: 'Endocrinologie',
    GASTROENTEROLOGY: 'Gastro-entérologie',
    NEUROLOGY: 'Neurologie',
    ORTHOPEDICS: 'Orthopédie',
    UROLOGY: 'Urologie',
    PSYCHIATRY: 'Psychiatrie',
    PSYCHOLOGY: 'Psychologie',
    PHYSIOTHERAPY: 'Kinésithérapie',
    NUTRITION: 'Nutrition',
    RADIOLOGY: 'Radiologie',
    OTHER: 'Autre',
  },
  draftTitle: 'Réserver ce créneau ?',
  no: 'Non',
  cancel: 'Annuler',

  summary: {
    title: 'Votre réservation',
    status: {
      PENDING: 'En attente de confirmation par l’établissement',
      CONFIRMED: 'Confirmée',
      CANCELLED: 'Annulée',
      COMPLETED: 'Terminée',
    },
    code: 'Code de réservation',
    ok: 'OK',
    cancelQuestion: 'Voulez-vous vraiment annuler votre réservation ?',
    yesCancel: 'Oui, l’annuler',
    cancelled: 'Votre réservation a été annulée.',
    notCancellable: 'Cette réservation ne peut plus être annulée.',
    notFound: 'Réservation introuvable.',
  },

  separator: ', ',
  requestSent: (reservation, code) => `Demande envoyée : ${reservation} — en attente de confirmation. Code de réservation : ${code}`,
  afterBookingFallback:
    'Votre demande a été envoyée à l’établissement. Vous serez averti dès qu’elle sera confirmée. Puis-je vous aider pour autre chose ?',

  employee: 'Employé',
  waitingForEmployee: 'Un employé va vous répondre ici.',
  employeeJoined: 'Un employé a rejoint la conversation.',
  backToAssistant: 'Vous discutez à nouveau avec l’assistant.',
}

const es: Strings = {
  openChat: 'Abrir el chat',
  closeChat: 'Cerrar el chat',
  title: 'Chatea con nosotros',
  book: 'Reservar',
  backToChat: '← Chat',
  greeting: '¡Hola! ¿En qué podemos ayudarte?',
  notSent: 'No enviado',
  messagePlaceholder: 'Escribe tu mensaje…',
  send: 'Enviar',
  verifyMyDetails: 'Verificar mis datos',

  contactIntro:
    'Déjanos tus datos para que podamos identificarte. Te enviaremos un código por correo electrónico y después otro por SMS.',
  contactCheckIntro: 'Comprueba tus datos. Te enviaremos un código por correo electrónico y después otro por SMS.',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  edit: 'Editar',
  backToChatLink: 'Volver al chat',
  codeSentToEmail: (to) => `Introduce el código que enviamos a ${to}`,
  codeSentBySms: (to) => `Introduce el código que enviamos por SMS al ${to}`,
  code: 'Código',
  confirm: 'Confirmar',
  resendCode: 'Reenviar código',
  codeResent: 'Te hemos enviado un nuevo código.',
  detailsChanged: 'Tus datos han cambiado. Confírmalos, por favor.',
  changeMyDetails: 'Cambiar mis datos',
  formErrors: {
    firstNameRequired: 'Introduce tu nombre.',
    lastNameRequired: 'Introduce tus apellidos.',
    emailRequired: 'Introduce tu correo electrónico.',
    phoneRequired: 'Introduce tu número de teléfono.',
    invalidEmail: 'Este correo electrónico no es válido.',
    invalidPhone: 'Este número de teléfono no es válido.',
    phoneAlreadyUsed: 'Este número de teléfono ya lo usa otro cliente. Introduzca otro número.',
    invalidCode: 'El código no es correcto.',
    codeExpired: 'Este código ha caducado. Usa «Reenviar código» para recibir uno nuevo.',
    tooManyAttempts: 'Demasiados códigos incorrectos. Usa «Reenviar código» para recibir uno nuevo.',
    tooManyCodes: 'Se han solicitado demasiados códigos. Inténtalo de nuevo más tarde.',
    noActiveChallenge: 'No hay ningún código pendiente. Usa «Reenviar código» para recibir uno nuevo.',
    waitFewMinutes: 'Demasiados intentos. Espera unos minutos.',
  },
  contactLimit:
    'Para continuar, completa tus datos en el formulario de abajo. Recibirás un código de verificación por correo electrónico y después por SMS.',
  codeLimit: 'Para continuar, introduce en el formulario de abajo el código de verificación que te hemos enviado.',

  chatUnavailable: 'El chat no está disponible en este momento. Inténtalo de nuevo más tarde.',
  tooManyRequestsIn: (seconds) => `Demasiadas solicitudes. Inténtalo de nuevo en ${seconds} segundos.`,
  tooManyRequests: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.',
  connectionError: 'No se pudo conectar con el chat. Comprueba tu conexión e inténtalo de nuevo.',
  serverError: 'Algo ha fallado por nuestra parte. Inténtalo de nuevo.',
  chatEnded: 'Este chat ha terminado. Envía un mensaje para empezar uno nuevo.',
  previousChatEnded: 'Conversación anterior finalizada',

  loading: 'Cargando…',
  nothingBookable: 'Por el momento no se puede reservar nada en línea.',
  whatToBook: '¿Qué te gustaría reservar?',
  choose: 'Elegir…',
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  noFreeDays: 'No hay días disponibles este mes.',
  noFreeTimes: (day) => `No hay horarios disponibles el ${day}.`,
  requestNote: 'Esto envía una solicitud: el negocio la confirmará.',
  requestThisTime: 'Solicitar este horario',
  verifyToBook: 'Verificar mis datos para reservar',

  chooseCheckIn: 'Elige tu día de entrada.',
  chooseCheckOut: 'Ahora elige tu día de salida.',
  changeCheckIn: 'Cambiar el día de entrada',
  stayTimes: (checkIn, checkOut) => `Entrada ${checkIn}, salida ${checkOut}`,
  nights: (count) => (count === 1 ? '1 noche' : `${count} noches`),
  stayRange: (shortest, longest) =>
    shortest === longest ? `Estancia: ${shortest}.` : `Estancia: de ${shortest} a ${longest}.`,
  noStayFrom: (day) => `Ninguna estancia puede empezar el ${day}. Elige otro día.`,
  requestThisStay: 'Solicitar esta estancia',
  draftStayTitle: '¿Reservar esta estancia?',

  perNight: '/ noche',
  specialties: {
    GENERAL_PRACTICE: 'Medicina general',
    FAMILY_MEDICINE: 'Medicina familiar',
    INTERNAL_MEDICINE: 'Medicina interna',
    PEDIATRICS: 'Pediatría',
    OBSTETRICS_GYNECOLOGY: 'Obstetricia y ginecología',
    DERMATOLOGY: 'Dermatología',
    AESTHETIC_MEDICINE: 'Medicina estética',
    DENTISTRY: 'Odontología',
    ORTHODONTICS: 'Ortodoncia',
    OPHTHALMOLOGY: 'Oftalmología',
    ENT: 'Otorrinolaringología (ORL)',
    CARDIOLOGY: 'Cardiología',
    ENDOCRINOLOGY: 'Endocrinología',
    GASTROENTEROLOGY: 'Gastroenterología',
    NEUROLOGY: 'Neurología',
    ORTHOPEDICS: 'Ortopedia',
    UROLOGY: 'Urología',
    PSYCHIATRY: 'Psiquiatría',
    PSYCHOLOGY: 'Psicología',
    PHYSIOTHERAPY: 'Fisioterapia',
    NUTRITION: 'Nutrición',
    RADIOLOGY: 'Radiología',
    OTHER: 'Otra',
  },
  draftTitle: '¿Reservar este horario?',
  no: 'No',
  cancel: 'Cancelar',

  summary: {
    title: 'Tu reserva',
    status: {
      PENDING: 'Pendiente de confirmación por el negocio',
      CONFIRMED: 'Confirmada',
      CANCELLED: 'Cancelada',
      COMPLETED: 'Completada',
    },
    code: 'Código de reserva',
    ok: 'Aceptar',
    cancelQuestion: '¿Seguro que quieres cancelar tu reserva?',
    yesCancel: 'Sí, cancelarla',
    cancelled: 'Tu reserva se ha cancelado.',
    notCancellable: 'Esta reserva ya no se puede cancelar.',
    notFound: 'No se ha encontrado la reserva.',
  },

  separator: ', ',
  requestSent: (reservation, code) => `Solicitud enviada: ${reservation} — pendiente de confirmación. Código de reserva: ${code}`,
  afterBookingFallback:
    'Tu solicitud se ha enviado al negocio. Te avisaremos cuando la confirmen. ¿Hay algo más en lo que pueda ayudarte?',

  employee: 'Empleado',
  waitingForEmployee: 'Un empleado te responderá aquí.',
  employeeJoined: 'Un empleado se ha unido al chat.',
  backToAssistant: 'Vuelves a hablar con el asistente.',
}

const ru: Strings = {
  openChat: 'Открыть чат',
  closeChat: 'Закрыть чат',
  title: 'Напишите нам',
  book: 'Забронировать',
  backToChat: '← Чат',
  greeting: 'Здравствуйте! Чем мы можем помочь?',
  notSent: 'Не отправлено',
  messagePlaceholder: 'Введите сообщение…',
  send: 'Отправить',
  verifyMyDetails: 'Подтвердить мои данные',

  contactIntro:
    'Оставьте свои данные, чтобы мы могли вас идентифицировать. Мы отправим вам код по электронной почте, а затем — по SMS.',
  contactCheckIntro: 'Проверьте свои данные. Мы отправим вам код по электронной почте, а затем — по SMS.',
  firstName: 'Имя',
  lastName: 'Фамилия',
  email: 'Эл. почта',
  phone: 'Телефон',
  edit: 'Изменить',
  backToChatLink: 'Вернуться в чат',
  codeSentToEmail: (to) => `Введите код, отправленный на ${to}`,
  codeSentBySms: (to) => `Введите код, отправленный по SMS на номер ${to}`,
  code: 'Код',
  confirm: 'Подтвердить',
  resendCode: 'Отправить код повторно',
  codeResent: 'Мы отправили вам новый код.',
  detailsChanged: 'Ваши данные изменились. Подтвердите их.',
  changeMyDetails: 'Изменить мои данные',
  formErrors: {
    firstNameRequired: 'Введите имя.',
    lastNameRequired: 'Введите фамилию.',
    emailRequired: 'Введите адрес электронной почты.',
    phoneRequired: 'Введите номер телефона.',
    invalidEmail: 'Неверный адрес электронной почты.',
    invalidPhone: 'Неверный номер телефона.',
    phoneAlreadyUsed: 'Этот номер телефона уже используется другим клиентом. Укажите другой номер.',
    invalidCode: 'Неверный код.',
    codeExpired: 'Срок действия кода истёк. Нажмите «Отправить код повторно», чтобы получить новый.',
    tooManyAttempts: 'Слишком много неверных кодов. Нажмите «Отправить код повторно», чтобы получить новый.',
    tooManyCodes: 'Запрошено слишком много кодов. Повторите попытку позже.',
    noActiveChallenge: 'Нет действующего кода. Нажмите «Отправить код повторно», чтобы получить новый.',
    waitFewMinutes: 'Слишком много попыток. Подождите несколько минут.',
  },
  contactLimit:
    'Чтобы продолжить, заполните свои данные в форме ниже. Вы получите код подтверждения по электронной почте, а затем по SMS.',
  codeLimit: 'Чтобы продолжить, введите в форме ниже код подтверждения, который мы вам отправили.',

  chatUnavailable: 'Чат временно недоступен. Повторите попытку позже.',
  // "с" avoids the Russian plural forms of "seconds".
  tooManyRequestsIn: (seconds) => `Слишком много запросов. Повторите попытку через ${seconds} с.`,
  tooManyRequests: 'Слишком много запросов. Повторите попытку чуть позже.',
  connectionError: 'Не удалось подключиться к чату. Проверьте соединение и повторите попытку.',
  serverError: 'На нашей стороне что-то пошло не так. Повторите попытку.',
  chatEnded: 'Этот чат завершён. Отправьте сообщение, чтобы начать новый.',
  previousChatEnded: 'Предыдущий разговор завершён',

  loading: 'Загрузка…',
  nothingBookable: 'Сейчас ничего нельзя забронировать онлайн.',
  whatToBook: 'Что вы хотите забронировать?',
  choose: 'Выберите…',
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  noFreeDays: 'В этом месяце нет свободных дней.',
  noFreeTimes: (day) => `Нет свободного времени: ${day}.`,
  requestNote: 'Это отправит запрос: компания его подтвердит.',
  requestThisTime: 'Запросить это время',
  verifyToBook: 'Подтвердите данные, чтобы забронировать',

  chooseCheckIn: 'Выберите день заезда.',
  chooseCheckOut: 'Теперь выберите день выезда.',
  changeCheckIn: 'Изменить день заезда',
  stayTimes: (checkIn, checkOut) => `Заезд ${checkIn}, выезд ${checkOut}`,
  // 1 ночь, 2–4 ночи, 5–20 ночей, 21 ночь…
  nights: (count) => {
    const form = new Intl.PluralRules('ru').select(count)
    return `${count} ${form === 'one' ? 'ночь' : form === 'few' ? 'ночи' : 'ночей'}`
  },
  stayRange: (shortest, longest) =>
    shortest === longest ? `Проживание: ${shortest}.` : `Проживание: от ${shortest} до ${longest}.`,
  noStayFrom: (day) => `Проживание не может начаться в этот день: ${day}. Выберите другой день.`,
  requestThisStay: 'Запросить это проживание',
  draftStayTitle: 'Забронировать это проживание?',

  perNight: '/ ночь',
  specialties: {
    GENERAL_PRACTICE: 'Общая практика',
    FAMILY_MEDICINE: 'Семейная медицина',
    INTERNAL_MEDICINE: 'Внутренние болезни',
    PEDIATRICS: 'Педиатрия',
    OBSTETRICS_GYNECOLOGY: 'Акушерство и гинекология',
    DERMATOLOGY: 'Дерматология',
    AESTHETIC_MEDICINE: 'Эстетическая медицина',
    DENTISTRY: 'Стоматология',
    ORTHODONTICS: 'Ортодонтия',
    OPHTHALMOLOGY: 'Офтальмология',
    ENT: 'Оториноларингология (ЛОР)',
    CARDIOLOGY: 'Кардиология',
    ENDOCRINOLOGY: 'Эндокринология',
    GASTROENTEROLOGY: 'Гастроэнтерология',
    NEUROLOGY: 'Неврология',
    ORTHOPEDICS: 'Ортопедия',
    UROLOGY: 'Урология',
    PSYCHIATRY: 'Психиатрия',
    PSYCHOLOGY: 'Психология',
    PHYSIOTHERAPY: 'Физиотерапия',
    NUTRITION: 'Диетология',
    RADIOLOGY: 'Радиология',
    OTHER: 'Другое',
  },
  draftTitle: 'Забронировать это время?',
  no: 'Нет',
  cancel: 'Отменить',

  summary: {
    title: 'Ваше бронирование',
    status: {
      PENDING: 'Ожидает подтверждения компанией',
      CONFIRMED: 'Подтверждено',
      CANCELLED: 'Отменено',
      COMPLETED: 'Завершено',
    },
    code: 'Код бронирования',
    ok: 'ОК',
    cancelQuestion: 'Вы действительно хотите отменить бронирование?',
    yesCancel: 'Да, отменить',
    cancelled: 'Ваше бронирование отменено.',
    notCancellable: 'Это бронирование больше нельзя отменить.',
    notFound: 'Бронирование не найдено.',
  },

  separator: ', ',
  requestSent: (reservation, code) => `Запрос отправлен: ${reservation} — ожидает подтверждения. Код бронирования: ${code}`,
  afterBookingFallback:
    'Ваш запрос отправлен в компанию. Вы получите уведомление, как только его подтвердят. Могу ли я помочь чем-то ещё?',

  employee: 'Сотрудник',
  waitingForEmployee: 'Сотрудник ответит вам здесь.',
  employeeJoined: 'Сотрудник присоединился к чату.',
  backToAssistant: 'Вы снова общаетесь с ассистентом.',
}

const ar: Strings = {
  openChat: 'فتح المحادثة',
  closeChat: 'إغلاق المحادثة',
  title: 'تحدث معنا',
  book: 'احجز',
  backToChat: '→ المحادثة',
  greeting: 'مرحبًا! كيف يمكننا مساعدتك اليوم؟',
  notSent: 'لم تُرسل',
  messagePlaceholder: 'اكتب رسالتك…',
  send: 'إرسال',
  verifyMyDetails: 'تأكيد بياناتي',

  contactIntro:
    'اترك بياناتك حتى نتمكن من التعرّف عليك. سنرسل إليك رمزًا عبر البريد الإلكتروني، ثم رمزًا آخر عبر رسالة نصية قصيرة.',
  contactCheckIntro:
    'يُرجى التحقق من بياناتك. سنرسل إليك رمزًا عبر البريد الإلكتروني، ثم رمزًا آخر عبر رسالة نصية قصيرة.',
  firstName: 'الاسم الأول',
  lastName: 'اسم العائلة',
  email: 'البريد الإلكتروني',
  phone: 'الهاتف',
  edit: 'تعديل',
  backToChatLink: 'العودة إلى المحادثة',
  codeSentToEmail: (to) => `أدخل الرمز الذي أرسلناه إلى ${to}`,
  codeSentBySms: (to) => `أدخل الرمز الذي أرسلناه برسالة نصية إلى ${to}`,
  code: 'الرمز',
  confirm: 'تأكيد',
  resendCode: 'إعادة إرسال الرمز',
  codeResent: 'أرسلنا إليك رمزًا جديدًا.',
  detailsChanged: 'تغيّرت بياناتك. يُرجى تأكيدها.',
  changeMyDetails: 'تعديل بياناتي',
  formErrors: {
    firstNameRequired: 'يُرجى إدخال اسمك الأول.',
    lastNameRequired: 'يُرجى إدخال اسم العائلة.',
    emailRequired: 'يُرجى إدخال بريدك الإلكتروني.',
    phoneRequired: 'يُرجى إدخال رقم هاتفك.',
    invalidEmail: 'عنوان البريد الإلكتروني غير صالح.',
    invalidPhone: 'رقم الهاتف غير صالح.',
    phoneAlreadyUsed: 'رقم الهاتف هذا مستخدم من قبل عميل آخر. يرجى إدخال رقم آخر.',
    invalidCode: 'الرمز غير صحيح.',
    codeExpired: 'انتهت صلاحية هذا الرمز. استخدم «إعادة إرسال الرمز» للحصول على رمز جديد.',
    tooManyAttempts: 'رموز غير صحيحة كثيرة جدًا. استخدم «إعادة إرسال الرمز» للحصول على رمز جديد.',
    tooManyCodes: 'تم طلب عدد كبير جدًا من الرموز. يُرجى المحاولة لاحقًا.',
    noActiveChallenge: 'لا يوجد رمز قيد الانتظار. استخدم «إعادة إرسال الرمز» للحصول على رمز جديد.',
    waitFewMinutes: 'محاولات كثيرة جدًا. يُرجى الانتظار بضع دقائق.',
  },
  contactLimit:
    'للمتابعة، يُرجى إدخال بياناتك في النموذج أدناه. ستتلقى رمز تحقق عبر البريد الإلكتروني، ثم عبر رسالة نصية قصيرة.',
  codeLimit: 'للمتابعة، يُرجى إدخال رمز التحقق الذي أرسلناه إليك في النموذج أدناه.',

  chatUnavailable: 'المحادثة غير متاحة حاليًا. يُرجى المحاولة لاحقًا.',
  tooManyRequestsIn: (seconds) => `طلبات كثيرة جدًا. يُرجى المحاولة مرة أخرى بعد ${seconds} ثانية.`,
  tooManyRequests: 'طلبات كثيرة جدًا. يُرجى المحاولة مرة أخرى بعد قليل.',
  connectionError: 'تعذّر الاتصال بالمحادثة. يُرجى التحقق من اتصالك والمحاولة مرة أخرى.',
  serverError: 'حدث خطأ من جهتنا. يُرجى المحاولة مرة أخرى.',
  chatEnded: 'انتهت هذه المحادثة. أرسل رسالة لبدء محادثة جديدة.',
  previousChatEnded: 'انتهت المحادثة السابقة',

  loading: 'جارٍ التحميل…',
  nothingBookable: 'لا يتوفر الحجز عبر الإنترنت في الوقت الحالي.',
  whatToBook: 'ماذا تريد أن تحجز؟',
  choose: 'اختر…',
  previousMonth: 'الشهر السابق',
  nextMonth: 'الشهر التالي',
  noFreeDays: 'لا توجد أيام متاحة هذا الشهر.',
  noFreeTimes: (day) => `لا توجد أوقات متاحة يوم ${day}.`,
  requestNote: 'سيتم إرسال طلب، وستقوم المنشأة بتأكيده.',
  requestThisTime: 'اطلب هذا الموعد',
  verifyToBook: 'أكّد بياناتك للحجز',

  chooseCheckIn: 'اختر يوم الوصول.',
  chooseCheckOut: 'اختر الآن يوم المغادرة.',
  changeCheckIn: 'تغيير يوم الوصول',
  stayTimes: (checkIn, checkOut) => `الوصول ${checkIn}، المغادرة ${checkOut}`,
  // ليلة واحدة، ليلتان، 3–10 ليالٍ، 11 ليلة…
  nights: (count) =>
    count === 1
      ? 'ليلة واحدة'
      : count === 2
        ? 'ليلتان'
        : count % 100 >= 3 && count % 100 <= 10
          ? `${count} ليالٍ`
          : `${count} ليلة`,
  stayRange: (shortest, longest) =>
    shortest === longest ? `الإقامة: ${shortest}.` : `الإقامة: من ${shortest} إلى ${longest}.`,
  noStayFrom: (day) => `لا يمكن أن تبدأ إقامة يوم ${day}. يُرجى اختيار يوم آخر.`,
  requestThisStay: 'اطلب هذه الإقامة',
  draftStayTitle: 'هل تريد حجز هذه الإقامة؟',

  perNight: '/ ليلة',
  specialties: {
    GENERAL_PRACTICE: 'الطب العام',
    FAMILY_MEDICINE: 'طب الأسرة',
    INTERNAL_MEDICINE: 'الطب الباطني',
    PEDIATRICS: 'طب الأطفال',
    OBSTETRICS_GYNECOLOGY: 'أمراض النساء والتوليد',
    DERMATOLOGY: 'الأمراض الجلدية',
    AESTHETIC_MEDICINE: 'الطب التجميلي',
    DENTISTRY: 'طب الأسنان',
    ORTHODONTICS: 'تقويم الأسنان',
    OPHTHALMOLOGY: 'طب العيون',
    ENT: 'الأنف والأذن والحنجرة',
    CARDIOLOGY: 'أمراض القلب',
    ENDOCRINOLOGY: 'الغدد الصماء',
    GASTROENTEROLOGY: 'الجهاز الهضمي',
    NEUROLOGY: 'الأعصاب',
    ORTHOPEDICS: 'العظام',
    UROLOGY: 'المسالك البولية',
    PSYCHIATRY: 'الطب النفسي',
    PSYCHOLOGY: 'علم النفس',
    PHYSIOTHERAPY: 'العلاج الطبيعي',
    NUTRITION: 'التغذية',
    RADIOLOGY: 'الأشعة',
    OTHER: 'أخرى',
  },
  draftTitle: 'هل تريد حجز هذا الموعد؟',
  no: 'لا',
  cancel: 'إلغاء',

  summary: {
    title: 'حجزك',
    status: {
      PENDING: 'بانتظار تأكيد المنشأة',
      CONFIRMED: 'مؤكَّد',
      CANCELLED: 'ملغى',
      COMPLETED: 'مكتمل',
    },
    code: 'رمز الحجز',
    ok: 'حسنًا',
    cancelQuestion: 'هل تريد حقًا إلغاء حجزك؟',
    yesCancel: 'نعم، ألغِه',
    cancelled: 'تم إلغاء حجزك.',
    notCancellable: 'لم يعد بالإمكان إلغاء هذا الحجز.',
    notFound: 'لم يتم العثور على الحجز.',
  },

  separator: '، ',
  requestSent: (reservation, code) => `تم إرسال الطلب: ${reservation} — بانتظار التأكيد. رمز الحجز: ${code}`,
  afterBookingFallback:
    'تم إرسال طلبك إلى المنشأة. سنُعلمك فور تأكيده. هل هناك أي شيء آخر يمكنني مساعدتك به؟',

  employee: 'موظف',
  waitingForEmployee: 'سيرد عليك أحد الموظفين هنا.',
  employeeJoined: 'انضم أحد الموظفين إلى المحادثة.',
  backToAssistant: 'أنت تتحدث مع المساعد مرة أخرى.',
}

// Polite plural (εσείς) towards the visitor.
const el: Strings = {
  openChat: 'Άνοιγμα συνομιλίας',
  closeChat: 'Κλείσιμο συνομιλίας',
  title: 'Συνομιλήστε μαζί μας',
  book: 'Κράτηση',
  backToChat: '← Συνομιλία',
  greeting: 'Γεια σας! Πώς μπορούμε να σας βοηθήσουμε σήμερα;',
  notSent: 'Δεν στάλθηκε',
  messagePlaceholder: 'Γράψτε το μήνυμά σας…',
  send: 'Αποστολή',
  verifyMyDetails: 'Επαλήθευση των στοιχείων μου',

  contactIntro:
    'Αφήστε τα στοιχεία σας για να σας αναγνωρίσουμε. Θα σας στείλουμε έναν κωδικό μέσω email και στη συνέχεια έναν μέσω SMS.',
  contactCheckIntro:
    'Ελέγξτε τα στοιχεία σας. Θα σας στείλουμε έναν κωδικό μέσω email και στη συνέχεια έναν μέσω SMS.',
  firstName: 'Όνομα',
  lastName: 'Επώνυμο',
  email: 'Email',
  phone: 'Τηλέφωνο',
  edit: 'Επεξεργασία',
  backToChatLink: 'Επιστροφή στη συνομιλία',
  codeSentToEmail: (to) => `Εισαγάγετε τον κωδικό που στείλαμε στο ${to}`,
  codeSentBySms: (to) => `Εισαγάγετε τον κωδικό που στείλαμε με SMS στο ${to}`,
  code: 'Κωδικός',
  confirm: 'Επιβεβαίωση',
  resendCode: 'Νέα αποστολή κωδικού',
  codeResent: 'Σας στείλαμε νέο κωδικό.',
  detailsChanged: 'Τα στοιχεία σας άλλαξαν. Επιβεβαιώστε τα.',
  changeMyDetails: 'Αλλαγή των στοιχείων μου',
  formErrors: {
    firstNameRequired: 'Συμπληρώστε το όνομά σας.',
    lastNameRequired: 'Συμπληρώστε το επώνυμό σας.',
    emailRequired: 'Συμπληρώστε το email σας.',
    phoneRequired: 'Συμπληρώστε τον αριθμό τηλεφώνου σας.',
    invalidEmail: 'Η διεύθυνση email δεν είναι έγκυρη.',
    invalidPhone: 'Ο αριθμός τηλεφώνου δεν είναι έγκυρος.',
    phoneAlreadyUsed: 'Αυτός ο αριθμός τηλεφώνου χρησιμοποιείται ήδη από άλλον πελάτη. Εισαγάγετε άλλον αριθμό.',
    invalidCode: 'Ο κωδικός δεν είναι σωστός.',
    codeExpired: 'Ο κωδικός έληξε. Πατήστε «Νέα αποστολή κωδικού» για να λάβετε νέο.',
    tooManyAttempts: 'Πάρα πολλοί λανθασμένοι κωδικοί. Πατήστε «Νέα αποστολή κωδικού» για να λάβετε νέο.',
    tooManyCodes: 'Ζητήθηκαν πάρα πολλοί κωδικοί. Δοκιμάστε ξανά αργότερα.',
    noActiveChallenge: 'Δεν εκκρεμεί κανένας κωδικός. Πατήστε «Νέα αποστολή κωδικού» για να λάβετε νέο.',
    waitFewMinutes: 'Πάρα πολλές προσπάθειες. Περιμένετε λίγα λεπτά.',
  },
  contactLimit:
    'Για να συνεχίσετε, συμπληρώστε τα στοιχεία σας στην παρακάτω φόρμα. Θα λάβετε κωδικό επαλήθευσης μέσω email και στη συνέχεια μέσω SMS.',
  codeLimit: 'Για να συνεχίσετε, εισαγάγετε στην παρακάτω φόρμα τον κωδικό επαλήθευσης που σας στείλαμε.',

  chatUnavailable: 'Η συνομιλία δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκιμάστε ξανά αργότερα.',
  tooManyRequestsIn: (seconds) => `Πάρα πολλά αιτήματα. Δοκιμάστε ξανά σε ${seconds} δευτερόλεπτα.`,
  tooManyRequests: 'Πάρα πολλά αιτήματα. Δοκιμάστε ξανά σε λίγο.',
  connectionError: 'Δεν ήταν δυνατή η σύνδεση με τη συνομιλία. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
  serverError: 'Κάτι πήγε στραβά από την πλευρά μας. Δοκιμάστε ξανά.',
  chatEnded: 'Αυτή η συνομιλία έληξε. Στείλτε ένα μήνυμα για να ξεκινήσετε νέα.',
  previousChatEnded: 'Η προηγούμενη συνομιλία έληξε',

  loading: 'Φόρτωση…',
  nothingBookable: 'Δεν υπάρχει τίποτα διαθέσιμο για online κράτηση αυτή τη στιγμή.',
  whatToBook: 'Τι θα θέλατε να κλείσετε;',
  choose: 'Επιλέξτε…',
  previousMonth: 'Προηγούμενος μήνας',
  nextMonth: 'Επόμενος μήνας',
  noFreeDays: 'Δεν υπάρχουν διαθέσιμες ημέρες αυτόν τον μήνα.',
  noFreeTimes: (day) => `Δεν υπάρχουν διαθέσιμες ώρες την ${day}.`,
  requestNote: 'Έτσι στέλνετε ένα αίτημα: η επιχείρηση θα το επιβεβαιώσει.',
  requestThisTime: 'Αίτημα για αυτή την ώρα',
  verifyToBook: 'Επαλήθευση στοιχείων για κράτηση',

  chooseCheckIn: 'Επιλέξτε την ημέρα άφιξης.',
  chooseCheckOut: 'Επιλέξτε τώρα την ημέρα αναχώρησης.',
  changeCheckIn: 'Αλλαγή ημέρας άφιξης',
  stayTimes: (checkIn, checkOut) => `Άφιξη ${checkIn}, αναχώρηση ${checkOut}`,
  nights: (count) => (count === 1 ? '1 νύχτα' : `${count} νύχτες`),
  stayRange: (shortest, longest) =>
    shortest === longest ? `Διαμονή: ${shortest}.` : `Διαμονή: από ${shortest} έως ${longest}.`,
  noStayFrom: (day) => `Καμία διαμονή δεν μπορεί να ξεκινήσει την ${day}. Επιλέξτε άλλη ημέρα.`,
  requestThisStay: 'Αίτημα για αυτή τη διαμονή',
  draftStayTitle: 'Κράτηση αυτής της διαμονής;',

  perNight: '/ νύχτα',
  specialties: {
    GENERAL_PRACTICE: 'Γενική ιατρική',
    FAMILY_MEDICINE: 'Οικογενειακή ιατρική',
    INTERNAL_MEDICINE: 'Παθολογία',
    PEDIATRICS: 'Παιδιατρική',
    OBSTETRICS_GYNECOLOGY: 'Μαιευτική και γυναικολογία',
    DERMATOLOGY: 'Δερματολογία',
    AESTHETIC_MEDICINE: 'Αισθητική ιατρική',
    DENTISTRY: 'Οδοντιατρική',
    ORTHODONTICS: 'Ορθοδοντική',
    OPHTHALMOLOGY: 'Οφθαλμολογία',
    ENT: 'Ωτορινολαρυγγολογία (ΩΡΛ)',
    CARDIOLOGY: 'Καρδιολογία',
    ENDOCRINOLOGY: 'Ενδοκρινολογία',
    GASTROENTEROLOGY: 'Γαστρεντερολογία',
    NEUROLOGY: 'Νευρολογία',
    ORTHOPEDICS: 'Ορθοπαιδική',
    UROLOGY: 'Ουρολογία',
    PSYCHIATRY: 'Ψυχιατρική',
    PSYCHOLOGY: 'Ψυχολογία',
    PHYSIOTHERAPY: 'Φυσικοθεραπεία',
    NUTRITION: 'Διατροφή',
    RADIOLOGY: 'Ακτινολογία',
    OTHER: 'Άλλο',
  },
  draftTitle: 'Κράτηση αυτής της ώρας;',
  no: 'Όχι',
  cancel: 'Ακύρωση',

  summary: {
    title: 'Η κράτησή σας',
    status: {
      PENDING: 'Αναμένει επιβεβαίωση από την επιχείρηση',
      CONFIRMED: 'Επιβεβαιωμένη',
      CANCELLED: 'Ακυρωμένη',
      COMPLETED: 'Ολοκληρωμένη',
    },
    code: 'Κωδικός κράτησης',
    ok: 'OK',
    cancelQuestion: 'Θέλετε σίγουρα να ακυρώσετε την κράτησή σας;',
    yesCancel: 'Ναι, ακύρωση',
    cancelled: 'Η κράτησή σας ακυρώθηκε.',
    notCancellable: 'Αυτή η κράτηση δεν μπορεί πλέον να ακυρωθεί.',
    notFound: 'Η κράτηση δεν βρέθηκε.',
  },

  separator: ', ',
  requestSent: (reservation, code) => `Το αίτημα στάλθηκε: ${reservation} — αναμένει επιβεβαίωση. Κωδικός κράτησης: ${code}`,
  afterBookingFallback:
    'Το αίτημά σας στάλθηκε στην επιχείρηση. Θα ενημερωθείτε μόλις το επιβεβαιώσει. Μπορώ να σας βοηθήσω με κάτι άλλο;',

  employee: 'Υπάλληλος',
  waitingForEmployee: 'Ένας υπάλληλος θα σας απαντήσει εδώ.',
  employeeJoined: 'Ένας υπάλληλος συμμετέχει πλέον στη συνομιλία.',
  backToAssistant: 'Συνομιλείτε ξανά με τον βοηθό.',
}

const languages = { en, fr, es, ru, ar, el } satisfies Record<string, Strings>

export type Language = keyof typeof languages

const rtlLanguages: Language[] = ['ar']

/** Unicode extensions of a language's locale: Greek times on the 24-hour clock ("17:00"). */
const localeExtensions: Partial<Record<Language, string>> = { el: '-u-hc-h23' }

let active: { language: Language; locale: string } = { language: 'en', locale: 'en' }

/**
 * Picks the language: the embedding tag's data-lang if supported, otherwise
 * the browser's preferred languages, otherwise English. The locale keeps the
 * region for date formats ("fr-CA", "ar-AE").
 */
export function setLanguage(requested?: string): void {
  const candidates = [requested, ...(navigator.languages ?? []), navigator.language]
  for (const tag of candidates) {
    const base = tag?.toLowerCase().split('-')[0]
    if (tag && base && base in languages) {
      const locale = Intl.DateTimeFormat.supportedLocalesOf(tag).length > 0 ? tag : base
      active = { language: base as Language, locale: locale + (localeExtensions[base as Language] ?? '') }
      return
    }
  }
  active = { language: 'en', locale: 'en' }
}

/** The texts of the active language. */
export const t = (): Strings => languages[active.language]

export const language = (): Language => active.language

/** For Intl.DateTimeFormat. */
export const locale = (): string => active.locale

export const direction = (): 'ltr' | 'rtl' => (rtlLanguages.includes(active.language) ? 'rtl' : 'ltr')
