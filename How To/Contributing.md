# Contributing to Quantix AI

This is a private repo. This guide covers getting the code running on your machine and how we push changes without stepping on each other.

## 1. Get access

The repo owner adds you under **Settings → Collaborators → Add people** using your GitHub username. Accept the email invite before trying to clone.

## 2. Clone and install

```bash
git clone https://github.com/<owner>/<repo-name>.git
cd <repo-name>
npm install
```

Cloning a private repo over HTTPS needs authentication. GitHub no longer accepts account passwords, so use one of:

- **GitHub CLI (easiest):** install `gh`, run `gh auth login`, then clone.
- **Personal access token:** GitHub → Settings → Developer settings → Personal access tokens. Use it in place of the password.
- **SSH key:** add your public key to GitHub and clone with the `git@github.com:...` URL.

## 3. Environment variables

`.env.local` is not in the repo. Create it in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

**Use your own Supabase project and Gemini key for development.** Create a free Supabase project, run the SQL from the [README](./README.md#4-database-setup), and use that project's URL and anon key. This keeps test sales from altering real shop data, and nobody's testing breaks anyone else's.

Never commit `.env.local`, and never paste key values into issues, PRs, or chat channels that aren't private. If a key is ever committed by mistake, rotate it immediately. Deleting the commit isn't enough because the key stays in Git history.

Then start the app:

```bash
npm run dev
```

## 4. Making changes

Don't commit directly to `main`. Work on a branch:

```bash
git checkout main
git pull                                   # always start from the latest code
git checkout -b feature/short-description  # e.g. feature/atomic-sales

# ...make your changes...

git status                                 # check .env.local is NOT listed
git add .
git commit -m "Short description of the change"
git push -u origin feature/short-description
```

Then open a **Pull Request** on GitHub (**Compare & pull request**). Someone else reviews and merges it. After a merge, everyone updates:

```bash
git checkout main
git pull
```

### Branch naming

- `feature/...` for new functionality
- `fix/...` for bug fixes
- `chore/...` for cleanup, docs, and config

## 5. Database changes

Supabase tables, policies, and functions are **not** tracked by Git, so `git pull` won't update them. If you change the database:

1. Save the SQL as a numbered file in `supabase/`, e.g. `supabase/001_atomic_sales.sql`.
2. Commit it with the code that depends on it.
3. Mention it in the PR so reviewers know to run it on their own Supabase project.

Row Level Security is how stores are kept isolated from each other. Any new table that holds store data needs RLS enabled and a policy scoped with `get_my_store_id()`. Don't add `using (true)` policies, and never use the service-role key in client code or in `/api/chat`.

## 6. Avoiding merge conflicts

- Pull before you start, every time.
- `app/page.tsx` is large. If two people edit it at once, conflicts are likely. Tell each other which part you're working on, or split it into smaller components first.
- Keep PRs small and focused. One change per PR is easier to review and easier to undo.

## 7. Before opening a PR

- [ ] `npm run build` passes
- [ ] Tested the change locally with a real login (not just a logged-out page)
- [ ] No secrets, `.env.local`, or `console.log` debug leftovers in the diff
- [ ] Any SQL changes are saved in `supabase/` and mentioned in the PR description
