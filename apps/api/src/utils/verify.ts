import { verifyToken } from "@clerk/backend";
import { Request } from "express";

type ClerkPayload = {
  sub: string;
  email?: string;
  [key: string]: any;
};

export async function extractUser(req: Request) {
  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies["__session"];
  if (!token) throw new Error("No token provided");

  const result = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  const payload = result.payload as ClerkPayload;

  return {
    userId: payload.sub,
    email: payload.email,
    token,
  };
}
