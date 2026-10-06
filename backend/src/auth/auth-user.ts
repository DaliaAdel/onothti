export type AuthUser = {
  sub: string;
  accountType: string;
  status: string;
  permissions?: string[];
  roleCode?: string;
};
