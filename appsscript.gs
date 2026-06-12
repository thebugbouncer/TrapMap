// Deploy this as a Web App:
//   Extensions > Apps Script > paste this code > Deploy > New deployment
//   Type: Web App, Execute as: Me, Who has access: Anyone
//   Copy the deployment URL and paste it into both index.html and view.html as the Script URL.
//
// Your sheet must have this header row (row 1):
//   ID | Intensity | Lat | Lng
//
// Intensity is stored as a number: 0=None, 1=Light, 2=Medium, 3=Extreme

const SHEET_NAME = 'Sheet1';

// ── Intensity conversions ────────────────────────────────────────────────────
const INTENSITY_TEXT_TO_NUM = { none: 0, light: 1, medium: 2, extreme: 3 };
const INTENSITY_NUM_TO_TEXT = { 0: 'None', 1: 'Light', 2: 'Medium', 3: 'Extreme' };

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
function getAllNodes(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idCol  = headers.indexOf('id');
  const intCol = headers.findIndex(h => h.includes('intensity'));
  const latCol = headers.indexOf('lat');
  const lngCol = headers.indexOf('lng');
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
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idCol  = headers.indexOf('id');
  const intCol = headers.findIndex(h => h.includes('intensity'));
  const latCol = headers.indexOf('lat');
  const lngCol = headers.indexOf('lng');

  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][idCol]) === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  const newRow = new Array(headers.length).fill('');
  newRow[idCol]  = id;
  newRow[intCol] = intensity;  // numeric value (0–3)
  newRow[latCol] = lat;
  newRow[lngCol] = lng;
  sheet.appendRow(newRow);
}

function deleteNode(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idCol = headers.indexOf('id');
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
