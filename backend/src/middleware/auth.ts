import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../utils/prisma";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "patient" | "agent" | "admin";
  fullName: string;
  isBanned: boolean;
  language: string;
  agentId?: string;
  agentStatus?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    console.log("TOKEN LENGTH:", token.length);
    console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
    console.log("ANON_KEY EXISTS:", !!process.env.SUPABASE_ANON_KEY);

    const { data, error } = await supabaseAuthClient.auth.getUser(token);
    console.log("AUTH ERROR:", JSON.stringify(error));
    console.log("AUTH USER:", data?.user?.id);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: { deliveryAgent: true },
    });

    if (!dbUser) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (dbUser.isBanned) {
      return res
        .status(403)
        .json({ error: "Your account has been banned. Contact support." });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      fullName: dbUser.fullName,
      isBanned: dbUser.isBanned,
      language: dbUser.language,
      agentId: dbUser.deliveryAgent?.id,
      agentStatus: dbUser.deliveryAgent?.status,
    };

    next();
  } catch (err: any) {
    console.error("Authentication error:", err.message);
    return res.status(500).json({ error: "Authentication failed" });
  }
}
