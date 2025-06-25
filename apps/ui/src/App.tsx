import { useEffect, useState } from "react";
import "./App.css";
import NewInvoiceForm from "./components/NewInvoiceForm";
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useUser,
  useAuth,
} from "@clerk/clerk-react"; // ⬅️ toegevoegde useAuth

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
  const { getToken } = useAuth(); // ⬅️ toegevoegd

  const [tab, setTab] = useState<"invoices" | "entries" | "report">("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [report, setReport] = useState<ReportEntry[]>([]);

  const fetchInvoices = () =>
    fetch("http://localhost:4000/invoices")
      .then((res) => res.json())
      .then(setInvoices);

  const fetchEntries = () =>
    fetch("http://localhost:4000/time-entries")
      .then((res) => res.json())
      .then(setEntries);

  const fetchReport = () =>
    fetch("http://localhost:4000/unbilled-report")
      .then((res) => res.json())
      .then(setReport);

  useEffect(() => {
    fetchInvoices();
    fetchEntries();
    fetchReport();
  }, []);

  // 🔐 JWT ophalen en /me endpoint aanroepen
  useEffect(() => {
    async function checkMe() {
      try {
        const token = await getToken({ template: "default" });
        const res = await fetch("http://localhost:4000/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log("✅ Me endpoint:", data);
      } catch (err) {
        console.error("❌ /me ophalen mislukt:", err);
      }
    }

    checkMe();
  }, [getToken]);

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
        </div>

        <nav>
          <button onClick={() => setTab("invoices")}>📄 Facturen</button>
          <button onClick={() => setTab("entries")}>⏱️ Time Entries</button>
          <button onClick={() => setTab("report")}>📋 Unbilled Report</button>
        </nav>

        {tab === "invoices" && (
          <>
            <NewInvoiceForm onCreated={fetchInvoices} />
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
