export type Locale = "en" | "mr" | "hi";

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
  intlLocale: string;
  flag: string;
}

export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    intlLocale: "en-IN",
    flag: "🇬🇧",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    intlLocale: "mr-IN",
    flag: "🇮🇳",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिंदी",
    intlLocale: "hi-IN",
    flag: "🇮🇳",
  },
] as const;

export const DEFAULT_LOCALE: Locale = "en";

export interface TranslationDictionary {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    back: string;
    search: string;
    filter: string;
    actions: string;
    status: string;
    submit: string;
    close: string;
    reopen: string;
    loading: string;
    error: string;
    success: string;
    viewDetails: string;
    confirm: string;
    all: string;
    none: string;
    yes: string;
    no: string;
    total: string;
    active: string;
    pending: string;
    completed: string;
    overview: string;
    refresh: string;
  };
  nav: {
    dashboard: string;
    home: string;
    dues: string;
    family: string;
    visitors: string;
    gatePasses: string;
    complaints: string;
    amenities: string;
    events: string;
    polls: string;
    notices: string;
    documents: string;
    community: string;
    societyInfo: string;
    accounting: string;
    finance: string;
    settings: string;
    logout: string;
    profile: string;
    helpdesk: string;
    admin: string;
    language: string;
  };
  complaints: {
    title: string;
    raiseTicket: string;
    ticketDetails: string;
    subject: string;
    description: string;
    category: string;
    subcategory: string;
    priority: string;
    slaStatus: string;
    assignedTo: string;
    unassigned: string;
    onHoldReason: string;
    resolutionNotes: string;
    closureReason: string;
    dueIn: string;
    overdue: string;
    timeline: string;
    onTrack: string;
    dueSoon: string;
    breached: string;
    paused: string;
    reopenTicket: string;
    confirmClose: string;
    cycle: string;
    emergency: string;
    high: string;
    medium: string;
    low: string;
    critical: string;
  };
  billing: {
    invoices: string;
    receipts: string;
    amount: string;
    dueDate: string;
    paymentStatus: string;
    paid: string;
    unpaid: string;
    partiallyPaid: string;
    overdue: string;
    payNow: string;
    generateInvoice: string;
    recordPayment: string;
    breakup: string;
  };
  events: {
    eventsAndPolls: string;
    upcomingEvents: string;
    activePolls: string;
    rsvp: string;
    going: string;
    notGoing: string;
    maybe: string;
    capacity: string;
    spotsRemaining: string;
    vote: string;
    castVote: string;
    alreadyVoted: string;
    viewResults: string;
    anonymous: string;
  };
  validation: {
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    minLength: string;
    maxLength: string;
    invalidNumber: string;
  };
  notifications: {
    notifications: string;
    markAllRead: string;
    noNotifications: string;
    earlier: string;
    today: string;
  };
}

