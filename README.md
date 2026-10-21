# Notion economic calendar

A small Forex Factory inspired calendar for GitHub Pages and Notion embeds. Plain HTML, CSS and JavaScript; no runtime dependencies, API key, paid hosting, or backend server.

Includes day/week views (Sunday–Saturday), period navigation, currency and impact filters, event search, upcoming-only mode, time-zone selection, automatic/light/dark themes, and shareable embed settings. Defaults to Europe/Warsaw, including daylight-saving changes. Events marked `All` remain visible under individual currency filters.

## Publish on GitHub Pages

1. Put these files in a **public GitHub repository**, on its `main` branch. GitHub Free supports Pages for public repositories.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Open **Actions → Refresh calendar and deploy Pages → Run workflow** (or push a change to `main`).
4. After the workflow succeeds, open the URL shown by the deployment, normally `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. Choose your widget filters and click **Copy embed link**. In Notion, type `/embed`, paste that URL, and resize the block. A wide block works best for the table.

Example settings: `?view=day&currency=USD&impact=Medium%2B&timezone=Europe%2FWarsaw&theme=dark`. Copy embed link includes the current settings, but deliberately not the selected date, so the calendar opens on the current day/week. URL settings override locally saved preferences. Browser storage is optional and safely ignored if blocked in an embed.

## Data and refresh

The widget uses the JSON weekly export linked from [Forex Factory's calendar](https://www.forexfactory.com/calendar): `https://nfs.faireconomy.media/ff_calendar_thisweek.json`.

GitHub Actions fetches and validates the export at 00:23, 06:23, 12:23 and 18:23 UTC, then deploys the static `public` folder. This avoids browser cross-origin restrictions. The browser reloads the hosted JSON every five minutes; this does not fetch directly from Forex Factory. The refresh timestamp is the download time, not the source's release/update time.

- The verified feed contains **this week only**. Navigation outside available data shows an explicit unavailable state. No history or next-week feed is promised.
- It includes forecasts and previous values, **not actual release results**. This is a periodically refreshed planning calendar, not a real-time trading feed.
- A failed or invalid feed stops deployment, preserving the existing hosted version. The widget flags data fetched more than 12 hours ago as potentially stale.
- GitHub scheduled runs can be delayed, and schedules in inactive public repositories may be disabled. Check Actions if the timestamp stops advancing.
- Data availability and reuse remain subject to the provider's terms. The widget is independent of Forex Factory and links to the original calendar. Use a licensed API if you need guaranteed service, redistribution rights, historical coverage, or actual results.

## Local preview

Requires Node.js 22+ and Python 3. No `npm install` is needed.

```sh
npm test
npm run refresh
npm run dev
```

Open `http://127.0.0.1:4173`. A downloaded snapshot is included so local preview works without refreshing first. Its timestamp is shown honestly and it will become stale; publishing always fetches fresh data. To import an already-downloaded original feed: `node scripts/refresh-calendar.mjs --input /absolute/path/export.json`.

## Hosting references

- [GitHub Pages and free public repository hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Notion embeds](https://www.notion.com/help/embed-and-connect-other-apps)

No GitHub repository or deployment is created by the local files alone.
