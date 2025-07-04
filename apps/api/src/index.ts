import express from "express";
import { PrismaClient } from "@prisma/client"; // ✅ Prisma import
import cors from "cors";
import { getAuth } from "@clerk/express";
import { clerkMiddleware } from "@clerk/express";
import { requireAuth as clerkExpressRequireAuth } from "@clerk/express";
import axios from "axios";
import { AxiosError } from "axios";
import qs from "qs";
import cookieParser from "cookie-parser";
import { verifyToken } from "@clerk/backend";
import { requireAuth } from "./middleware/requireAuth";
import { requireRole } from "./middleware/requireRole";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const app = express();
const port = 4000;

const prisma = new PrismaClient(); // ✅ Prisma instance

app.use(cookieParser());
app.use(clerkMiddleware());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json()); // ✅ Body parser toevoegen voor POST-requests

type TestType = Express.Request["auth"]; // ← moet géén fout geven

app.get("/", (_req, res) => {
  res.send("🏠 Welcome to InvisiBilled API");
});

app.get("/health", (_req, res) => {
  res.send("✅ API is healthy");
});

app.get(
  "/invoices",
  requireAuth,
  requireRole(["admin", "pm", "viewer"]),
  async (_req, res) => {
    try {
      const invoices = await prisma.invoice.findMany({
        include: {
          timeEntries: true,
        },
      });
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.get(
  "/time-entries",
  requireAuth,
  requireRole(["admin", "pm", "viewer"]),
  async (_req, res) => {
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
  }
);

app.get(
  "/unbilled",
  requireAuth,
  requireRole(["admin", "pm", "viewer"]),
  async (_req, res) => {
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
  }
);

app.get(
  "/unbilled-report",
  requireAuth,
  requireRole(["admin", "pm", "viewer"]),
  async (_req, res) => {
    try {
      const entries = await prisma.timeEntry.findMany({
        where: {
          invoiceId: null,
        },
        orderBy: {
          date: "desc",
        },
      });

      const report = entries.map((entry: any) => ({
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
  }
);

app.post(
  "/invoices",
  requireAuth,
  requireRole(["admin", "pm"]),
  async (req, res) => {
    const InvoiceSchema = z.object({
      client: z.string().min(1),
      amount: z.number().positive(),
      timeEntryIds: z.array(z.string().min(1)),
    });

    const parse = InvoiceSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { client, amount, timeEntryIds } = parse.data;

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
  }
);

app.patch(
  "/invoices/:id/pay",
  requireAuth,
  requireRole(["admin", "pm"]),
  async (req, res) => {
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
  }
);

app.patch(
  "/invoices/:id/unpay",
  requireAuth,
  requireRole(["admin", "pm"]),
  async (req, res) => {
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
  }
);

app.delete(
  "/invoices/:id",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
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
  }
);

app.post(
  "/time-entries",
  requireAuth,
  requireRole(["admin", "pm", "user"]),
  async (req, res) => {
    const TimeEntrySchema = z.object({
      description: z.string().min(1),
      duration: z.number().positive(),
      date: z.string().refine((d) => !isNaN(Date.parse(d)), {
        message: "Invalid date format",
      }),
      invoiceId: z.string().optional(),
    });

    const parse = TimeEntrySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { description, duration, date, invoiceId } = parse.data;

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
  }
);

app.delete(
  "/time-entries/:id",
  requireAuth,
  requireRole(["admin", "pm"]),
  async (req, res) => {
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
  }
);

app.patch(
  "/time-entries/:id",
  requireAuth,
  requireRole(["admin", "pm"]),
  async (req, res) => {
    const { id } = req.params;
    const TimeEntryUpdateSchema = z
      .object({
        description: z.string().optional(),
        duration: z.number().optional(),
        date: z
          .string()
          .refine((d) => !isNaN(Date.parse(d)), {
            message: "Invalid date format",
          })
          .optional(),
      })
      .refine((data) => Object.keys(data).length > 0, {
        message: "Minstens één veld moet worden opgegeven",
      });

    const parse = TimeEntryUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { description, duration, date } = parse.data;

    try {
      const updated = await prisma.timeEntry.update({
        where: { id },
        data: {
          ...(description && { description }),
          ...(duration && { duration }),
          ...(date && { date: new Date(date) }), // ✅ gegarandeerd een Date
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ error: "Interne fout bij bijwerken" });
    }
  }
);

app.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "No user info available" });
  }

  res.json({
    userId: req.auth.userId,
    email: req.auth.email,
  });
});

app.get("/harvest/connect", requireAuth, (req, res) => {
  const clientId = process.env.HARVEST_CLIENT_ID!;
  const redirectUri = process.env.HARVEST_REDIRECT_URI!;
  const authUrl = `https://id.getharvest.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&state=xyz`;
  res.redirect(authUrl);
});

app.get("/harvest/callback", requireAuth, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const response = await axios.post(
      "https://id.getharvest.com/api/v2/oauth2/token",
      {
        client_id: process.env.HARVEST_CLIENT_ID,
        client_secret: process.env.HARVEST_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.HARVEST_REDIRECT_URI,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const userId = req.auth!.userId;

    const {
      access_token,
      refresh_token,
      expires_in,
      token_type,
      scope: rawScope,
    } = response.data;

    const scope = typeof rawScope === "string" ? rawScope : "default";

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    console.log("OAuth response", response.data);
    console.log("Clerk user", userId);

    await prisma.harvestConnection.upsert({
      where: { userId },
      create: {
        userId: userId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        tokenType: token_type,
        scope,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        tokenType: token_type,
        scope,
      },
    });

    res.redirect("http://localhost:5173"); // of /dashboard
  } catch (err: any) {
    console.error("OAuth callback error", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to exchange token" });
  }
});

app.get("/harvest/time-entries", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const connection = await prisma.harvestConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return res.status(404).json({ error: "No Harvest connection found" });
  }

  try {
    const response = await axios.get(
      "https://api.harvestapp.com/v2/time_entries",
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Harvest-Account-Id": process.env.HARVEST_ACCOUNT_ID!,
          "User-Agent": "InvisiBilled (you@example.com)", // <- optioneel
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    console.error(
      "Failed to fetch Harvest time entries:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch time entries" });
  }
});

app.get("/harvest/me", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const connection = await prisma.harvestConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return res.status(404).json({ error: "No Harvest connection found" });
  }

  try {
    const response = await axios.get("https://api.harvestapp.com/v2/users/me", {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Harvest-Account-Id": process.env.HARVEST_ACCOUNT_ID!,
        "User-Agent": "InvisiBilled (you@example.com)",
      },
    });

    res.json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    console.error("Failed to fetch Harvest user info:", err);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

app.get("/clickup/connect", requireAuth, (req, res) => {
  const clientId = process.env.CLICKUP_CLIENT_ID!;
  const redirectUri = process.env.CLICKUP_REDIRECT_URI!;
  const authUrl = `https://app.clickup.com/api?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
  res.redirect(authUrl);
});

app.get("/clickup/callback", requireAuth, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await axios.post(
      "https://api.clickup.com/api/v2/oauth/token",
      {
        client_id: process.env.CLICKUP_CLIENT_ID,
        client_secret: process.env.CLICKUP_CLIENT_SECRET,
        code,
        redirect_uri: process.env.CLICKUP_REDIRECT_URI,
      }
    );

    const userId = req.auth!.userId;

    const { access_token, token_type } = tokenRes.data;

    // Optioneel: workspace ophalen
    const workspaceRes = await axios.get(
      "https://api.clickup.com/api/v2/team",
      {
        headers: { Authorization: access_token },
      }
    );

    const team = workspaceRes.data.teams?.[0];

    await prisma.clickUpConnection.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        accessToken: access_token,
        tokenType: token_type,
        workspaceId: team?.id || "",
        workspaceName: team?.name || "",
      },
      update: {
        accessToken: access_token,
        tokenType: token_type,
        workspaceId: team?.id || "",
        workspaceName: team?.name || "",
      },
    });

    res.redirect("http://localhost:5173");
  } catch (err) {
    const error = err as AxiosError;
    console.error("ClickUp OAuth error", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to exchange token" });
  }
});

app.get("/clickup/tasks", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const connection = await prisma.clickUpConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return res.status(404).json({ error: "No ClickUp connection found" });
  }

  try {
    const response = await axios.get(
      `https://api.clickup.com/api/v2/team/${connection.workspaceId}/task`,
      {
        headers: {
          Authorization: connection.accessToken,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    console.error(
      "Failed to fetch ClickUp tasks:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch ClickUp tasks" });
  }
});

app.get("/clickup/me", requireAuth, async (req, res) => {
  console.log("✅ /clickup/me route hit");
  const userId = req.auth!.userId;

  const connection = await prisma.clickUpConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return res.status(404).json({ error: "No ClickUp connection found" });
  }

  try {
    const response = await axios.get("https://api.clickup.com/api/v2/user", {
      headers: {
        Authorization: connection.accessToken,
      },
    });

    res.json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    console.error(
      "Failed to fetch ClickUp user info:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

// QuickBooks connect endpoint
app.get("/quickbooks/connect", requireAuth, (req, res) => {
  const baseUrl = "https://appcenter.intuit.com/connect/oauth2";
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI!;
  const scope = "com.intuit.quickbooks.accounting openid profile email";

  const url = `${baseUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(scope)}&state=xyz`;

  console.log("🔗 Redirecting to QuickBooks:", url);

  res.redirect(url);
});

// QuickBooks callback
app.get("/quickbooks/callback", requireAuth, async (req, res) => {
  const { code, realmId } = req.query;

  if (!code || !realmId) {
    return res.status(400).json({ error: "Missing code or realmId" });
  }

  try {
    const response = await axios.post(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      qs.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const userId = req.auth!.userId;

    const { access_token, refresh_token, expires_in } = response.data;

    await prisma.quickBooksConnection.upsert({
      where: { userId },
      create: {
        userId: userId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        realmId: realmId as string,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        realmId: realmId as string,
      },
    });

    res.redirect("http://localhost:5173"); // terug naar de UI
  } catch (err) {
    const error = err as AxiosError;
    console.error(
      "QuickBooks callback error",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to exchange token with QuickBooks" });
  }
});

app.get("/quickbooks/customers", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const conn = await prisma.quickBooksConnection.findUnique({
    where: { userId },
  });

  if (!conn)
    return res.status(404).json({ error: "No QuickBooks connection found" });

  try {
    const response = await axios.get(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${conn.realmId}/query`,
      {
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          Accept: "application/json",
        },
        params: {
          query: "SELECT * FROM Customer",
        },
      }
    );

    res.json(response.data.QueryResponse.Customer || []);
  } catch (err) {
    const error = err as AxiosError;
    console.error(
      "Error fetching customers:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.get("/quickbooks/invoices", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const conn = await prisma.quickBooksConnection.findUnique({
    where: { userId },
  });

  if (!conn)
    return res.status(404).json({ error: "No QuickBooks connection found" });

  try {
    const response = await axios.get(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${conn.realmId}/query`,
      {
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          Accept: "application/json",
        },
        params: {
          query: "SELECT * FROM Invoice",
        },
      }
    );

    res.json(response.data.QueryResponse.Invoice || []);
  } catch (err) {
    const error = err as AxiosError;
    console.error(
      "Error fetching invoices:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

app.get("/test-auth", requireAuth, (req, res) => {
  res.send({ userId: req.auth!.userId });
});

// Debug route to check cookies and userId
app.get("/debug-cookie", (req, res) => {
  const { userId, sessionId } = getAuth(req);
  console.log("🧪 Debug userId:", userId);
  console.log("🔍 Session ID:", sessionId);
  console.log("🔍 Cookies binnen:", req.cookies);
  res.json({ userId, sessionId, cookies: req.cookies });
});

app.get("/debug-auth", requireAuth, (req, res) => {
  res.json({ auth: req.auth });
});

app.listen(port, () => {
  console.log(`🟢 API server listening on http://localhost:${port}`);
});
