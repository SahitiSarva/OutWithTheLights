/**
 * RSVP backend for your event page.
 * Paste this into Extensions → Apps Script from a new Google Sheet.
 * See README.md for the step-by-step setup.
 */

// ---- Settings ------------------------------------------------------------
const SHEET_NAME = 'RSVPs';
const SHOW_GUEST_LIST = true;   // false = page won't show who's coming

// Only needed if you want guests to get a real calendar invite by email.
const EVENT = {
  title: 'Out With The Lights · Diwali Party',
  start: '2026-11-06T19:00:00-05:00',
  end:   '2026-11-07T00:00:00-05:00',
  location: 'The Holmead House, Washington, DC',
  description: 'Diwali party! Bring friends, drinks and stories. Desi snacks will be provided. Early birds get a saree drape - bring a saree if you have one. Doors at 7pm. RSVP: https://outwiththelights.sahiti-sarva.workers.dev/',
};
const CALENDAR_ID = 'primary';
// --------------------------------------------------------------------------

/**
 * OPTIONAL: run this once from the editor to create the event in your
 * Google Calendar. After that, everyone who RSVPs "yes" with an email
 * is added as a guest and Google emails them the invite.
 * Requires the "Google Calendar API" service (Services → + → Google Calendar API).
 */
function setupCalendarEvent() {
  const ev = Calendar.Events.insert({
    summary: EVENT.title,
    location: EVENT.location,
    description: EVENT.description,
    start: { dateTime: EVENT.start },
    end: { dateTime: EVENT.end },
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
  }, CALENDAR_ID);
  PropertiesService.getScriptProperties().setProperty('EVENT_ID', ev.id);
  console.log('Created calendar event: ' + ev.htmlLink);
}

/** Returns the guest list (people who said yes) for the page. */
function doGet() {
  if (!SHOW_GUEST_LIST) return json_({ guests: [] });
  const rows = sheet_().getDataRange().getValues().slice(1);
  // If someone RSVPs more than once, their latest answer wins.
  const latest = new Map();
  rows.forEach(r => {
    const key = String(r[2] || r[1]).trim().toLowerCase();
    if (key) latest.set(key, r);
  });
  const guests = [...latest.values()]
    .filter(r => r[3] === 'yes')
    .map(r => ({ name: String(r[1]).replace(/^'/, ''), plusOnes: Number(r[4]) || 0 }));
  return json_({ guests });
}

/** Saves an RSVP and (optionally) sends a calendar invite. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const name = clean_(d.name, 80);
    if (!name) return json_({ ok: false, error: 'Name is required' });
    const email = clean_(d.email, 120);
    const attending = d.attending === 'no' ? 'no' : 'yes';
    const plusOnes = attending === 'yes' ? Math.max(0, Math.min(10, parseInt(d.plusOnes, 10) || 0)) : 0;
    const note = clean_(d.note, 500);

    sheet_().appendRow([new Date(), name, email, attending, plusOnes, note]);

    let invited = false;
    if (attending === 'yes' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invited = invite_(email);
    return json_({ ok: true, invited });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error' });
  } finally {
    lock.releaseLock();
  }
}

function invite_(email) {
  const eventId = PropertiesService.getScriptProperties().getProperty('EVENT_ID');
  if (!eventId) return false;
  try {
    const ev = Calendar.Events.get(CALENDAR_ID, eventId);
    const attendees = ev.attendees || [];
    if (!attendees.some(a => (a.email || '').toLowerCase() === email.toLowerCase())) {
      attendees.push({ email });
      Calendar.Events.patch({ attendees }, CALENDAR_ID, eventId, { sendUpdates: 'all' });
    }
    return true;
  } catch (err) {
    console.error('Invite failed for ' + email + ': ' + err);
    return false;
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Timestamp', 'Name', 'Email', 'Attending', 'Plus ones', 'Note']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Trims input and stops values starting with = + - @ being run as formulas.
function clean_(v, max) {
  const s = String(v || '').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
