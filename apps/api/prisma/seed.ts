// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.invoice.createMany({
    data: [
      { id: "INV-001", client: "ACME Corp", amount: 1200, status: "unpaid" },
      { id: "INV-002", client: "Globex", amount: 600, status: "paid" },
      { id: "INV-003", client: "Initech", amount: 450, status: "overdue" },
    ],
  });
}

main()
  .then(() => {
    console.log("✅ Seeded test invoices.");
  })
  .catch((e) => {
    console.error("❌ Seeding error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
