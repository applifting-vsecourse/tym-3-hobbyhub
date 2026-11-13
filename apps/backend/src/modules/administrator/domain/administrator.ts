// #238: an administrator as the administration lists them (ADR-0010).
export type AdministratorListItem = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};
