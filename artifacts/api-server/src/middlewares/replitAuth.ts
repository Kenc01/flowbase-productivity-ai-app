import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function requireUser(req: Request, res: Response): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

export function replitAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { userId } = getAuth(req);
  req.userId = userId ?? undefined;
  next();
}
