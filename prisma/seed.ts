import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "admin@giapura.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "cambiar123";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nombre: "Admin",
      passwordHash,
      role: "OWNER",
    },
  });

  console.log(`Usuario OWNER listo: ${user.email}`);
  if (!process.env.SEED_OWNER_PASSWORD) {
    console.log(`Contraseña por defecto: ${password} (cambiala después de entrar)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
