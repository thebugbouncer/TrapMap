# Map History / Snapshots — Feature Plan

Status: **planned, not built.** Most of this is useless until several snapshots
exist, so the first concrete step is shipping snapshot *capture* and letting it
accumulate. The viewing features come later.

## Goal
Let the client see how the trap map has changed over time — aggregate trends,
per-trap history, a scrub-through-time view, and a "what changed since last
snapshot" comparison.

## Core data decision
Store each snapshot as a **full copy of every trap** (id, activity level, lat,
lng) and **join across snapshots by trap ID**. Full copies (not diffs) make
moves/adds/removes free:
- moved trap = same ID, different lat/lng in that snapshot
- added trap = new ID appears in later snapshots
- removed trap = ID stops appearing
Caveat: do **not** recycle a deleted trap ID for a new trap, or history will
conflate the two.

## Capture (build this first)
- **"Save Version"** button on the editor page (behind the PIN).
- Captures current state + timestamp + optional label (e.g. "after June treatment").
- Manual only — kept separate from "Save Map" so snapshots happen deliberately.

## Storage (recommended)
A single append-only **`History`** sheet tab in long format, one row per trap
per snapshot:

| snapshot_id | label | timestamp | trap_id | activity | lat | lng |

Plus an optional **`Snapshots`** metadata tab (one row per snapshot:
snapshot_id | label | timestamp) for cheap version listing and notes.

Why not one tab per snapshot: tabs proliferate (~52/yr), and every viewing
feature needs to read *across* snapshots (dashboard groups by snapshot_id,
sparkline groups by trap_id) — trivial in one long table, painful across many
tabs. Scale is a non-issue: 46 traps × 7 cols ≈ 322 cells/snapshot, so even
1000 snapshots ≈ 322k cells, far under Sheets' 10M-cell limit.

Apps Script: `action=snapshot` appends current state to `History`;
`action=history` returns all snapshots for the viewer.

## Viewing features (build after snapshots accumulate)
1. **Trends dashboard** — stacked area/line of None/Light/Moderate/Heavy counts
   per snapshot, plus a single weighted "activity index" line
   (None=0, Light=1, Moderate=2, Heavy=3; average across traps) that trends down
   as things improve. The key client-facing "are we winning?" chart.
2. **Per-trap sparkline** — click a trap → popup mini-line of its activity across
   snapshots. Break the line on snapshots where the trap didn't exist.
3. **Scrubber timeline** — slider (one tick per snapshot) along the bottom of the
   client map; drag to re-render that snapshot via existing `makeIcon`. Rightmost
   stop = current live map. Optional ▶ play to animate through time.
4. **"Change since last snapshot" split circles** — each marker drawn as a split
   circle: **left half = last snapshot color, right half = current color.**
   - unchanged trap → solid (no split) so changes pop
   - new trap → left hollow/grey, right = new color
   - removed trap → ghost marker at old spot, left = old color, right hollow + ✕
   - moved trap → draw at current spot, optional faint arrow old→new
   - legend: "◐ left = last snapshot · right = now"
   - alt mode: compare snapshot N-1 vs N instead of now-vs-last (could be a toggle)

## Placement
- Editor (PIN-gated): the "Save Version" button.
- Client/view page: dashboard, sparklines, scrubber, split-circle compare (read-only).

## Open decisions (resolve before building viewers)
1. Snapshot label required, or optional with timestamp fallback?
2. Scrubber: include live "now" as last stop? Include ▶ play?
3. Split-circle: now-vs-last (default), snapshot-vs-snapshot, or a toggle?
4. Sparkline gaps for not-yet-existing traps: break line (rec) or hide trap?
5. Snapshot retention limit, or keep all forever (fine at this scale)?

## Implementation notes
- Charts: Chart.js or hand-rolled SVG sparklines (both lightweight).
- Scrubber/split-circle reuse existing `makeIcon` rendering — no new deps.
- Heatmap idea (deferred): Leaflet.heat plugin.
- Possible later deliverable: auto-generated monthly PDF report (trend chart +
  map snapshot + summary) for the client.
