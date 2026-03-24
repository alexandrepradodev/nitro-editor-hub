import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { CreateUserInput } from "./users.schema";

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

export async function listUsers(): Promise<PublicUser[]> {
  return prisma.user.findMany({
    select: publicUserSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash,
      },
      select: publicUserSelect,
    });
    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Email ja cadastrado");
    }
    throw error;
  }
}
