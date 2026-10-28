# Quantix AI

**Smart inventory, fast sales logging, and an AI stock advisor for small physical shops.**

Quantix AI is a web app built for corner stores, spaza shops, and local pet shops: small brick-and-mortar businesses that don't have barcode scanners or an expensive point-of-sale system. The owner opens the app on a phone or a computer, logs a sale in a few taps, checks what's left on the shelf, and asks an AI advisor what to restock, what's barely making a profit, and what isn't selling.

---

## Table of contents

1. [What is Quantix AI?](#what-is-quantix-ai)
2. [Features](#features)
3. [How it works](#how-it-works)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Installation](#installation)
7. [Using the app](#using-the-app)
8. [The AI advisor](#the-ai-advisor)
9. [Security model](#security-model)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap](#roadmap)
13. [Contributing](#contributing)
14. [License](#license)

---

## What is Quantix AI?

Most small shops run on memory, notebooks, and guesswork. Big retail software assumes barcode scanners, card terminals, and a monthly bill that a corner store can't justify. Quantix AI is the middle ground: a lightweight tool that runs in a browser and does the three jobs a small shop owner actually needs.

1. **Log sales quickly,** by tapping the product and the quantity, and choosing Cash or Card.
2. **Know what's on the shelf,** with live stock levels that drop automatically with every sale.
3. **Get business advice from your own numbers,** with an AI advisor that reads your real inventory and tells you what to reorder, which products have thin margins, and which stock is sitting idle.

It's built to be used with one hand, behind a counter, with a customer waiting. That's why everything is manual-entry friendly, mobile responsive, and light on setup.

### Who it's for

- Corner stores and tuck shops
- Spaza shops
- Local pet shops
- Any small retailer that sells physical stock and has no scanner or POS

---

## Features

**Sales**
- Multi-unit counter with `+` / `-` buttons and direct number entry
- Cash vs. Card payment tracking
- Quantity is capped at what's actually in stock, and out-of-stock items can't be sold
- Every sale is recorded in an append-only ledger and deducts stock automatically
- Revenue summary with a Cash / Card breakdown

**Inventory**
- Products with category, supplier, cost price, selling price, stock on hand, and a minimum required level
- Quick stock adjustment (add or remove units) and product deletion
- Real-time search across product name and category
- Total stock value calculated from cost price

**AI and analysis**
- **AI advisor ("Jarvis")** that reads your live inventory and answers questions in plain language
- One-tap analysis buttons: **AI Restock List**, **Profit vs Loss Audit**, **Dead Stock Check**
- Automatic gross profit and margin percentage per product, flagged as high-profit or low-margin
- Restock alerts for items at or below their minimum level
- **Purchase order draft:** a printable PO for the items flagged for restocking

**Platform**
- Email and password accounts
- Each shop gets its own store automatically on sign-up
- Full data isolation between stores
- Responsive layout: desktop sidebar and mobile bottom navigation bar

---

## How it works

```
┌─────────────────────────────┐
│   Browser (Next.js client)  │
│   app/page.tsx dashboard    │
└──────┬───────────────┬──────┘
       │               │
       │ sales, stock, │ AI question + store id
       │ products      │ + user access token
       ▼               ▼
┌──────────────┐  ┌────────────────────────┐
│  Supabase    │  │  /api/chat (server)    │
│  Auth + DB   │◄─┤  reads store inventory │
│  (RLS on)    │  │  as the logged-in user │
└──────────────┘  └───────────┬────────────┘
                              │ inventory + question
                              ▼
                      ┌───────────────┐
                      │ Gemini 2.5    │
                      │ Flash         │
                      └───────────────┘
```

1. A shop owner registers. A database trigger creates their store row automatically.
2. The dashboard loads that owner's store ID and fetches only that store's products and sales.
3. Selling an item inserts a row into `sales_transactions` and reduces `stock_on_hand`.
4. When the owner asks the AI advisor something, the dashboard sends the question, the store ID, and the user's session token to `/api/chat`.
5. The server route reads that store's inventory from Supabase **as the logged-in user** (so Row Level Security applies), formats it, and passes it to Gemini with instructions to act as a retail stock advisor.
6. Gemini's answer is returned to the dashboard.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) with TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| UI components | [shadcn/ui](https://ui.shadcn.com) (Card, Button, Input) |
| Icons | [Lucide](https://lucide.dev) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Authentication | Supabase Auth (email and password) |
| AI | Google Gemini `gemini-2.5-flash` via the `@google/genai` SDK |

---

## Project structure

```
.
├── app/
│   ├── page.tsx                # Main dashboard: sales, inventory, AI advisor, PO modal
│   ├── login/
│   │   └── page.tsx            # Sign in / register
│   └── api/
│       └── chat/
│           └── route.ts        # AI advisor endpoint (authenticated, store-scoped)
├── components/
│   └── ui/                     # shadcn/ui components (card, button, input)
├── lib/
│   ├── supabase.ts             # Browser Supabase client (anon key)
│   └── transactions.ts         # processProductSale(): records a sale and deducts stock
├── public/
│   └── logo.jpeg               # App logo
├── supabase/                   # (create this) SQL migrations, one numbered file per change
├── .env.local                  # Your secrets. NOT committed to Git
├── CONTRIBUTING.md             # How to collaborate on this repo
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js 18.18 or newer** (Node 20 LTS recommended). Check with `node -v`
- **Git**
- A free **[Supabase](https://supabase.com)** account and project
- A **[Google AI Studio](https://aistudio.google.com)** API key for Gemini

### 1. Clone the repo

This is a private repo, so you need to have been added as a collaborator first. See [CONTRIBUTING.md](./CONTRIBUTING.md) for access and SSH setup.

```bash
git clone git@github.com:<owner>/<repo-name>.git
cd <repo-name>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your Supabase project

1. In Supabase, click **New project** and wait for it to finish provisioning.
2. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
3. (Recommended for development) Under **Authentication → Providers → Email**, turn **Confirm email** off, so test accounts can sign in immediately without clicking an email link.

### 4. Set environment variables

Create a file called `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

- `NEXT_PUBLIC_` variables are visible in the browser. That's fine for the Supabase URL and anon key, because Row Level Security is what protects the data.
- `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix, so it stays on the server. Never add that prefix to it.
- **Never commit `.env.local`.** Confirm it's listed in `.gitignore`.

### 5. Create the database tables

In Supabase, open the **SQL Editor** and create the three tables. Column names below are the ones the code reads and writes:

```sql
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table products (
  id bigint generated always as identity primary key,
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  category text,
  supplier text,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  min_required integer not null default 0,
  cost_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

create table sales_transactions (
  id bigint generated always as identity primary key,
  store_id uuid not null references stores(id) on delete cascade,
  product_id bigint not null references products(id),
  quantity integer not null check (quantity > 0),
  total_price numeric(12,2) not null,
  payment_method text not null,
  created_at timestamptz default now()
);
```

> If you're joining an existing project whose tables are already set up, skip this step. Only the person who created the Supabase project needs to do it.

### 6. Turn on security and the sign-up trigger

Run this in the SQL Editor. It enables Row Level Security, adds the per-store policies, and creates the trigger that gives every new user a store automatically.

```sql
-- Row Level Security on every tenant table
alter table stores enable row level security;
alter table products enable row level security;
alter table sales_transactions enable row level security;

-- One store per owner
alter table stores add constraint unique_owner_id unique (owner_id);

-- Helper: the calling user's own store id
create or replace function get_my_store_id()
returns uuid
language sql
security definer
stable
as $$
  select id from stores where owner_id = auth.uid() limit 1;
$$;

-- stores
create policy "Users can view their own store"   on stores for select using (owner_id = auth.uid());
create policy "Users can update their own store" on stores for update using (owner_id = auth.uid());
create policy "Users can create their own store" on stores for insert with check (owner_id = auth.uid());

-- products
create policy "Store owners can view their products"   on products for select using (store_id = get_my_store_id());
create policy "Store owners can insert their products" on products for insert with check (store_id = get_my_store_id());
create policy "Store owners can update their products" on products for update using (store_id = get_my_store_id());
create policy "Store owners can delete their products" on products for delete using (store_id = get_my_store_id());

-- sales_transactions (append-only: no update or delete)
create policy "Store owners can view their sales"   on sales_transactions for select using (store_id = get_my_store_id());
create policy "Store owners can insert their sales" on sales_transactions for insert with check (store_id = get_my_store_id());

-- Auto-create a store whenever a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.stores (name, owner_id)
  values (split_part(new.email, '@', 1) || '''s Store', new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

> **Important:** if you create tables through the Supabase table editor instead of SQL, it may add a default policy called `Enable read access for all users` (`using (true)`). That policy lets anyone read every store's rows. Delete it:
>
> ```sql
> drop policy if exists "Enable read access for all users" on products;
> drop policy if exists "Enable read access for all users" on sales_transactions;
> ```

To check what policies exist at any time:

```sql
select tablename, policyname, qual from pg_policies
where tablename in ('stores', 'products', 'sales_transactions')
order by tablename, policyname;
```

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on the login page.

---

## Using the app

1. **Register.** On the login page, enter an email and password and click **Register**. A store is created for you automatically. Then sign in.
2. **Add products.** Use the add-product form to enter each item: name, category, supplier, cost price, selling price, current stock, and the minimum level you never want to drop below.
3. **Log a sale.** Find the product (use the search box if needed), set the quantity with `+` / `-` or by typing, pick **Cash** or **Card**, and confirm. Stock drops and revenue updates straight away.
4. **Adjust stock.** When a delivery arrives, or you spot a miscount, use the stock adjustment controls on the product row.
5. **Ask the advisor.** Tap one of the quick-analysis buttons or type your own question.
6. **Print a purchase order.** When items are flagged for restocking, open the PO modal, review the draft, and print it for your supplier.

All prices are shown in South African Rand (R).

---

## The AI advisor

The advisor ("Jarvis") is a Gemini model that's given your store's live inventory every time you ask a question: product, category, stock, minimum required, cost, retail price, and supplier. It answers from that data.

| Button | What it does |
|---|---|
| **AI Restock List** | Flags items at or below their minimum and suggests what to reorder |
| **Profit vs Loss Audit** | Looks at margins and highlights low-margin products |
| **Dead Stock Check** | Identifies stock that isn't moving |

You can also type any question, for example: *"Which products should I stop stocking?"* or *"What should I order from my cheapest supplier this week?"*

**Good to know**
- The advisor only sees **your own store's** products, never another shop's.
- It works from the numbers in your inventory. The more accurate your stock counts and prices are, the better its advice.
- It uses a low temperature setting so it stays close to the facts in your data.
- Each question is one Gemini API call, so heavy use can cost money. Set a quota in Google AI Studio if you're worried.

---

## Security model

Quantix AI is multi-tenant, which means many shops share one database. Isolation between shops is enforced in the database itself, not just in the interface.

- **Row Level Security (RLS)** is on for `stores`, `products`, and `sales_transactions`. Policies use `get_my_store_id()`, which looks up the store owned by the current logged-in user.
- **The AI route is authenticated.** The dashboard sends the user's access token to `/api/chat`, and the route builds a request-scoped Supabase client with it. RLS then applies to the AI's read exactly as it does everywhere else. Without the token the server has no user identity, and the query would return nothing.
- **Never use the Supabase service-role key in `/api/chat` or any client code.** It bypasses RLS entirely and would silently bring back cross-store data leaks.
- **No hardcoded store IDs.** Sales require a real `storeId`, and the dashboard won't query until the real store is resolved.
- **The sales ledger is append-only.** There are no update or delete policies on `sales_transactions`.
- **Secrets stay out of Git.** `.env.local` is never committed, and `GEMINI_API_KEY` is server-only.

---

## Deployment

The easiest host for a Next.js app is [Vercel](https://vercel.com).

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `GEMINI_API_KEY`.
4. Deploy.
5. In Supabase, go to **Authentication → URL Configuration** and add your deployed URL as the **Site URL** (and a redirect URL).
6. Before real shop owners use it, re-enable **Confirm email** if you want verified accounts, and review the [Roadmap](#roadmap) items for production readiness.

---

## Troubleshooting

**"Invalid login credentials" right after registering**
Supabase returns this same message when the email hasn't been confirmed. In **Authentication → Providers → Email**, turn **Confirm email** off for development, or confirm the user manually from **Authentication → Users**.

**The AI advisor says the inventory is empty, but I have products**
The advisor can only read products if the request proves who you are. Check that:
- `app/api/chat/route.ts` is in the right folder (`app/api/chat/`), not accidentally copied into `lib/` or elsewhere.
- The `/api/chat` request payload (browser DevTools → Network) includes `message`, `storeId`, and `accessToken`.
- You restarted the dev server after changing the route file.

**Dashboard shows "We hit a snag loading your store"**
Your account has no linked store row. Check the `stores` table for a row with your user's `owner_id`. If it's missing, confirm the `on_auth_user_created` trigger exists:

```sql
select trigger_name from information_schema.triggers where trigger_name = 'on_auth_user_created';
```

**Everything is empty after enabling Row Level Security**
RLS blocks everything until policies exist. Run the policy SQL from [step 6](#6-turn-on-security-and-the-sign-up-trigger).

**"policy already exists" or "relation already exists" when running SQL**
That part was already applied. Skip that statement and run the rest.

**`git clone` says "Repository not found"**
For a private repo, GitHub reports "not found" when you lack access. Make sure you accepted the collaborator invite and that your SSH key is on your own GitHub account.

---

## Roadmap

Known gaps, roughly in priority order:

- [ ] **Atomic sales.** Move the stock check, sale insert, and stock deduction into one Postgres function (RPC), so two people selling the last units at the same time can't push stock negative, and a failed step can't leave a sale recorded without a stock deduction.
- [ ] **Input validation** on the add-product form (prices above zero, no negative stock)
- [ ] **Rate limiting** on `/api/chat` to control Gemini usage and cost
- [ ] **Demand-aware restocking.** Reorder suggestions currently use a margin-based rule of thumb. Next step is using sales velocity from `sales_transactions`.
- [ ] **Splitting `app/page.tsx`** into smaller components, so more than one person can work on the dashboard without conflicts
- [ ] **Backups.** Confirm point-in-time recovery or schedule regular exports before real shops depend on the data
- [ ] **Sales history and reports** by day, week, and month

---

## Contributing

Working on this with us? See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get access, set up your environment, and push changes through branches and pull requests.

---

## License

Private project. All rights reserved.
