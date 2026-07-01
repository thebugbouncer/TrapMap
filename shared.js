// Shared logic for the editor (index.html) and the read-only client map
// (view.html). Anything unique to one page — the PIN gate, the edit modal,
// the sheet-writing calls (pushNode/deleteNode/renameNode), the editor's
// sidebar list, the client's summary/legend panel — stays in that page.
// Load this after leaflet.js and before each page's own <script> block.

// ── Config shared by both pages ─────────────────────────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIwaoWbDzwdTkr4XpQBxb1vSeZ9x361JdAoxagH5Y6ZkaPcONfimDh4Yl179FOv_wuLw/exec';
const IMG_URL = 'Assets/Images/AMERIGE_HEIGHTS_COMMUNITY.jpg';
const IMG_W = 1625, IMG_H = 1042;

// ── Activity level ───────────────────────────────────────────────────────────
const INTENSITY_LEVELS = ['None', 'Light', 'Moderate', 'Heavy'];
const LEGACY_INTENSITY = { Medium: 'Moderate', Extreme: 'Heavy' };
const INTENSITY_COLORS = { None: '#40d080', Light: '#f0c040', Moderate: '#f07030', Heavy: '#e03040' };

// Sheet data may hold numeric levels (0-3), legacy names, or mixed casing.
function normalizeIntensity(val) {
  if (val === undefined || val === null || val === '') return 'None';
  const s = String(val).trim();
  if (INTENSITY_LEVELS[Number(s)] !== undefined && s !== '' && !isNaN(s)) return INTENSITY_LEVELS[Number(s)];
  const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (LEGACY_INTENSITY[cap]) return LEGACY_INTENSITY[cap];
  return INTENSITY_LEVELS.includes(cap) ? cap : 'None';
}

function intensityColor(intensity) {
  return INTENSITY_COLORS[intensity] || INTENSITY_COLORS.None;
}

// ── Map ──────────────────────────────────────────────────────────────────────
// Both pages use the same CRS.Simple image-overlay map; callers can add their
// own listeners (click-to-edit, drag, etc.) to the returned map.
function createTrapMap(elementId) {
  const map = L.map(elementId, { crs: L.CRS.Simple, minZoom: -2, maxZoom: 4, zoomSnap: 0.25 });
  const bounds = [[0, 0], [IMG_H, IMG_W]];
  L.imageOverlay(IMG_URL, bounds).addTo(map);
  map.fitBounds(bounds);
  return { map, bounds };
}

// ── Marker size slider ───────────────────────────────────────────────────────
// Shared between both sidebars: <input id="marker-size" type="range">.
// Falls back to a smaller default on phones so icons don't clump; once the
// user picks a size it's remembered per device and no longer auto-adjusts.
function getMarkerSize() {
  const saved = parseInt(localStorage.getItem('trapmap_marker_px'), 10);
  if (Number.isFinite(saved)) return saved;
  return window.matchMedia('(max-width: 700px)').matches ? 20 : 36;
}

// `onChange` is called whenever the size changes (drag, or a breakpoint
// crossing) — each page supplies its own callback since resizing markers
// means re-rendering that page's own `nodes`/`markers` state.
function initMarkerSizeSlider(onChange) {
  const el = document.getElementById('marker-size');
  if (!el) return;
  el.value = getMarkerSize();
  el.addEventListener('input', () => {
    localStorage.setItem('trapmap_marker_px', el.value);
    onChange();
  });
  window.addEventListener('resize', () => {
    if (localStorage.getItem('trapmap_marker_px') !== null) return;
    el.value = getMarkerSize();
    onChange();
  });
}

function makeIcon(node) {
  const color = intensityColor(node.intensity);
  const sz = getMarkerSize();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="15" fill="${color}" stroke="#fff" stroke-width="2.5" opacity="0.92"/>
    <text x="18" y="23" text-anchor="middle" font-size="12" font-weight="700" font-family="Syne,sans-serif" fill="#fff">${node.id}</text>
  </svg>`;
  return L.divIcon({
    html: svg, className: '', iconSize: [sz,sz], iconAnchor: [sz/2,sz/2], popupAnchor: [0,-sz*0.55]
  });
}

// ── Duplicate trap-ID resolution ─────────────────────────────────────────────
// Keep the first occurrence under its original ID. A later duplicate at the
// SAME position is a harmless accidental repeat and is dropped. A later
// duplicate at a DIFFERENT position is real data — give it a fresh, unused ID
// (the lowest open one) instead of losing it. `fixes` describes what changed
// so a caller with write access (the editor) can persist it back to the
// sheet; the read-only client page just uses it for a console warning.
function resolveDuplicates(list) {
  const groups = new Map();
  list.forEach(n => {
    if (!groups.has(n.id)) groups.set(n.id, []);
    groups.get(n.id).push(n);
  });

  const usedIds = new Set(list.map(n => n.id));
  let nextCandidate = 1;  // fill the lowest open ID first (e.g. reuse a gap left by a deleted trap)
  function allocateId() {
    while (usedIds.has(nextCandidate)) nextCandidate++;
    usedIds.add(nextCandidate);
    return nextCandidate;
  }

  const resolved = [];
  const fixes = [];  // { staleId, renamedTo? } — staleId's row must be removed from the sheet

  groups.forEach((entries, id) => {
    resolved.push(entries[0]);  // canonical: first occurrence keeps its ID
    for (let i = 1; i < entries.length; i++) {
      const dup = entries[i];
      const samePos = Math.abs(dup.lat - entries[0].lat) < 0.01 && Math.abs(dup.lng - entries[0].lng) < 0.01;
      if (samePos) {
        fixes.push({ staleId: id });  // exact repeat, nothing to keep
      } else {
        const newId = allocateId();
        const renamed = { ...dup, id: newId };
        resolved.push(renamed);
        fixes.push({ staleId: id, renamedTo: renamed });
      }
    }
  });

  return { resolved, fixes };
}

// ── Networking (read-only) ───────────────────────────────────────────────────
// Fetches and normalizes trap data. Throws on a bad response so callers can
// show their own error UI. Writes (set/delete/rename) are editor-only and
// live in index.html, since only the editor holds the PIN.
async function fetchTrapData(scriptUrl) {
  const res = await fetch(scriptUrl + '?action=get');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.map(n => ({ ...n, intensity: normalizeIntensity(n.intensity) }));
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function hideLoadingOverlay() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.add('hidden');
}

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
