import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const companyId = process.env.SEED_COMPANY_ID || "evolusis";
const companyName = process.env.SEED_COMPANY_NAME || "Evolusis";
const adminEmail = process.env.SEED_ADMIN_EMAIL || "jumana@evolusis.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "jumana@evolusis.com";
const firstName = process.env.SEED_ADMIN_FIRST_NAME || "Jumana";
const lastName = process.env.SEED_ADMIN_LAST_NAME || "Admin";

async function main() {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.company.upsert({
    where: { id: companyId },
    update: { name: companyName, domain: "evolusis.com" },
    create: {
      id: companyId,
      name: companyName,
      domain: "evolusis.com",
      timezone: "Asia/Kolkata",
      currency: "INR"
    }
  });

  const user = await prisma.user.upsert({
    where: { companyId_email: { companyId, email: adminEmail } },
    update: {
      firstName,
      lastName,
      role: Role.SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
      passwordHash
    },
    create: {
      companyId,
      email: adminEmail,
      passwordHash,
      role: Role.SUPER_ADMIN,
      firstName,
      lastName,
      isActive: true,
      isEmailVerified: true
    }
  });

  await prisma.rolePermission.upsert({
    where: { userId_permission: { userId: user.id, permission: "*" } },
    update: {},
    create: { userId: user.id, permission: "*" }
  });

  console.log("Seed complete:");
  console.log(JSON.stringify({ companyId, email: adminEmail, role: "SUPER_ADMIN" }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
