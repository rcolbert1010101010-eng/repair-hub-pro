import { Request, Response, NextFunction } from "express";

export function authStubMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader =
    req.header("Authorization") ||
    req.header("authorization");

  // For now we do NOT enforce real auth.
  // We just parse a bearer token if present and expose a stub user identity.
  let userId = "anonymous";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // In the future we would validate the token and derive a real user id.
    // For now, we treat any bearer token as a generic stub user.
    userId = "stub-user";
  }

  res.locals.userId = userId;

  return next();
}
