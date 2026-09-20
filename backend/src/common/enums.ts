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
  LOGIN_NEW_DEVICE: "LOGIN_NEW_DEVICE",
  RESET_PASSWORD: "RESET_PASSWORD",
  FIRST_BROWSER: "FIRST_BROWSER",
} as const;

export const Visibility = {
  HIDDEN: "HIDDEN",
  LIMITED: "LIMITED",
  PUBLIC: "PUBLIC",
} as const;

export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType];
export type AccountStatusValue = (typeof AccountStatus)[keyof typeof AccountStatus];
export type OtpPurposeValue = (typeof OtpPurpose)[keyof typeof OtpPurpose];
