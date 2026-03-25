import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_EMAIL = "alexandre.prado@nitrocompany.co";
const DEFAULT_PASSWORD = "@#Nitro2026";
const DEFAULT_NAME = "Alexandre Prado";

async function main() {
  const email = process.env.USER_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.USER_PASSWORD ?? DEFAULT_PASSWORD;
  const name = process.env.USER_NAME ?? DEFAULT_NAME;

  if (!email) throw new Error("USER_EMAIL não definido");
  if (!password) throw new Error("USER_PASSWORD não definido");
  if (!name) throw new Error("USER_NAME não definido");

  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert para não apagar outros dados do banco; apenas garante o usuário desejado.
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Falha ao criar/atualizar usuário.");

  console.log(`OK: usuário ${email} pronto (id=${user.id}).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

