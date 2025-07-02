import { Request, Response, NextFunction } from "express";

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRole = req.auth.role;

    if (!allowedRoles.includes(userRole)) {
      console.warn(
        `[RBAC] Access denied for user ${req.auth.userId} with role ${userRole}`
      );
      return res.status(403).json({
        error: "Insufficient role permissions",
        requiredRoles: allowedRoles,
        yourRole: userRole,
      });
    }

    next();
  };
}
