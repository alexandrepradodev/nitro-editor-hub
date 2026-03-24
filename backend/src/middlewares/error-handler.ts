import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Payload invalido",
      issues: error.issues,
    });
  }

  if (error instanceof Error) {
    const isProd = process.env.NODE_ENV === "production";
    return res.status(500).json({
      message: isProd ? "Erro interno" : error.message,
    });
  }

  return res.status(500).json({
    message: "Erro interno",
  });
}
