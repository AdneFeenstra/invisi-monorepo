// src/middleware/requireAuth.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import { extractUser } from "../utils/verify";

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.auth = user;
    next();
  } catch (err) {
    console.error("❌ Auth error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
