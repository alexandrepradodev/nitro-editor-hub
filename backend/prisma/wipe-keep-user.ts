/**
 * Apaga todos os dados do banco exceto o usuário com KEEP_USER_EMAIL.
 * Uso (produção/local): WIPE_DB_CONFIRM=yes npx tsx prisma/wipe-keep-user.ts
 */
import { PrismaClient } from "@prisma/client";

const KEEP_EMAIL = "alexandre.prado@nitrocompany.co";

const prisma = new PrismaClient();

async function main() {
  if (process.env.WIPE_DB_CONFIRM !== "yes") {
    console.error("Abortado: defina WIPE_DB_CONFIRM=yes para confirmar a exclusão em massa.");
    process.exit(1);
  }

  const keep = await prisma.user.findUnique({ where: { email: KEEP_EMAIL } });
  if (!keep) {
    console.error(`Abortado: usuário ${KEEP_EMAIL} não existe. Crie-o antes (ex.: seed com SEED_ALEX_PASSWORD).`);
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.qualityBatchItem.deleteMany();
    await tx.qualityBatch.deleteMany();
    await tx.qualityReview.deleteMany();
    await tx.adCreative.deleteMany();
    await tx.deliveryEditor.deleteMany();
    await tx.delivery.deleteMany();
    await tx.closingEditorSnapshot.deleteMany();
    await tx.closingPeriod.deleteMany();
    await tx.editor.deleteMany();
    await tx.deliveryRate.deleteMany();
    await tx.adCreativeRate.deleteMany();
    await tx.user.deleteMany({ where: { email: { not: KEEP_EMAIL } } });
  });

  const remainingUsers = await prisma.user.count();
  console.log(`Concluído. Usuários restantes: ${remainingUsers} (esperado: 1, ${KEEP_EMAIL}).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
