import { Request, Response } from "express";
import { loginSchema } from "./auth.schema";
import { getMe, loginUser } from "./auth.service";

export async function loginController(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  try {
    const result = await loginUser(input);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Credenciais invalidas") {
      return res.status(401).json({ message: "Credenciais invalidas" });
    }
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export async function meController(req: Request, res: Response) {
  if (!req.user?.sub) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  try {
    const user = await getMe(req.user.sub);
    return res.status(200).json(user);
  } catch (_error) {
    return res.status(404).json({ message: "Usuario nao encontrado" });
  }
}
