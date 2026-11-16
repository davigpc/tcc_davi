export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

export interface CurrentUserPayload {
  id: string;
  email: string;
  username: string;
}
