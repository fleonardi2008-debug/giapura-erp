import "dotenv/config";
import { prisma } from "./src/lib/db";
prisma.planTareaProgreso.findMany().then((r) => { console.log(JSON.stringify(r)); process.exit(0); });
