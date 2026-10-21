export const FEED_URL = 'https://pipatlas.com/api/calendar';
export const REFRESH_INTERVAL = 5 * 60 * 1000;

function isTimestamp(value) {
  return typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

function optionalValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) return String(value);
  throw new Error('Invalid calendar value');
}

export function normalizePipAtlas(payload) {
  if (!payload || !Array.isArray(payload.events) || !isTimestamp(payload.updated)) {
    throw new Error('Invalid PipAtlas calendar response');
  }
  const events = payload.events.map(event => {
    if (!event || typeof event.name !== 'string' || !event.name.trim() ||
        typeof event.currency !== 'string' || !/^(?:[A-Z]{3}|All)$/.test(event.currency) ||
        !isTimestamp(event.date) || !['High','Medium','Low','Holiday'].includes(event.impact)) {
      throw new Error('Invalid PipAtlas calendar event');
    }
    return {
      title: event.name,
      country: event.currency.toUpperCase() === 'ALL' ? 'All' : event.currency,
      date: event.date,
      impact: event.impact,
      actual: optionalValue(event.actual),
      forecast: optionalValue(event.forecast),
      previous: optionalValue(event.previous),
    };
  }).sort((a,b) => Date.parse(a.date)-Date.parse(b.date));
  return {events,updatedAt:payload.updated,stale:payload.stale === true};
}

export async function fetchCalendar(fetcher = fetch) {
  const response = await fetcher(FEED_URL, {
    mode: 'cors',
    credentials: 'omit',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`PipAtlas returned HTTP ${response.status}`);
  return normalizePipAtlas(await response.json());
}

export function feedWarning(data,refreshFailed,now = Date.now()) {
  if (refreshFailed) return 'Refresh failed · showing previously loaded data';
  if (data.stale) return 'PipAtlas reports stale data';
  if (now-Date.parse(data.updatedAt) > 30 * 60 * 1000) return 'Possibly stale data';
  return '';
}
