const TOKEN = 'mediapanel';
const TZ_DEFAULT = 'Pacific/Auckland';

// Your calendars
const CAL = {
  personal: [
    'ivantheservant@gmail.com',
    'luciaivan@gmail.com',
    '2ldu0nsu2v4h2jctpil9ph9gso@group.calendar.google.com',
    'a0no5gmq2ko8q2koqm2qptcflc@group.calendar.google.com'
  ],
  family: [
    'family07947208283780325176@group.calendar.google.com',
    'family08138198902160461554@group.calendar.google.com'
  ],
  nzHolidays: ['en.new_zealand#holiday@group.v.calendar.google.com'],
  hkHolidays: ['en.hong_kong#holiday@group.v.calendar.google.com']
};

function doGet(e) {
  try {
    const token = (e && e.parameter && e.parameter.token) ? String(e.parameter.token) : '';
    if (TOKEN && token !== TOKEN) return json_({ ok:false, error:'UNAUTHORIZED' }, 401);

    const tz = (e && e.parameter && e.parameter.tz) ? String(e.parameter.tz) : TZ_DEFAULT;
    const days = (e && e.parameter && e.parameter.days) ? Math.min(30, Math.max(1, parseInt(e.parameter.days, 10) || 7)) : 7;

    const now = new Date();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const todayEnd = new Date(start); todayEnd.setDate(todayEnd.getDate()+1);
    const tomorrowStart = new Date(todayEnd);
    const tomorrowEnd = new Date(todayEnd); tomorrowEnd.setDate(tomorrowEnd.getDate()+1);

    const out = {
      ok: true,
      tz,
      generatedAt: now.toISOString(),
      range: { start: start.toISOString(), end: end.toISOString() },
      next7days: fetchGroup_(CAL, start, end, tz),
      today: fetchGroup_(CAL, start, todayEnd, tz),
      tomorrow: fetchGroup_(CAL, tomorrowStart, tomorrowEnd, tz)
    };
    return json_(out, 200);
  } catch (err) {
    return json_({ ok:false, error:String(err && err.message ? err.message : err) }, 500);
  }
}

function fetchGroup_(groups, timeMin, timeMax, tz) {
  const result = {};
  Object.keys(groups).forEach(k => {
    result[k] = [];
    (groups[k] || []).forEach(calId => {
      try {
        const list = Calendar.Events.list(calId, {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50
        });
        const items = (list && list.items) ? list.items : [];
        items.forEach(ev => {
          const s = ev.start && (ev.start.dateTime || ev.start.date) ? (ev.start.dateTime || ev.start.date) : '';
          const e = ev.end && (ev.end.dateTime || ev.end.date) ? (ev.end.dateTime || ev.end.date) : '';
          result[k].push({
            calendarId: calId,
            id: ev.id || '',
            title: ev.summary || '',
            location: ev.location || '',
            start: s,
            end: e,
            allDay: !!(ev.start && ev.start.date && !ev.start.dateTime)
          });
        });
      } catch (e) {
        result[k].push({ calendarId: calId, error: String(e) });
      }
    });
  });
  return result;
}

function json_(obj, code) {
  // CRITICAL FIX: Create output first, THEN set headers
  const out = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  // These methods don't exist in Apps Script ContentService
  // Remove them - Apps Script handles CORS automatically for web apps
  // deployed as "Anyone" can access
  
  return out;
}
