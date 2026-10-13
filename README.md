# Quantix AI

Inventory, sales logging, and an AI stock advisor for small physical shops: corner stores, spaza shops, and local pet shops that don't have barcode scanners or an expensive POS.

The owner opens the app on a phone or desktop, logs a sale in a few taps (Cash or Card), checks live stock levels, and asks the AI advisor what to restock, which items are barely making a profit, and what's sitting on the shelf not selling.

---

## Features

- **Fast manual sales:** a `+` / `-` / direct-input counter per product, multi-unit sales, and a Cash vs. Card toggle. No scanner needed. Quantity is clamped to what's actually on the shelf.
- **Live inventory:** stock on hand, minimum required levels, cost and selling price, category, and supplier per product.
- **Real-time search:** filter inventory by product name or category as you type.
- **AI advisor ("Jarvis"):** powered by Gemini 2.5 Flash, reading the shop's live inventory from Supabase to give restock quantities, profit margin audits, and dead stock checks.
- **Automatic profit analysis:** gross profit and margin percentage per item, flagged as high-profit or low-margin.
- **Restock flags and purchase orders:** items below their minimum are flagged, and a printable purchase order draft can be generated for them.
- **Multi-tenant:** every store's products and sales are isolated from every other store (see [Security model](#security-model)).
- **Responsive:** desktop sidebar layout and a mobile bottom navigation bar.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling / UI | Tailwind CSS, shadcn/ui components, Lucide icons |
| Database & Auth | Supabase (PostgreSQL, Row Level Security, email/password auth) |
| AI | Google Gemini (`gemini-2.5-flash`) via `@google/genai` |

---

## Project structure

```
.
├── app/
│   ├── page.tsx              # Main dashboard: sales, inventory, AI advisor, PO modal
│   ├── login/
│   │   └── page.tsx          # Sign in / register
│   └── api/
│       └── chat/
│           └── route.ts      # AI advisor endpoint (authenticated, store-scoped)
├── lib/
│   ├── supabase.ts           # Browser Supabase client (anon key)
│   └── transactions.ts       # processProductSale(): sale insert + stock deduction
└── public/
    └── logo.jpeg
```

---

## Getting started

### 1. Prerequisites

- Node.js 18.18+ (or newer)
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini

### 2. Install

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
```

### 3. Environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

`GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix on purpose, so it stays server-side. Make sure `.env.local` is listed in `.gitignore` and is never committed.

### 4. Database setup

The app expects three tables. Column names below are the ones the code actually reads and writes:

| Table | Columns used |
|---|---|
| `stores` | `id` (uuid), `name`, `owner_id` (uuid, references `auth.users`, **unique**) |
| `products` | `id`, `store_id`, `name`, `category`, `stock_on_hand`, `min_required`, `cost_price`, `selling_price`, `supplier` |
| `sales_transactions` | `id`, `store_id`, `product_id`, `quantity`, `total_price`, `payment_method`, plus a timestamp |

Use `numeric` (not float) for the price columns.

Then, in the Supabase **SQL Editor**, set up the following. Skip any statement whose policy or object already exists.

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

-- sales_transactions (append-only: no update/delete)
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

> **Important:** if your tables were created through the Supabase table editor, check for a default policy named `Enable read access for all users` (`using (true)`). It lets anyone read every store's rows and must be dropped:
>
> ```sql
> drop policy "Enable read access for all users" on products;
> drop policy "Enable read access for all users" on sales_transactions;
> ```

For local development, you may want to turn off **Confirm email** under Supabase Authentication settings so test accounts can sign in immediately.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account (a store is created for it automatically), and add your first products.

---

## Security model

Quantix AI is multi-tenant, so isolation between stores is enforced in the database, not just in the UI.

- **Row Level Security** is enabled on `stores`, `products`, and `sales_transactions`. Policies resolve the caller's store through `get_my_store_id()`, which uses `auth.uid()`.
- **The AI route is authenticated.** The dashboard sends the user's access token to `/api/chat`, and the route builds a request-scoped Supabase client with that token. RLS then applies to the AI's inventory read exactly as it does everywhere else. Without the token, `auth.uid()` is null on the server and the query returns nothing.
- **Never put the Supabase service-role key in `/api/chat`.** It bypasses RLS entirely and would silently reintroduce cross-store data leaks.
- **No hardcoded store IDs.** `processProductSale` requires a `storeId`, and the dashboard never queries until the real store has been resolved.
- **Sales are append-only.** There are no update or delete policies on `sales_transactions`, so the ledger can't be quietly edited.

---

## Roadmap

Known gaps, in rough priority order:

- [ ] **Atomic sales.** Move the stock check, sale insert, and stock deduction into a single Postgres function (RPC) so two people selling the last units at the same time can't push stock negative, and a failed step can't leave a sale recorded without a stock deduction.
- [ ] **Input validation** on the add-product form (prices greater than zero, no negative stock).
- [ ] **Rate limiting** on `/api/chat` to control Gemini usage and cost.
- [ ] **Demand-aware restocking.** Reorder suggestions currently use a margin-based heuristic; incorporate sales velocity from `sales_transactions`.
- [ ] **Backups.** Confirm point-in-time recovery or schedule regular exports for production use.

---

## License

Private project. All rights reserved.
