import { Request, Response, NextFunction } from "express";

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow health checks to bypass tenant enforcement
  if (req.path === "/api/v1/health") {
    return next();
  }

  const tenantId =
    req.header("X-Tenant-Id") ||
    req.header("x-tenant-id");

  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({
      error: "X-Tenant-Id header is required"
    });
  }

  // Store tenantId in res.locals so downstream handlers can access it
  res.locals.tenantId = tenantId;

  return next();
}
