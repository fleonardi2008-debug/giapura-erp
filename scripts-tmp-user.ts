import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./src/lib/db";

async function main() {
  const passwordHash = await bcrypt.hash("verify-temp-123", 10);
  await prisma.user.upsert({
    where: { email: "verify-temp@giapura.com" },
    update: { passwordHash, activo: true },
    create: { email: "verify-temp@giapura.com", nombre: "Verificación temporal", passwordHash, role: "OWNER" },
  });
  console.log("ok");
}
main().then(() => process.exit(0));
