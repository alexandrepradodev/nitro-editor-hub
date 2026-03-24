import { Request, Response } from "express";
import { createUserSchema } from "./users.schema";
import { createUser, listUsers } from "./users.service";

export async function listUsersController(_req: Request, res: Response) {
  const data = await listUsers();
  return res.status(200).json(data);
}

export async function createUserController(req: Request, res: Response) {
  const payload = createUserSchema.parse(req.body);

  try {
    const created = await createUser(payload);
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar usuario";
    if (message === "Email ja cadastrado") {
      return res.status(409).json({ message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
}
