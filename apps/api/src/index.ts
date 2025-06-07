import express from "express";
import { PrismaClient } from "@prisma/client"; // ✅ Prisma import
import cors from "cors";

const app = express();
const port = 4000;

const prisma = new PrismaClient(); // ✅ Prisma instance

app.use(cors()); // ✅ CORS middleware to allow cross-origin requests

app.use(express.json()); // ✅ Body parser toevoegen voor POST-requests

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

app.post("/invoices", async (req, res) => {
  const { client, amount, timeEntryIds } = req.body;

  if (!client || !amount || !Array.isArray(timeEntryIds)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const newInvoice = await prisma.invoice.create({
      data: {
        client,
        amount,
        status: "unpaid",
        timeEntries: {
          connect: timeEntryIds.map((id: string) => ({ id })),
        },
      },
    });

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.patch("/invoices/:id/pay", async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "paid" },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    res.status(500).json({ error: "Could not mark invoice as paid" });
  }
});

app.patch("/invoices/:id/unpay", async (req, res) => {
  const { id } = req.params;

  try {
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: "unpaid" },
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error("Error updating invoice to unpaid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/invoices/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Eerst ontkoppelen we eventuele gekoppelde time entries
    await prisma.timeEntry.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null },
    });

    // Vervolgens verwijderen we de factuur zelf
    await prisma.invoice.delete({
      where: { id },
    });

    res.json({ message: `Factuur ${id} is verwijderd.` });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/time-entries", async (req, res) => {
  const {
    description,
    duration,
    date,
    invoiceId,
  }: {
    description: string;
    duration: number;
    date: string;
    invoiceId?: string;
  } = req.body;

  if (!description || !duration || !date) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const newEntry = await prisma.timeEntry.create({
      data: {
        description,
        duration,
        date: new Date(date),
        invoiceId: invoiceId || null,
      },
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Error creating time entry:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/time-entries/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.timeEntry.delete({
      where: { id },
    });

    res.json({ message: `Time entry ${id} is verwijderd.` });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.patch("/time-entries/:id", async (req, res) => {
  const { id } = req.params;
  const { description, duration, date } = req.body;

  if (!description && !duration && !date) {
    return res.status(400).json({ error: "Geen updatevelden opgegeven" });
  }

  try {
    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(duration && { duration }),
        ...(date && { date }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating time entry:", error);
    res.status(500).json({ error: "Interne fout bij bijwerken" });
  }
});

app.listen(port, () => {
  console.log(`🟢 API server listening on http://localhost:${port}`);
});
