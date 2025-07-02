// src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";

type ClerkTokenPayload = {
  sub: string;
  email?: string;
  publicMetadata?: {
    role?: string;
  };
  [key: string]: any;
};

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
    const payload = (await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })) as ClerkTokenPayload;

    console.log("✅ PAYLOAD IN VERIFY:", payload);
    console.log("✅ Clerk role claim in token:", payload.role);
    console.log("👉 RAW payload ontvangen van Clerk:");
    console.log(JSON.stringify(payload, null, 2));

    const role = payload?.publicMetadata?.role || payload?.role;

    if (!role) {
      console.warn("❌ No role in token!");
      return res.status(403).json({ error: "No role assigned in token" });
    }

    console.log("✅ Using role:", role);

    req.auth = {
      userId: payload.sub as string,
      email: payload.email as string | undefined,
      role,
      token,
    };

    console.log("✅ req.auth.role is:", role);

    console.log(
      "👉 Payload ontvangen van Clerk:",
      JSON.stringify(payload, null, 2)
    );

    next();
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
