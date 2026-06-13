import type { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function requireUser(req: Request, res: Response): string | null {
  const userId = req.headers["x-replit-user-id"] as string | undefined;
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
  req.userId = (req.headers["x-replit-user-id"] as string) || undefined;
  next();
}
