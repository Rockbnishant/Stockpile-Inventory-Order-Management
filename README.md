# Stockpile — Inventory & Order Management

A small full-stack app for running the day-to-day of a product business: track
products and stock levels, keep a customer list, and place orders that draw down
inventory automatically. Built as a take-home for the Ethara.ai Software Engineer
assessment.

**Stack:** FastAPI · React (Vite) · PostgreSQL · Docker Compose

---

## What it does

- **Products** — full CRUD with a unique SKU per product and a non-negative stock count.
- **Customers** — add, list, and remove customers; emails are unique.
- **Orders** — pick a customer and one or more products. The backend checks stock,
  reduces it, and works out the order total. Cancelling an order returns the stock.
- **Dashboard** — counts for products / customers / orders plus a low-stock watchlist.

The interesting logic lives on the server, where it belongs — the frontend just
mirrors it and shows friendly errors.

---

## Running it locally

You need Docker and Docker Compose. That's it — no local Python or Node required.

```bash
cp .env.example .env          # tweak credentials if you like
docker compose up --build
```

Then open:

- Frontend → http://localhost:5173
- API docs (Swagger) → http://localhost:8000/docs

Postgres data persists in a named volume (`pgdata`), so your data survives
restarts. To wipe it: `docker compose down -v`.

### Running pieces by hand (no Docker)

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://user:pass@localhost:5432/inventory"
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev            # picks up VITE_API_URL or defaults to localhost:8000
```

---

## API reference

Base URL is the backend root. All bodies are JSON.

### Products

| Method | Path             | Notes                          |
| ------ | ---------------- | ------------------------------ |
| POST   | `/products`      | create — 409 if SKU exists     |
| GET    | `/products`      | list all                       |
| GET    | `/products/{id}` | one product, 404 if missing    |
| PUT    | `/products/{id}` | update (send only what changes)|
| DELETE | `/products/{id}` | delete, 204 on success         |

### Customers

| Method | Path              | Notes                              |
| ------ | ----------------- | ---------------------------------- |
| POST   | `/customers`      | create — 409 if email exists       |
| GET    | `/customers`      | list all                           |
| GET    | `/customers/{id}` | one customer                       |
| DELETE | `/customers/{id}` | 409 if the customer still has orders|

### Orders

| Method | Path           | Notes                                  |
| ------ | -------------- | -------------------------------------- |
| POST   | `/orders`      | create — 400 if any item is short stock|
| GET    | `/orders`      | list all (newest first)                |
| GET    | `/orders/{id}` | one order with its line items          |
| DELETE | `/orders/{id}` | cancel — returns stock to inventory    |

Order create body:

```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 7, "quantity": 1 }
  ]
}
```

### Extras

- `GET /dashboard` — summary counts + low-stock list.
- `GET /health` — returns `{"status": "ok"}`, handy for uptime checks.

---

## Business rules

These are enforced server-side and tested:

- SKUs are unique; so are customer emails.
- Stock can never go negative (validated in the API and with a DB check constraint).
- An order is rejected (400) if any line asks for more than what's on hand —
  nothing is reserved unless the whole order goes through.
- Placing an order subtracts the quantities from stock; cancelling adds them back.
- The order total is computed by the backend from the price at purchase time, so
  changing a product's price later doesn't rewrite old orders.

---

## Deployment

The app is built to deploy across free tiers. Three things go up: the backend
container, the frontend static build, and a managed Postgres.

### 1. Database

Spin up a free Postgres on Render or Railway and grab its connection string.

### 2. Backend → Render (or Railway / Fly.io)

The backend image is on Docker Hub, so you can deploy it directly:

```
docker.io/<your-dockerhub-user>/inventory-backend:latest
```

To build and push it yourself:

```bash
cd backend
docker build -t <your-dockerhub-user>/inventory-backend:latest .
docker push <your-dockerhub-user>/inventory-backend:latest
```

On Render, create a Web Service from that image and set env vars:

- `DATABASE_URL` — from step 1
- `CORS_ORIGINS` — your deployed frontend URL (e.g. `https://stockpile.vercel.app`)
- `LOW_STOCK_THRESHOLD` — optional, defaults to 10

Render injects `$PORT`; the container already reads it.

### 3. Frontend → Vercel (or Netlify)

Import the repo, set the project root to `frontend/`, and add one build-time
env var:

- `VITE_API_URL` — your live backend URL (e.g. `https://inventory-backend.onrender.com`)

Build command `npm run build`, output dir `dist`. Vercel handles the rest.

> Heads up: `VITE_API_URL` is read at build time, not runtime. If you change it,
> trigger a rebuild.

---

## Project layout

```
.
├── backend/
│   ├── app/
│   │   ├── main.py          # app + dashboard + health
│   │   ├── config.py        # env-driven settings
│   │   ├── database.py      # engine + session
│   │   ├── models.py        # SQLAlchemy tables
│   │   ├── schemas.py       # Pydantic request/response models
│   │   └── routers/         # products, customers, orders
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Products, Customers, Orders
│   │   ├── components/      # Modal, Toast
│   │   └── lib/api.js       # fetch wrapper
│   ├── Dockerfile           # multi-stage → nginx
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

## Notes & trade-offs

- Tables are created on startup rather than via migrations. For a system this
  size that's the pragmatic call; if it grew I'd reach for Alembic.
- The order stock check and decrement happen in one transaction, so a failed
  line rolls the whole order back.
- Auth is out of scope for the assessment, so there's none — every endpoint is open.
