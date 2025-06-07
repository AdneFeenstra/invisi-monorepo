import { useCallback, useEffect, useState } from "react";

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
  invoiceId?: string | null;
};

type ReportItem = {
  id: string;
  description: string;
  duration: number;
  date: string;
  suggestedInvoiceAmount: string;
  recommendation: string;
};

function App() {
  const [view, setView] = useState<"invoices" | "entries" | "report">(
    "invoices"
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [report, setReport] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const endpoint =
      view === "invoices"
        ? "invoices"
        : view === "entries"
        ? "time-entries"
        : "unbilled-report";

    fetch(`http://localhost:4000/${endpoint}`)
      .then((res) => res.json())
      .then((data) => {
        if (view === "invoices") setInvoices(data);
        else if (view === "entries") setEntries(data);
        else setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fout bij ophalen:", err);
        setLoading(false);
      });
  }, [view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>InvisiBilled Dashboard</h1>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setView("invoices")}>📄 Facturen</button>{" "}
        <button onClick={() => setView("entries")}>⏱️ Time Entries</button>{" "}
        <button onClick={() => setView("report")}>📋 Unbilled Report</button>
      </div>

      {loading && <p>⏳ Laden...</p>}

      {!loading && view === "invoices" && (
        <div>
          <h2>📄 Facturen</h2>
          {invoices.length === 0 ? (
            <p>Geen facturen gevonden.</p>
          ) : (
            <ul>
              {invoices.map((inv) => (
                <li key={inv.id}>
                  {inv.id} - {inv.client} - €{inv.amount} ({inv.status})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && view === "entries" && (
        <div>
          <h2>⏱️ Time Entries</h2>
          {entries.length === 0 ? (
            <p>Geen time entries beschikbaar.</p>
          ) : (
            <ul>
              {entries.map((e) => (
                <li key={e.id}>
                  {e.date} - {e.description} ({e.duration}h)
                  {e.invoiceId ? ` → Factuur: ${e.invoiceId}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && view === "report" && (
        <div>
          <h2>📋 Unbilled Report</h2>
          {report.length === 0 ? (
            <p>Geen onbetaalde werkzaamheden.</p>
          ) : (
            <ul>
              {report.map((r) => (
                <li key={r.id}>
                  {r.date} - {r.description} ({r.duration}h)
                  <br />
                  💰 {r.suggestedInvoiceAmount}
                  <br />
                  💡 {r.recommendation}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
