import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { LoginInput } from "./auth.schema";

export async function loginUser(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Credenciais invalidas");
  }

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new Error("Credenciais invalidas");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    throw new Error("Usuario nao encontrado");
  }

  return user;
}
