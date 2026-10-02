import type { Channel, ReservationStatus } from './api'

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

  contactIntro: string
  firstName: string
  lastName: string
  email: string
  phone: string
  continue: string
  backToChatLink: string
  /** "Enter the code we sent to your email address" (where it was sent is appended in brackets). */
  verifyIntro: (channel: Channel) => string
  code: string
  confirm: string
  changeMyDetails: string
  /** Replaces the assistant's reply when the anonymous message limit is reached. */
  contactLimit: string

  chatUnavailable: string
  tooManyRequestsIn: (seconds: number) => string
  tooManyRequests: string
  connectionError: string
  chatEnded: string
  /** The one line kept from the previous conversation when a new one starts. */
  previousChatEnded: string

  newBooking: string
  myReservations: string
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
  verifyToSeeReservations: string
  noUpcoming: string
  cancelQuestion: string
  yesCancel: string
  no: string
  cancel: string
  status: Record<ReservationStatus, string>

  /** Separates the resource from the date in "Dr Lina, Fri 2 Oct 09:00–09:30". */
  separator: string
  requestSent: (reservation: string) => string
  cancelled: (reservation: string) => string
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

  contactIntro: 'Leave your details so we can identify you. We will send you codes to confirm them.',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  continue: 'Continue',
  backToChatLink: 'Back to chat',
  verifyIntro: (channel) =>
    `Enter the code we sent to your ${channel === 'EMAIL' ? 'email address' : 'phone'}`,
  code: 'Code',
  confirm: 'Confirm',
  changeMyDetails: 'Change my details',
  contactLimit:
    'To continue, please fill in your details in the form below. You will receive a verification code by email and by SMS.',

  chatUnavailable: 'Chat is currently unavailable. Please try again later.',
  tooManyRequestsIn: (seconds) => `Too many requests. Please try again in ${seconds} seconds.`,
  tooManyRequests: 'Too many requests. Please try again in a moment.',
  connectionError: 'Could not reach the chat. Please check your connection and try again.',
  chatEnded: 'This chat has ended. Send a message to start a new one.',
  previousChatEnded: 'Previous conversation ended',

  newBooking: 'New booking',
  myReservations: 'My reservations',
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
  verifyToSeeReservations: 'Verify your details to see your reservations.',
  noUpcoming: 'No upcoming reservations.',
  cancelQuestion: 'Cancel this reservation?',
  yesCancel: 'Yes, cancel',
  no: 'No',
  cancel: 'Cancel',
  status: {
    PENDING: 'Awaiting confirmation',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
  },

  separator: ', ',
  requestSent: (reservation) => `Request sent: ${reservation} — awaiting confirmation.`,
  cancelled: (reservation) => `Cancelled: ${reservation}.`,
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
    'Indiquez vos coordonnées pour que nous puissions vous identifier. Nous vous enverrons des codes pour les confirmer.',
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  continue: 'Continuer',
  backToChatLink: 'Retour au chat',
  verifyIntro: (channel) =>
    `Saisissez le code envoyé ${channel === 'EMAIL' ? 'à votre adresse e-mail' : 'sur votre téléphone'}`,
  code: 'Code',
  confirm: 'Confirmer',
  changeMyDetails: 'Modifier mes coordonnées',
  contactLimit:
    'Pour continuer, veuillez remplir vos coordonnées dans le formulaire ci-dessous. Vous recevrez un code de vérification par e-mail et par SMS.',

  chatUnavailable: 'Le chat est momentanément indisponible. Veuillez réessayer plus tard.',
  tooManyRequestsIn: (seconds) => `Trop de demandes. Veuillez réessayer dans ${seconds} secondes.`,
  tooManyRequests: 'Trop de demandes. Veuillez réessayer dans un instant.',
  connectionError: 'Impossible de joindre le chat. Vérifiez votre connexion et réessayez.',
  chatEnded: 'Cette conversation est terminée. Envoyez un message pour en commencer une nouvelle.',
  previousChatEnded: 'Conversation précédente terminée',

  newBooking: 'Nouvelle réservation',
  myReservations: 'Mes réservations',
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
  verifyToSeeReservations: 'Vérifiez vos coordonnées pour voir vos réservations.',
  noUpcoming: 'Aucune réservation à venir.',
  cancelQuestion: 'Annuler cette réservation ?',
  yesCancel: 'Oui, annuler',
  no: 'Non',
  cancel: 'Annuler',
  status: {
    PENDING: 'En attente de confirmation',
    CONFIRMED: 'Confirmée',
    CANCELLED: 'Annulée',
    COMPLETED: 'Terminée',
  },

  separator: ', ',
  requestSent: (reservation) => `Demande envoyée : ${reservation} — en attente de confirmation.`,
  cancelled: (reservation) => `Annulée : ${reservation}.`,
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

  contactIntro: 'Déjanos tus datos para que podamos identificarte. Te enviaremos códigos para confirmarlos.',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  continue: 'Continuar',
  backToChatLink: 'Volver al chat',
  verifyIntro: (channel) =>
    `Introduce el código que enviamos a tu ${channel === 'EMAIL' ? 'correo electrónico' : 'teléfono'}`,
  code: 'Código',
  confirm: 'Confirmar',
  changeMyDetails: 'Cambiar mis datos',
  contactLimit:
    'Para continuar, completa tus datos en el formulario de abajo. Recibirás un código de verificación por correo electrónico y por SMS.',

  chatUnavailable: 'El chat no está disponible en este momento. Inténtalo de nuevo más tarde.',
  tooManyRequestsIn: (seconds) => `Demasiadas solicitudes. Inténtalo de nuevo en ${seconds} segundos.`,
  tooManyRequests: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.',
  connectionError: 'No se pudo conectar con el chat. Comprueba tu conexión e inténtalo de nuevo.',
  chatEnded: 'Este chat ha terminado. Envía un mensaje para empezar uno nuevo.',
  previousChatEnded: 'Conversación anterior finalizada',

  newBooking: 'Nueva reserva',
  myReservations: 'Mis reservas',
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
  verifyToSeeReservations: 'Verifica tus datos para ver tus reservas.',
  noUpcoming: 'No tienes reservas próximas.',
  cancelQuestion: '¿Cancelar esta reserva?',
  yesCancel: 'Sí, cancelar',
  no: 'No',
  cancel: 'Cancelar',
  status: {
    PENDING: 'Pendiente de confirmación',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    COMPLETED: 'Completada',
  },

  separator: ', ',
  requestSent: (reservation) => `Solicitud enviada: ${reservation} — pendiente de confirmación.`,
  cancelled: (reservation) => `Cancelada: ${reservation}.`,
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
    'Оставьте свои данные, чтобы мы могли вас идентифицировать. Мы отправим вам коды для их подтверждения.',
  firstName: 'Имя',
  lastName: 'Фамилия',
  email: 'Эл. почта',
  phone: 'Телефон',
  continue: 'Продолжить',
  backToChatLink: 'Вернуться в чат',
  verifyIntro: (channel) =>
    `Введите код, отправленный ${channel === 'EMAIL' ? 'на вашу электронную почту' : 'на ваш телефон'}`,
  code: 'Код',
  confirm: 'Подтвердить',
  changeMyDetails: 'Изменить мои данные',
  contactLimit:
    'Чтобы продолжить, заполните свои данные в форме ниже. Вы получите код подтверждения по электронной почте и по SMS.',

  chatUnavailable: 'Чат временно недоступен. Повторите попытку позже.',
  // "с" avoids the Russian plural forms of "seconds".
  tooManyRequestsIn: (seconds) => `Слишком много запросов. Повторите попытку через ${seconds} с.`,
  tooManyRequests: 'Слишком много запросов. Повторите попытку чуть позже.',
  connectionError: 'Не удалось подключиться к чату. Проверьте соединение и повторите попытку.',
  chatEnded: 'Этот чат завершён. Отправьте сообщение, чтобы начать новый.',
  previousChatEnded: 'Предыдущий разговор завершён',

  newBooking: 'Новое бронирование',
  myReservations: 'Мои бронирования',
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
  verifyToSeeReservations: 'Подтвердите свои данные, чтобы увидеть бронирования.',
  noUpcoming: 'Нет предстоящих бронирований.',
  cancelQuestion: 'Отменить это бронирование?',
  yesCancel: 'Да, отменить',
  no: 'Нет',
  cancel: 'Отменить',
  status: {
    PENDING: 'Ожидает подтверждения',
    CONFIRMED: 'Подтверждено',
    CANCELLED: 'Отменено',
    COMPLETED: 'Завершено',
  },

  separator: ', ',
  requestSent: (reservation) => `Запрос отправлен: ${reservation} — ожидает подтверждения.`,
  cancelled: (reservation) => `Отменено: ${reservation}.`,
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

  contactIntro: 'اترك بياناتك حتى نتمكن من التعرّف عليك. سنرسل إليك رموزًا لتأكيدها.',
  firstName: 'الاسم الأول',
  lastName: 'اسم العائلة',
  email: 'البريد الإلكتروني',
  phone: 'الهاتف',
  continue: 'متابعة',
  backToChatLink: 'العودة إلى المحادثة',
  verifyIntro: (channel) =>
    `أدخل الرمز الذي أرسلناه إلى ${channel === 'EMAIL' ? 'بريدك الإلكتروني' : 'هاتفك'}`,
  code: 'الرمز',
  confirm: 'تأكيد',
  changeMyDetails: 'تعديل بياناتي',
  contactLimit:
    'للمتابعة، يُرجى إدخال بياناتك في النموذج أدناه. ستتلقى رمز تحقق عبر البريد الإلكتروني وعبر رسالة نصية قصيرة.',

  chatUnavailable: 'المحادثة غير متاحة حاليًا. يُرجى المحاولة لاحقًا.',
  tooManyRequestsIn: (seconds) => `طلبات كثيرة جدًا. يُرجى المحاولة مرة أخرى بعد ${seconds} ثانية.`,
  tooManyRequests: 'طلبات كثيرة جدًا. يُرجى المحاولة مرة أخرى بعد قليل.',
  connectionError: 'تعذّر الاتصال بالمحادثة. يُرجى التحقق من اتصالك والمحاولة مرة أخرى.',
  chatEnded: 'انتهت هذه المحادثة. أرسل رسالة لبدء محادثة جديدة.',
  previousChatEnded: 'انتهت المحادثة السابقة',

  newBooking: 'حجز جديد',
  myReservations: 'حجوزاتي',
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
  verifyToSeeReservations: 'أكّد بياناتك لعرض حجوزاتك.',
  noUpcoming: 'لا توجد حجوزات قادمة.',
  cancelQuestion: 'هل تريد إلغاء هذا الحجز؟',
  yesCancel: 'نعم، ألغِ الحجز',
  no: 'لا',
  cancel: 'إلغاء',
  status: {
    PENDING: 'بانتظار التأكيد',
    CONFIRMED: 'مؤكَّد',
    CANCELLED: 'ملغى',
    COMPLETED: 'مكتمل',
  },

  separator: '، ',
  requestSent: (reservation) => `تم إرسال الطلب: ${reservation} — بانتظار التأكيد.`,
  cancelled: (reservation) => `تم الإلغاء: ${reservation}.`,
  afterBookingFallback:
    'تم إرسال طلبك إلى المنشأة. سنُعلمك فور تأكيده. هل هناك أي شيء آخر يمكنني مساعدتك به؟',

  employee: 'موظف',
  waitingForEmployee: 'سيرد عليك أحد الموظفين هنا.',
  employeeJoined: 'انضم أحد الموظفين إلى المحادثة.',
  backToAssistant: 'أنت تتحدث مع المساعد مرة أخرى.',
}

const languages = { en, fr, es, ru, ar } satisfies Record<string, Strings>

export type Language = keyof typeof languages

const rtlLanguages: Language[] = ['ar']

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
      active = { language: base as Language, locale }
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
