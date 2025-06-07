// src/Invoices.tsx
import { useEffect, useState } from "react";

type Invoice = {
  id: string;
  client: string;
  amount: number;
  status: string;
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetch("http://localhost:4000/invoices")
      .then((res) => res.json())
      .then(setInvoices)
      .catch((err) => console.error("Failed to fetch invoices", err));
  }, []);

  return (
    <div>
      <h1>📄 Facturen</h1>
      <ul>
        {invoices.map((inv) => (
          <li key={inv.id}>
            {inv.id} – {inv.client} – €{inv.amount} –{" "}
            <strong>{inv.status}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
