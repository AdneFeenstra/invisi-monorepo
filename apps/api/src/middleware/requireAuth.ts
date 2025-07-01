// src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("✅ [requireAuth] route hit");
  console.log("👉 Authorization header:", req.headers["authorization"]);
  console.log("👉 Cookie __session:", req.cookies?.["__session"]);

  const headerAuth = req.headers["authorization"];
  const cookieAuth = req.cookies?.["__session"];

  const token = headerAuth?.startsWith("Bearer ")
    ? headerAuth.split(" ")[1]
    : cookieAuth;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    console.log("🟢 About to verify token:", token);
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    req.auth = {
      userId: payload.sub as string,
      email: payload.email as string | undefined,
      token,
    };

    console.log("👉 Payload ontvangen van Clerk:", payload);

    next();
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
