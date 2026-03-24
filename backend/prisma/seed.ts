import bcrypt from "bcryptjs";
import { PrismaClient, DeliveryType, AdCreativeMediaType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@nitrohub.local" },
    update: { name: "Administrador", passwordHash },
    create: {
      email: "admin@nitrohub.local",
      name: "Administrador",
      passwordHash,
    },
  });

  const editors = [
    {
      name: "Alexandre",
      initials: "AX",
      role: "Pleno 02",
      colorClass: "c-cyan",
      salaryFixed: 2750,
      productionType: "VSL",
    },
    {
      name: "Boturi",
      initials: "BT",
      role: "Pleno 02",
      colorClass: "c-violet",
      salaryFixed: 2750,
      productionType: "VSL",
    },
    {
      name: "Cris",
      initials: "CR",
      role: "Pleno 01",
      colorClass: "c-yellow",
      salaryFixed: 2500,
      productionType: "Criativos",
    },
    {
      name: "Douglas",
      initials: "DG",
      role: "Pleno 01",
      colorClass: "c-orange",
      salaryFixed: 2500,
      productionType: "Criativos",
    },
    {
      name: "Lucas",
      initials: "LC",
      role: "Pleno 03",
      colorClass: "c-green",
      salaryFixed: 3000,
      productionType: "VSL + Criativos",
    },
  ];

  for (const editor of editors) {
    await prisma.editor.upsert({
      where: { initials: editor.initials },
      update: editor,
      create: editor,
    });
  }

  const rates = [
    { type: DeliveryType.VSL, baseValue: 33000 },
    { type: DeliveryType.Lead, baseValue: 19000 },
    { type: DeliveryType.ML, baseValue: 16000 },
    { type: DeliveryType.Troca, baseValue: 18000 },
    { type: DeliveryType.Upsell, baseValue: 14000 },
  ];

  for (const rate of rates) {
    await prisma.deliveryRate.upsert({
      where: { type: rate.type },
      update: { baseValue: rate.baseValue },
      create: rate,
    });
  }

  const creativeRates = [
    { mediaType: AdCreativeMediaType.Video, baseValue: 300 },
    { mediaType: AdCreativeMediaType.Image, baseValue: 300 },
  ];

  for (const rate of creativeRates) {
    await prisma.adCreativeRate.upsert({
      where: { mediaType: rate.mediaType },
      update: { baseValue: rate.baseValue },
      create: rate,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
