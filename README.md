# Notion economic calendar

A compact Forex Factory inspired calendar for GitHub Pages and Notion embeds. It fetches calendar data **directly from PipAtlas in the browser**. Plain HTML, CSS and JavaScript; no runtime dependencies, API key, Worker, or scheduled data deployments.

Includes day/week views (Sunday–Saturday), period navigation, independent currency and impact checkboxes, event search, upcoming-only mode, time-zone selection, automatic/light/dark themes, and shareable embed settings. Defaults to Europe/Warsaw, including daylight-saving changes. **Global events** is an independent currency checkbox for events marked `All`. Unchecking every currency or every impact shows no events; Reset selects everything again.

## Compact layout and settings

Open the **Settings** button at the top-right of the widget, or visit `settings.html`. The settings page has independent switches for the title header, date navigation, filter bar, summary, footer, and compact spacing. The default hides the title, summary and footer and uses compact spacing. Disable navigation and filters too for a table-only widget. The Settings button stays available in every layout.

Theme, time zone, view and default filters can also be configured on the settings page. **Open calendar** applies them; **Copy embed link** includes every setting in the URL, so it works even when Notion blocks browser storage. Browser storage also saves preferences when available. There is no fine print under the table. If the optional footer is enabled it shows only an update timestamp and source link. Actual data failures or stale-data warnings still appear when needed.

## Publish on GitHub Pages

1. Put `main` in a **public GitHub repository**. GitHub Free supports Pages for public repositories.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Open **Actions → Deploy calendar to Pages → Run workflow** (or push a change to `main`).
4. After the workflow succeeds, open the URL shown by the deployment, normally `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. Choose your widget filters, open Settings, and click **Copy embed link**. In Notion, type `/embed`, paste that URL, and resize the block. A wide block works best for the table.

Example settings: `?view=day&currencies=USD,EUR&impacts=High,Low&timezone=Europe%2FWarsaw&theme=dark&showHeader=false&showFooter=false`. Empty selections use `currencies=` or `impacts=`. Old `currency=USD` and `impact=Medium%2B` links are migrated to independent selections. Copy embed link includes current settings, but deliberately not the selected date, so the calendar opens on the current day/week. URL settings override locally saved preferences.

## Data and refresh

The widget calls [PipAtlas's public calendar API](https://pipatlas.com/api-docs) at `https://pipatlas.com/api/calendar`. PipAtlas relays Forex Factory calendar data and enables cross-origin browser requests. No key or credentials are sent.

Data loads when the widget is first visible, then approximately every five minutes while visible (the timer checks every 30 seconds). Returning to the widget after five minutes triggers a refresh immediately. Hidden tabs pause requests. Requests time out after 20 seconds and never overlap. Background browser throttling can delay timers. PipAtlas caches responses for about five minutes, so repeated requests do not imply new data.

GitHub Actions only tests and deploys the static `public` folder after code pushes to `main` or a manual run. There is **no cron schedule, data-generation step, or bundled calendar snapshot** on this branch. Fresh data never requires a GitHub redeploy.

- The verified feed contains **this week only**. Navigation outside available data shows an explicit unavailable state. No history or next-week feed is promised.
- Forecast and previous values are included. The Actual column displays a value **only when PipAtlas supplies one**; otherwise it shows a dash. The verified response did not contain actuals. This is not a guaranteed real-time release feed.
- The footer shows PipAtlas's `updated` timestamp, not the browser download time. Its `stale` flag is surfaced, and timestamps older than 30 minutes get a warning.
- On a network, HTTP, timeout, or validation error, the last successfully loaded data remains in memory with a persistent failure warning. Without a prior success, an unavailable message appears. Reloading clears that in-memory fallback. The next visible polling cycle retries; there is no hidden fallback to the old Forex Factory snapshot.
- PipAtlas documents roughly 20 requests per minute per IP, shared across its API routes. Multiple embeds and other clients on the same IP share this allowance.
- PipAtlas is a third-party service for personal, educational and non-commercial use, with no SLA. Data can be delayed and its schema or availability can change. The optional footer links to PipAtlas. This widget is independent of PipAtlas and Forex Factory.

## Local preview

Requires Node.js 22+ and Python 3. No `npm install` is needed.

```sh
npm test
npm run dev
```

Open `http://127.0.0.1:4173` (settings: `http://127.0.0.1:4173/settings.html`). Use the HTTP server, not a `file://` URL: browsers restrict JavaScript modules opened directly from disk. Internet access to PipAtlas is required for the initial load. Tests are offline and cover dates, independent selections, settings URL round trips, legacy preferences, API mapping, invalid responses, request failures, and stale-data warnings.

## Branches

- `main`: PipAtlas with compact layout, checkbox filters and settings page.
- `codex/pipatlas`: earlier PipAtlas version, retained for comparison.

The old export-based implementation is no longer on `main`; it remains recoverable in Git history. A one-time deployment is needed to update an already hosted widget to this implementation.

## Hosting references

- [GitHub Pages and free public repository hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Notion embeds](https://www.notion.com/help/embed-and-connect-other-apps)

No GitHub repository or deployment is created by the local files alone.
