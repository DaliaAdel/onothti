export const AccountType = {
  CUSTOMER: "CUSTOMER",
  PROVIDER: "PROVIDER",
  STAFF: "STAFF",
} as const;

export const AccountStatus = {
  INACTIVE: "INACTIVE",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  RESTRICTED: "RESTRICTED",
  SUSPENDED: "SUSPENDED",
  CANCELLED: "CANCELLED",
  DELETED: "DELETED",
} as const;

export const OtpPurpose = {
  REGISTER: "REGISTER",
  LOGIN: "LOGIN",
  LOGIN_NEW_DEVICE: "LOGIN_NEW_DEVICE",
  RESET_PASSWORD: "RESET_PASSWORD",
  FIRST_BROWSER: "FIRST_BROWSER",
} as const;

export const Visibility = {
  HIDDEN: "HIDDEN",
  LIMITED: "LIMITED",
  PUBLIC: "PUBLIC",
} as const;

export const AuthChannel = {
  WEB: "WEB",
  APP: "APP",
} as const;

export const ProfileChangeField = {
  DISPLAY_NAME: "DISPLAY_NAME",
  BIO: "BIO",
  CITY: "CITY",
  WHATSAPP: "WHATSAPP",
  AVATAR: "AVATAR",
  EMAIL: "EMAIL",
} as const;

export const NotificationType = {
  SYSTEM: "SYSTEM",
  PROFILE_VIEW: "PROFILE_VIEW",
  CONTACT: "CONTACT",
} as const;

export const StaffPermission = {
  PROVIDERS_APPROVE: "PROVIDERS_APPROVE",
  CUSTOMERS_REVIEW: "CUSTOMERS_REVIEW",
  ACCOUNTS_ACTION: "ACCOUNTS_ACTION",
  PAYMENTS_REVIEW: "PAYMENTS_REVIEW",
  PAYMENTS_CONFIRM: "PAYMENTS_CONFIRM",
  ESCALATE_FINANCE: "ESCALATE_FINANCE",
  USERS_MANAGE: "USERS_MANAGE",
  SETTINGS_MANAGE: "SETTINGS_MANAGE",
  BROADCAST_ALL: "BROADCAST_ALL",
  BROADCAST_PROVIDER: "BROADCAST_PROVIDER",
  BROADCAST_CUSTOMER: "BROADCAST_CUSTOMER",
  NOTIFY_PROVIDER: "NOTIFY_PROVIDER",
  NOTIFY_CUSTOMER: "NOTIFY_CUSTOMER",
  REPORTS_VIEW: "REPORTS_VIEW",
  TICKETS_MANAGE: "TICKETS_MANAGE",
  RATINGS_REVIEW: "RATINGS_REVIEW",
  MEDIA_REVIEW: "MEDIA_REVIEW",
  PACKAGES_MANAGE: "PACKAGES_MANAGE",
  GEO_MANAGE: "GEO_MANAGE",
  LEGAL_MANAGE: "LEGAL_MANAGE",
  CATALOG_MANAGE: "CATALOG_MANAGE",
  CAT_01: "CAT-01",
  CAT_02: "CAT-02",
  ACC_01: "ACC-01",
  ACC_02: "ACC-02",
  ACC_03: "ACC-03",
  ACC_04: "ACC-04",
  ACC_05: "ACC-05",
  ACC_06: "ACC-06",
  ACC_07: "ACC-07",
  ACC_08: "ACC-08",
  ACC_09: "ACC-09",
  ACC_10: "ACC-10",
  ACC_11: "ACC-11",
  ACC_12: "ACC-12",
  ACC_13: "ACC-13",
  ACC_14: "ACC-14",
  ACC_15: "ACC-15",
  ACC_16: "ACC-16",
  ACC_18: "ACC-18",
  ACC_19: "ACC-19",
  ACC_20: "ACC-20",
  PRO_01: "PRO-01",
  PRO_02: "PRO-02",
  PRO_03: "PRO-03",
  PRO_05: "PRO-05",
  PRO_06: "PRO-06",
  PRO_07: "PRO-07",
  PRO_08: "PRO-08",
  PRO_09: "PRO-09",
  PRO_10: "PRO-10",
  USR_01: "USR-01",
  USR_04: "USR-04",
  USR_05: "USR-05",
  USR_06: "USR-06",
  PKG_01: "PKG-01",
  PKG_02: "PKG-02",
  PKG_03: "PKG-03",
  PKG_04: "PKG-04",
  PKG_05: "PKG-05",
  FIN_01: "FIN-01",
  FIN_02: "FIN-02",
  FIN_03: "FIN-03",
  FIN_04: "FIN-04",
  FIN_05: "FIN-05",
  FIN_06: "FIN-06",
  RAT_01: "RAT-01",
  RAT_02: "RAT-02",
  RAT_03: "RAT-03",
  RAT_05: "RAT-05",
  TKT_01: "TKT-01",
  TKT_02: "TKT-02",
  TKT_03: "TKT-03",
  NOT_01: "NOT-01",
  NOT_02: "NOT-02",
  NOT_03: "NOT-03",
  NOT_04: "NOT-04",
  REP_01: "REP-01",
  REP_02: "REP-02",
  REP_03: "REP-03",
  REP_04: "REP-04",
  REP_05: "REP-05",
  REP_06: "REP-06",
  SEC_01: "SEC-01",
} as const;

export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType];
export type AccountStatusValue = (typeof AccountStatus)[keyof typeof AccountStatus];
export type OtpPurposeValue = (typeof OtpPurpose)[keyof typeof OtpPurpose];
export type AuthChannelValue = (typeof AuthChannel)[keyof typeof AuthChannel];
