# Notion economic calendar

A small Forex Factory inspired calendar for GitHub Pages and Notion embeds. This branch fetches calendar data **directly from PipAtlas in the browser**. Plain HTML, CSS and JavaScript; no runtime dependencies, API key, Worker, or scheduled data deployments.

Includes day/week views (Sunday–Saturday), period navigation, currency and impact filters, event search, upcoming-only mode, time-zone selection, automatic/light/dark themes, and shareable embed settings. Defaults to Europe/Warsaw, including daylight-saving changes. Events marked `All` remain visible under individual currency filters.

## Publish on GitHub Pages

1. Merge or copy this branch's files into `main` in a **public GitHub repository**. GitHub Free supports Pages for public repositories. The existing `main` branch retains the original export-based version until you merge.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Open **Actions → Deploy calendar to Pages → Run workflow** (or push a change to `main`). The feature branch does not automatically deploy on push.
4. After the workflow succeeds, open the URL shown by the deployment, normally `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. Choose your widget filters and click **Copy embed link**. In Notion, type `/embed`, paste that URL, and resize the block. A wide block works best for the table.

Example settings: `?view=day&currency=USD&impact=Medium%2B&timezone=Europe%2FWarsaw&theme=dark`. Copy embed link includes the current settings, but deliberately not the selected date, so the calendar opens on the current day/week. URL settings override locally saved preferences. Browser storage is optional and safely ignored if blocked in an embed.

## Data and refresh

The widget calls [PipAtlas's public calendar API](https://pipatlas.com/api-docs) at `https://pipatlas.com/api/calendar`. PipAtlas relays Forex Factory calendar data and enables cross-origin browser requests. No key or credentials are sent.

Data loads when the widget is first visible, then approximately every five minutes while visible (the timer checks every 30 seconds). Returning to the widget after five minutes triggers a refresh immediately. Hidden tabs pause requests. Requests time out after 20 seconds and never overlap. Background browser throttling can delay timers. PipAtlas caches responses for about five minutes, so repeated requests do not imply new data.

GitHub Actions only tests and deploys the static `public` folder after code pushes to `main` or a manual run. There is **no cron schedule, data-generation step, or bundled calendar snapshot** on this branch. Fresh data never requires a GitHub redeploy.

- The verified feed contains **this week only**. Navigation outside available data shows an explicit unavailable state. No history or next-week feed is promised.
- Forecast and previous values are included. The Actual column displays a value **only when PipAtlas supplies one**; otherwise it shows a dash. The verified response did not contain actuals. This is not a guaranteed real-time release feed.
- The footer shows PipAtlas's `updated` timestamp, not the browser download time. Its `stale` flag is surfaced, and timestamps older than 30 minutes get a warning.
- On a network, HTTP, timeout, or validation error, the last successfully loaded data remains in memory with a persistent failure warning. Without a prior success, an unavailable message appears. Reloading clears that in-memory fallback. The next visible polling cycle retries; there is no hidden fallback to the old Forex Factory snapshot.
- PipAtlas documents roughly 20 requests per minute per IP, shared across its API routes. Multiple embeds and other clients on the same IP share this allowance.
- PipAtlas is a third-party service for personal, educational and non-commercial use, with no SLA. Data can be delayed and its schema or availability can change. This widget links to both PipAtlas and Forex Factory and is independent of both.

## Local preview

Requires Node.js 22+ and Python 3. No `npm install` is needed.

```sh
npm test
npm run dev
```

Open `http://127.0.0.1:4173`. Internet access to PipAtlas is required for the initial load. Tests are offline and cover date conversion, filters, API field mapping, invalid responses, request failures, and stale-data warnings.

## Branches

- `main`: original Forex Factory export downloaded by scheduled GitHub Actions.
- `codex/pipatlas`: browser requests to PipAtlas; no scheduled deployments.

Switch with `git switch main` or `git switch codex/pipatlas` after saving any local changes. A one-time deployment is needed to switch an already hosted widget to this implementation.

## Hosting references

- [GitHub Pages and free public repository hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Notion embeds](https://www.notion.com/help/embed-and-connect-other-apps)

No GitHub repository or deployment is created by the local files alone.
