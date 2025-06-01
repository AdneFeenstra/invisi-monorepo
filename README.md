# 🧱 InvisiBilled Monorepo

Fullstack TypeScript monorepo met TurboRepo, Next.js, Express en Prisma.

---

## 📁 Projectstructuur

```
invisi-monorepo/
├─ apps/
│  ├─ web/       → Next.js frontend (TypeScript, App Router)
│  └─ api/       → Express backend + Prisma ORM (SQLite)
├─ prisma/       → Database schema & migraties (via apps/api/prisma)
├─ turbo.json    → Turborepo config
├─ pnpm-workspace.yaml
└─ .env          → Bevat DATABASE_URL
```

---

## 🧪 Lokale ontwikkeling

Start de volledige monorepo:

```bash
pnpm install         # Installeer dependencies
pnpm turbo run dev   # Start web & api gelijktijdig
```

### 🖥 Web (Next.js)

- Lokaal: http://localhost:3000
- Alternatief (indien poort bezet): `3001`, `3002`, etc.

### ⚙️ API (Express + Prisma)

- Lokaal: http://localhost:4000
- Routes:
  - `/` → Welkomsttekst
  - `/health` → Gezondheidscheck
  - `/invoices` → Ophalen van facturen uit database

---

## 🧾 Database

### Prisma setup (SQLite)

```bash
# Init database (indien nog niet gebeurd)
npx prisma migrate dev --name init

# Reset database
npx prisma migrate reset
```

### Testdata seeden

```bash
pnpm run seed
```

---

## 🧰 Tools

- **PNPM** – snelle package manager
- **TurboRepo** – monorepo orchestration
- **Next.js 15** – frontend met App Router
- **Express** – eenvoudige backend API
- **Prisma** – ORM + migrations
- **SQLite** – lokale development database

---

## ✅ Status

✅ Volledig werkende monorepo

✅ Frontend en backend communiceren correct

✅ Database is gemigreerd én gevuld met testdata

---

## 🔜 Volgende stappen (optioneel)

- [ ] POST-endpoint voor `/invoices`
- [ ] Facturenlijst in de UI
- [ ] CORS middleware toevoegen
- [ ] Deploymentstrategie bepalen

---

Made with ❤️ for InvisiBilled
