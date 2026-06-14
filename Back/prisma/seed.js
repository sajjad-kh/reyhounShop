const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Abcd@1234", 10);

  await prisma.user.upsert({
    where: { email: "user@test.com" },
    update: { password: hash, name: "کاربر تستی", role: "USER" },
    create: {
      email: "user@test.com",
      name: "کاربر تستی",
      password: hash,
      role: "USER"
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { password: hash, name: "مدیر سیستم", role: "ADMIN" },
    create: {
      email: "admin@test.com",
      name: "مدیر سیستم",
      password: hash,
      role: "ADMIN"
    }
  });

  console.log("seed done");
}

main()
  .finally(() => prisma.$disconnect());