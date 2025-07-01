import { useEffect, useState } from "react";
import { useCallback } from "react";
import "./App.css";
import NewInvoiceForm from "./components/NewInvoiceForm";
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useUser,
  useAuth,
  SignOutButton,
} from "@clerk/clerk-react";

type Invoice = {
  id: string;
  client: string;
  amount: number;
  status: string;
  createdAt: string;
};

type TimeEntry = {
  id: string;
  description: string;
  duration: number;
  date: string;
  invoiceId?: string;
};

type ReportEntry = {
  id: string;
  description: string;
  duration: number;
  date: string;
  suggestedInvoiceAmount: string;
  recommendation: string;
};

function App() {
  const { user } = useUser();
  const { getToken } = useAuth();
  console.log("✅ useUser user:", user);
  console.log("✅ useAuth getToken:", getToken);

  const [token, setToken] = useState<string | null>(null);
  console.log("🧭 Render → token:", token);
  const [tab, setTab] = useState<"invoices" | "entries" | "report">("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [report, setReport] = useState<ReportEntry[]>([]);

  // ✅ 1. Haal Clerk-token op en sla het op
  useEffect(() => {
    if (!user) {
      console.warn("⚠️ Geen ingelogde gebruiker, fetchToken niet aangeroepen");
      return;
    }

    async function fetchToken() {
      console.log("✅ fetchToken called because user is signed in");
      try {
        const t = await getToken();
        console.log("✅ fetched token:", t);

        if (!t) {
          console.warn("⚠️ getToken() gaf null terug");
          return;
        }
        setToken(t);

        const res = await fetch("http://localhost:4000/me", {
          headers: {
            Authorization: `Bearer ${t}`,
          },
          credentials: "include",
        });
        const data = await res.json();
        console.log("✅ Me endpoint:", data);
      } catch (err) {
        console.error("❌ /me ophalen mislukt:", err);
      }
    }

    fetchToken();
  }, [user, getToken]);

  // ✅ 2. API calls die het token meesturen
  const fetchInvoices = useCallback(() => {
    if (!token) {
      console.warn("⚠️ fetchInvoices → geen token beschikbaar");
      return;
    }

    console.log("📡 fetchInvoices met token:", token);

    fetch("http://localhost:4000/invoices", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then((res) => {
        console.log("✅ /invoices response.status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("✅ /invoices data:", data);
        if (Array.isArray(data)) setInvoices(data);
      })
      .catch((err) => {
        console.error("❌ /invoices fetch error:", err);
      });
  }, [token]);

  const fetchEntries = useCallback(() => {
    if (!token) {
      console.warn("⚠️ fetchEntries → geen token beschikbaar");
      return;
    }

    console.log("📡 fetchEntries met token:", token);

    fetch("http://localhost:4000/time-entries", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then((res) => {
        console.log("✅ /time-entries response.status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("✅ /time-entries data:", data);
        if (Array.isArray(data)) setEntries(data);
      })
      .catch((err) => {
        console.error("❌ /time-entries fetch error:", err);
      });
  }, [token]);

  const fetchReport = useCallback(() => {
    if (!token) {
      console.warn("⚠️ fetchReport → geen token beschikbaar");
      return;
    }

    console.log("📡 fetchReport met token:", token);

    fetch("http://localhost:4000/unbilled-report", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then((res) => {
        console.log("✅ /unbilled-report response.status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("✅ /unbilled-report data:", data);
        if (Array.isArray(data)) setReport(data);
      })
      .catch((err) => {
        console.error("❌ /unbilled-report fetch error:", err);
      });
  }, [token]);

  // ✅ 3. Haal data op zodra token bekend is
  useEffect(() => {
    fetchInvoices();
    fetchEntries();
    fetchReport();
  }, [token, fetchInvoices, fetchEntries, fetchReport]);

  useEffect(() => {
    console.log("📌 Clerk token in state:", token);
  }, [token]);

  return (
    <div className="App">
      <SignedOut>
        <SignIn />
      </SignedOut>

      <SignedIn>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p>👋 Welkom, {user?.firstName}</p>
            <h1>InvisiBilled Dashboard</h1>
          </div>
          <UserButton />
          <SignOutButton />
        </div>

        <nav>
          <button onClick={() => setTab("invoices")}>📄 Facturen</button>
          <button onClick={() => setTab("entries")}>⏱️ Time Entries</button>
          <button onClick={() => setTab("report")}>📋 Unbilled Report</button>
        </nav>

        {tab === "invoices" && (
          <>
            <NewInvoiceForm onCreated={fetchInvoices} token={token} />
            {invoices.length === 0 ? (
              <p>Geen facturen gevonden.</p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id}>
                  <strong>{invoice.client}</strong> — €{invoice.amount} (
                  {invoice.status})
                </div>
              ))
            )}
          </>
        )}

        {tab === "entries" && (
          <>
            {entries.length === 0 ? (
              <p>Geen time entries.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id}>
                  {entry.description} — {entry.duration}u op{" "}
                  {new Date(entry.date).toLocaleDateString()}{" "}
                  {entry.invoiceId && <em>(Gefactureerd)</em>}
                </div>
              ))
            )}
          </>
        )}

        {tab === "report" && (
          <>
            {report.length === 0 ? (
              <p>Geen onbetaalde taken.</p>
            ) : (
              report.map((r) => (
                <div key={r.id}>
                  <p>
                    <strong>{r.description}</strong> — {r.duration}u op{" "}
                    {new Date(r.date).toLocaleDateString()} →{" "}
                    {r.suggestedInvoiceAmount}
                  </p>
                  <em>{r.recommendation}</em>
                </div>
              ))
            )}
          </>
        )}
      </SignedIn>
    </div>
  );
}

export default App;
