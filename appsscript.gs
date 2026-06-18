// Deploy this as a Web App:
//   Extensions > Apps Script > paste this code > Deploy > New deployment
//   Type: Web App, Execute as: Me, Who has access: Anyone
//   Copy the deployment URL and paste it into both index.html and view.html as the Script URL.
//
// Your sheet must have this header row (row 1):
//   Trap ID | Activity Level | Lat | Lng
// (legacy titles "ID" and "Intensity" are also accepted)
//
// Activity Level is stored as a number: 0=None, 1=Light, 2=Moderate, 3=Heavy

const SHEET_NAME = 'Sheet1';

// ── Activity level conversions ───────────────────────────────────────────────
const INTENSITY_TEXT_TO_NUM = { none: 0, light: 1, moderate: 2, heavy: 3, medium: 2, extreme: 3 };
const INTENSITY_NUM_TO_TEXT = { 0: 'None', 1: 'Light', 2: 'Moderate', 3: 'Heavy' };

function intensityToNum(str) {
  if (str === null || str === undefined || str === '') return 0;
  const n = parseInt(str);
  if (!isNaN(n) && INTENSITY_NUM_TO_TEXT[n] !== undefined) return n; // already a number
  return INTENSITY_TEXT_TO_NUM[String(str).toLowerCase().trim()] ?? 0;
}

function intensityToText(val) {
  const n = parseInt(val);
  return INTENSITY_NUM_TO_TEXT[isNaN(n) ? 0 : n] ?? 'None';
}

// ── Main handler ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (action === 'get') {
      return jsonResponse(getAllNodes(sheet));
    }
    if (action === 'set') {
      const id        = parseInt(e.parameter.id);
      const intensity = intensityToNum(e.parameter.intensity);
      const lat       = parseFloat(e.parameter.lat);
      const lng       = parseFloat(e.parameter.lng);
      if (!id || isNaN(lat) || isNaN(lng)) return jsonResponse({ error: 'Invalid params' });
      upsertNode(sheet, id, intensity, lat, lng);
      return jsonResponse({ ok: true });
    }
    if (action === 'delete') {
      const id = parseInt(e.parameter.id);
      deleteNode(sheet, id);
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────
// Accepts both new ("Trap ID", "Activity Level") and legacy ("ID", "Intensity") titles
function getCols(data) {
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  return {
    count: headers.length,
    idCol:  headers.findIndex(h => h === 'trap id' || h === 'id'),
    intCol: headers.findIndex(h => h.includes('activity') || h.includes('intensity')),
    latCol: headers.indexOf('lat'),
    lngCol: headers.indexOf('lng'),
  };
}

function getAllNodes(sheet) {
  const data = sheet.getDataRange().getValues();
  const { idCol, intCol, latCol, lngCol } = getCols(data);
  const nodes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = parseInt(row[idCol]);
    if (!id) continue;
    nodes.push({
      id,
      intensity: intensityToText(row[intCol]),  // return text to the UI
      lat: parseFloat(row[latCol]) || 0,
      lng: parseFloat(row[lngCol]) || 0,
    });
  }
  return nodes;
}

function upsertNode(sheet, id, intensity, lat, lng) {
  const data = sheet.getDataRange().getValues();
  const { count, idCol, intCol, latCol, lngCol } = getCols(data);

  // Writes only the four known cells so any extra columns are left untouched
  function writeRow(rowIndex) {
    sheet.getRange(rowIndex, idCol + 1).setValue(id);
    sheet.getRange(rowIndex, intCol + 1).setValue(intensity);  // numeric value (0–3)
    sheet.getRange(rowIndex, latCol + 1).setValue(lat);
    sheet.getRange(rowIndex, lngCol + 1).setValue(lng);
  }

  // Existing trap: update its row in place
  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][idCol]) === id) {
      writeRow(i + 1);
      return;
    }
  }

  // New trap: insert at the numerically sorted position by Trap ID
  let insertAt = data.length + 1;
  for (let i = 1; i < data.length; i++) {
    const rowId = parseInt(data[i][idCol]);
    if (!isNaN(rowId) && rowId > id) { insertAt = i + 1; break; }
  }
  sheet.insertRowBefore(insertAt);
  writeRow(insertAt);
}

function deleteNode(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const { idCol } = getCols(data);
  for (let i = data.length - 1; i >= 1; i--) {
    if (parseInt(data[i][idCol]) === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
