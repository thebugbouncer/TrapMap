// Deploy this as a Web App:
//   Extensions > Apps Script > paste this code > Deploy > New deployment
//   Type: Web App, Execute as: Me, Who has access: Anyone
//   Copy the deployment URL and paste it into both index.html and view.html as the Script URL.
//
// Your sheet must have this header row (row 1):
//   ID | Intensity | Lat | Lng

const SHEET_NAME = 'Sheet1';

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
      const intensity = toTitleCase(e.parameter.intensity);
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


function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const traps = JSON.parse(e.postData.contents);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const h = headers.map(x => String(x).trim().toLowerCase());
    const idCol  = h.indexOf('id');
    const intCol = h.findIndex(x => x.includes('intensity'));
    const latCol = h.indexOf('lat');
    const lngCol = h.indexOf('lng');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
    if (traps.length > 0) {
      const rows = traps.map(n => {
        const row = new Array(headers.length).fill('');
        row[idCol]  = n.id;
        row[intCol] = toTitleCase(n.intensity);
        row[latCol] = n.lat;
        row[lngCol] = n.lng;
        return row;
      });
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    return jsonResponse({ ok: true });
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function toTitleCase(str) {
  if (!str) return 'None';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

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
      intensity: toTitleCase(String(row[intCol] || 'None').trim()),
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
      // Delete and re-append to bypass any cell-level data validation
      sheet.deleteRow(i + 1);
      break;
    }
  }

  const newRow = new Array(headers.length).fill('');
  newRow[idCol]  = id;
  newRow[intCol] = intensity;
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
