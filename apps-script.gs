/**
 * RSVP backend for Out With The Lights.
 * Lives in your Google Sheet (Extensions → Apps Script) and saves every RSVP
 * to the "RSVPs" tab: Timestamp | Name | Attending | Plus ones | Note
 */

// ---- Settings ------------------------------------------------------------
const SHEET_NAME = 'RSVPs';
const SHOW_GUEST_LIST = true;   // false = the page won't show who's coming
// --------------------------------------------------------------------------

/** Sends the page the list of people who said yes. */
function doGet() {
  if (!SHOW_GUEST_LIST) return json_({ guests: [] });
  const rows = sheet_().getDataRange().getValues().slice(1);
  // If someone RSVPs more than once, their latest answer wins.
  const latest = new Map();
  rows.forEach(r => {
    const key = String(r[1]).replace(/^'/, '').trim().toLowerCase();
    if (key) latest.set(key, r);
  });
  const guests = [...latest.values()]
    .filter(r => r[2] === 'yes')
    .map(r => ({ name: String(r[1]).replace(/^'/, ''), plusOnes: Number(r[3]) || 0 }));
  return json_({ guests });
}

/** Saves one RSVP from the page. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const name = clean_(d.name, 80);
    if (!name) return json_({ ok: false, error: 'Name is required' });
    const attending = d.attending === 'no' ? 'no' : 'yes';
    const plusOnes = attending === 'yes' ? Math.max(0, Math.min(10, parseInt(d.plusOnes, 10) || 0)) : 0;
    const note = clean_(d.note, 500);

    sheet_().appendRow([new Date(), name, attending, plusOnes, note]);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error' });
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Timestamp', 'Name', 'Attending', 'Plus ones', 'Note']);
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
