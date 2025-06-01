// prisma/seed.ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Verwijder eerst bestaande data
  await prisma.timeEntry.deleteMany();
  await prisma.invoice.deleteMany();

  // Voeg testfacturen toe
  const invoice1 = await prisma.invoice.create({
    data: {
      id: "INV-001",
      client: "ACME Corp",
      amount: 1200,
      status: "unpaid",
    },
  });

  await prisma.invoice.createMany({
    data: [
      { id: "INV-002", client: "Globex", amount: 600, status: "paid" },
      { id: "INV-003", client: "Initech", amount: 450, status: "overdue" },
    ],
  });

  // Voeg gekoppelde en ongekoppelde tijdsregels toe
  await prisma.timeEntry.createMany({
    data: [
      {
        description: "Strategic workshop with client",
        duration: 3.5,
        date: new Date("2025-05-01"),
        invoiceId: invoice1.id, // gekoppeld
      },
      {
        description: "Backend API development",
        duration: 5,
        date: new Date("2025-05-03"),
        invoiceId: null, // nog niet gefactureerd
      },
      {
        description: "Weekly alignment call",
        duration: 1,
        date: new Date("2025-05-04"),
        invoiceId: null, // nog niet gefactureerd
      },
    ],
  });

  console.log("✅ Test invoices and time entries seeded.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
