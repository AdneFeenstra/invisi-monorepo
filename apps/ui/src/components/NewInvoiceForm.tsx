import { useEffect, useState } from "react";

type TimeEntry = {
  id: string;
  description: string;
  duration: number;
  date: string;
};

type Invoice = {
  id: string;
  client: string;
  amount: number;
  status: string;
  createdAt: string;
};

export default function NewInvoiceForm({
  onCreated,
}: {
  onCreated: (invoice: Invoice) => void;
}) {
  const [client, setClient] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:4000/unbilled")
      .then((res) => res.json())
      .then(setEntries);
  }, []);

  const toggleEntry = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const totalAmount = entries
    .filter((e) => selectedIds.includes(e.id))
    .reduce((sum, e) => sum + e.duration * 150, 0);

  const createInvoice = async () => {
    if (!client || selectedIds.length === 0) return;

    setLoading(true);
    const res = await fetch("http://localhost:4000/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client,
        amount: totalAmount,
        timeEntryIds: selectedIds,
      }),
    });

    const data = await res.json();
    onCreated(data);
    setClient("");
    setSelectedIds([]);
    setLoading(false);
  };

  return (
    <div>
      <h2>🧾 Nieuwe Factuur</h2>
      <input
        type="text"
        placeholder="Klantnaam"
        value={client}
        onChange={(e) => setClient(e.target.value)}
      />
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <label>
              <input
                type="checkbox"
                checked={selectedIds.includes(entry.id)}
                onChange={() => toggleEntry(entry.id)}
              />
              {entry.description} ({entry.duration}u,{" "}
              {new Date(entry.date).toLocaleDateString()})
            </label>
          </li>
        ))}
      </ul>
      <p>Totale waarde: €{totalAmount.toFixed(2)}</p>
      <button onClick={createInvoice} disabled={loading}>
        ➕ Factuur aanmaken
      </button>
    </div>
  );
}
