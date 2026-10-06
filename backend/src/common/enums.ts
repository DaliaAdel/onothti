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
  PAYMENTS_REVIEW: "PAYMENTS_REVIEW",
  PAYMENTS_CONFIRM: "PAYMENTS_CONFIRM",
  USERS_MANAGE: "USERS_MANAGE",
  SETTINGS_MANAGE: "SETTINGS_MANAGE",
  REPORTS_VIEW: "REPORTS_VIEW",
  TICKETS_MANAGE: "TICKETS_MANAGE",
  RATINGS_REVIEW: "RATINGS_REVIEW",
  MEDIA_REVIEW: "MEDIA_REVIEW",
  PACKAGES_MANAGE: "PACKAGES_MANAGE",
  GEO_MANAGE: "GEO_MANAGE",
  LEGAL_MANAGE: "LEGAL_MANAGE",
  CATALOG_MANAGE: "CATALOG_MANAGE",
} as const;

export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType];
export type AccountStatusValue = (typeof AccountStatus)[keyof typeof AccountStatus];
export type OtpPurposeValue = (typeof OtpPurpose)[keyof typeof OtpPurpose];
export type AuthChannelValue = (typeof AuthChannel)[keyof typeof AuthChannel];
