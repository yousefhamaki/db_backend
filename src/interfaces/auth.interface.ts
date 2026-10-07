/** What the existing `authenticate` middleware puts on `req.user` (from the access token). */
export interface AuthenticatedUser {
  userId: number;
  userName: string;
}
