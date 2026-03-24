import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AuthPayload = {
  sub: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token ausente" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown;

    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({ message: "Token invalido" });
    }

    const maybePayload = decoded as Partial<AuthPayload>;
    if (typeof maybePayload.sub !== "string") {
      return res.status(401).json({ message: "Token invalido" });
    }

    // Compatibilidade: alguns tokens antigos podem não ter `email`.
    // Para autenticação e autorização aqui, precisamos do `sub`.
    req.user = {
      sub: maybePayload.sub,
      email: typeof maybePayload.email === "string" ? maybePayload.email : "",
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token invalido" });
  }
}
