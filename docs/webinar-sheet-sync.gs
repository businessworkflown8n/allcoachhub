// Google Apps Script web app used by webinar-sync-processor to upsert one row per
// webinar into the sync spreadsheet (alternative to a service-account key).
//
// Setup: create a standalone Apps Script project with this file, set SHEET_ID and
// TOKEN, deploy as Web app (Execute as: Me, Who has access: Anyone), then set the
// Supabase secrets WEBINAR_SYNC_SHEETS_WEBAPP_URL (the /exec URL) and
// WEBINAR_SYNC_SHEETS_WEBAPP_TOKEN (same value as TOKEN).

const SHEET_ID = 'YOUR_SPREADSHEET_ID';
const TAB = 'Webinars';
const TOKEN = 'SAME_VALUE_AS_WEBINAR_SYNC_SHEETS_WEBAPP_TOKEN';

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, code: 'BAD_REQUEST', error: 'Invalid JSON' });
  }
  if (!req || req.token !== TOKEN) return out_({ ok: false, code: 'UNAUTHORIZED', error: 'Invalid token' });

  if (req.action === 'ping') {
    const sh = getSheet_();
    return out_({ ok: true, sheet: sh.getName(), rows: sh.getLastRow() });
  }
  if (req.action !== 'upsert' || !Array.isArray(req.row) || !req.row[0]) {
    return out_({ ok: false, code: 'BAD_REQUEST', error: 'Expected an upsert with a row' });
  }

  // Serialise writers so two updates for the same webinar can never both append.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_();
    if (sh.getLastRow() === 0 && Array.isArray(req.header)) writeRow_(sh, 1, req.header);

    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(req.row[0])) {
        const sheetVersion = Number(ids[i][1]);
        // Never let an older version overwrite a newer one.
        if (sheetVersion > Number(req.version)) return out_({ ok: true, superseded: true, sheet_version: sheetVersion });
        writeRow_(sh, i + 2, req.row);
        return out_({ ok: true, mode: 'update', row: i + 2 });
      }
    }
    writeRow_(sh, last + 1, req.row);
    return out_({ ok: true, mode: 'append', row: last + 1 });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(TAB) || ss.insertSheet(TAB);
}

// Plain-text format so dates, times and ids are stored exactly as sent.
function writeRow_(sh, rowNo, values) {
  const range = sh.getRange(rowNo, 1, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values.map(String)]);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
