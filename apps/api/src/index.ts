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

app.listen(port, () => {
  console.log(`🟢 API server listening on http://localhost:${port}`);
});
