# CUSIS Scraper (Playwright)

This repo now includes a proof‑of‑concept scraper that pulls timetable data from CUSIS after you authenticate manually (DUO approval required).

> **Prerequisites**  
> - Written approval from CUHK (you already have this)  
> - Node.js 18+  
> - Your CUHK login + DUO device handy

## 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

> `npx playwright install chromium` downloads the browser binary Playwright uses.

## 2. Run the scraper

```bash
npm run scrape:cusis
```

The script asks for:

| Prompt | Notes |
| --- | --- |
| Auto-fill creds? | `Y` lets Playwright fill the login form. `N` means you log in manually. |
| CUHK Username / Password | Only asked if auto-fill is enabled. Otherwise log in inside the browser window. |
| Term ID | e.g. `2025-26-T1` (the value used by our app). |
| Term label | Display string (defaults to a friendly version of the ID). |
| Auto-discover subjects? | Say `y` to open the lookup popup and scrape every subject automatically. |
| Subjects (manual fallback) | Only shown if the lookup fails or you answer `n`. Comma separated list (e.g. `CSCI,MATH`). |

The script:
1. Opens Chromium (non-headless).
2. Navigates to the login URL. If you chose auto-fill, Playwright enters your creds; otherwise you sign in manually.
3. Completes DUO (you approve on your device). For manual mode, **navigate yourself to “Manage Classes → Teaching Timetable”** and wait for the search form to finish loading before pressing Enter back in the terminal.
4. Once on the timetable page, the script opens the subject lookup, scrapes the codes, runs each search, and collects the tables.
5. Writes a JSON file under `data/`, e.g. `data/cusis-export-2025-26-T1-2025-11-08T12-30-45-000Z.json`.

> **Selectors warning:** The CUSIS DOM is old-school PeopleSoft markup.  
> If the script can’t find inputs or the results table, tweak the `SELECTORS` constant inside `scripts/scrape-cusis.ts`.

## 3. Import into MongoDB

Once you have a JSON export you trust:

1. Inspect/clean it if necessary.
2. Import it into Atlas with the helper script:
   ```bash
   npm run import:courses -- data/cusis-export-2025-26-T1-*.json
   ```
   (The importer wipes existing `Term`/`Course` collections before inserting the new data.)

## 4. Tips

- Always launch the scraper from a secure network.  
- Never hardcode credentials. If you want non-interactive mode later, set `CUSIS_USERNAME` / `CUSIS_PASSWORD` env vars just for that shell session.  
- Respect CUHK’s usage guidelines. Add delays or subject filters if they ask.  
- Keep an audit trail: archive the JSON exports alongside the dates you scraped them.
- To disable the old mock-data fallback in the API, set `ALLOW_FALLBACK_DATA=false` in `.env(.local)` once you fully rely on MongoDB.

Need more automation (CSV import, incremental updates, etc.)? Let me know and we’ll extend the tooling.***
