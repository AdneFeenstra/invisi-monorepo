import express from "express";
import { PrismaClient } from "@prisma/client"; // ✅ Prisma import

const app = express();
const port = 4000;

const prisma = new PrismaClient(); // ✅ Prisma instance

app.get("/", (_req, res) => {
  res.send("🏠 Welcome to InvisiBilled API");
});

app.get("/health", (_req, res) => {
  res.send("✅ API is healthy");
});

app.get("/invoices", async (_req, res) => {
  try {
    const invoices = await prisma.invoice.findMany();
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/time-entries", async (_req, res) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      include: {
        invoice: true, // ✅ ook factuurinfo ophalen
      },
    });
    res.json(entries);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/unbilled", async (_req, res) => {
  try {
    const unbilledEntries = await prisma.timeEntry.findMany({
      where: {
        invoiceId: null, // 👉 alleen entries zonder gekoppelde factuur
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json(unbilledEntries);
  } catch (error) {
    console.error("Error fetching unbilled entries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/unbilled-report", async (_req, res) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        invoiceId: null,
      },
      orderBy: {
        date: "desc",
      },
    });

    const report = entries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      duration: entry.duration,
      date: entry.date,
      suggestedInvoiceAmount: `${(entry.duration * 150).toFixed(2)} EUR`,
      recommendation: `⚠️ Deze taak (“${entry.description}”) op ${new Date(
        entry.date
      ).toLocaleDateString()} lijkt nog niet gefactureerd. Overweeg om een factuur van ± €${(
        entry.duration * 150
      ).toFixed(2)} aan te maken.`,
    }));

    res.json(report);
  } catch (error) {
    console.error("Error generating unbilled report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`🟢 API server listening on http://localhost:${port}`);
});
