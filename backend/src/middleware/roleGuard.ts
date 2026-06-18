// middleware/roleGuard.ts
import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser } from "./auth";

export function roleGuard(...allowedRoles: AuthenticatedUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to access this resource" });
    }

    next();
  };
}

export function approvedAgentOnly(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "agent") {
    return res
      .status(403)
      .json({ error: "Only delivery agents can access this resource" });
  }

  if (req.user.agentStatus !== "approved") {
    return res.status(403).json({
      error:
        req.user.agentStatus === "pending"
          ? "Your agent account is pending admin approval"
          : "Your agent account is not approved to perform this action",
    });
  }

  next();
}
