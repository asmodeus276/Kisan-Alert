import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabaseClient.ts";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    if (!supabase) {
      // In sandbox/development mock mode when Supabase is not configured, automatically authorize as an expert user
      req.user = {
        uid: "demo-expert-user-uid",
        email: "demo-expert@example.com",
      };
      return next();
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error("Error verifying Supabase token:", error);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.user = {
      uid: user.id,
      email: user.email,
    };
    next();
  } catch (error) {
    console.error("Error verifying Supabase token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
