# Compound Map — Setup Guide

## What you have
- `index.html` — Editor (you and your friend use this)
- `view.html` — Client view (shareable link, read-only)
- This guide

---

## Step 1 — Create a GitHub repo (5 min)

1. Go to https://github.com and sign in (or create a free account)
2. Click **New repository**
3. Name it: `compound-map`
4. Set it to **Public**
5. Click **Create repository**

---

## Step 2 — Upload the files to GitHub

1. In your new repo, click **Add file → Upload files**
2. Upload both `index.html` and `view.html`
3. Also upload your compound image file (e.g. `map.jpg`)
4. Click **Commit changes**

---

## Step 3 — Enable GitHub Pages

1. In your repo, go to **Settings → Pages**
2. Under "Source", select **Deploy from a branch**
3. Select branch: **main**, folder: **/ (root)**
4. Click **Save**
5. After ~1 minute, your map will be live at:
   - `https://YOUR-USERNAME.github.io/compound-map/index.html` ← Editor
   - `https://YOUR-USERNAME.github.io/compound-map/view.html` ← Client link

---

## Step 4 — Swap in your compound image

In both `index.html` and `view.html`, find this line (near the top of the `<script>` section):

```js
const IMG_URL = 'https://upload.wikimedia.org/...'; // PLACEHOLDER
const IMG_W = 800, IMG_H = 600;
```

Replace with:
```js
const IMG_URL = 'map.jpg'; // your uploaded image filename
const IMG_W = 1200, IMG_H = 900; // your image's actual pixel dimensions
```

Do this in **both files** and re-upload them to GitHub.

---

## Step 5 — Set up Google Sheets

1. Create a new Google Sheet
2. Name the columns exactly:

| A  | B         |
|----|-----------|
| ID | Intensity |
| 1  | none      |
| 2  | medium    |

   Intensity values must be: `none`, `light`, `medium`, or `extreme`

3. Go to **File → Share → Publish to web**
4. Change "Web page" to **Comma-separated values (.csv)**
5. Make sure the correct sheet tab is selected
6. Click **Publish** and copy the URL

---

## Step 6 — Connect the Sheet to the map

1. Open your editor URL (`index.html`)
2. Paste the CSV URL into the **Google Sheet CSV URL** field in the sidebar
3. Click **Save**
4. Click **Test** to verify it works

The URL is stored in your browser. To share it across devices, paste the same URL on each device you use.

---

## Day-to-day workflow

**Your friend updates intensity:**
1. Opens Google Sheet
2. Changes the Intensity column for any node
3. Tells clients to click "Update Map" — or clicks it himself

**You add/move nodes:**
1. Open the editor (`index.html`)
2. Click on the map to place a node, enter its ID and intensity
3. Drag to reposition if needed
4. Manually add the new ID row to the Google Sheet

**Clients:**
1. Open the view URL (`view.html`)
2. Click "Update Map" to pull the latest data
3. Click any node to see its ID and intensity

---

## Troubleshooting

**"Sync failed" error:**
- Make sure the Sheet is published as CSV (not as a web page)
- Check that column headers are exactly `ID` and `Intensity`
- Make sure the Sheet is set to "Anyone with link can view"

**Nodes disappeared:**
- Nodes are stored in the browser's localStorage
- They persist on the same browser/device, but won't automatically appear on a new device
- Solution: export/import nodes (feature to add later) or just re-place them

**Image looks wrong:**
- Double-check `IMG_W` and `IMG_H` match your image's actual pixel dimensions

---

## Future features (easy to add later)
- Additional columns in the Sheet (notes, date, photo URL)
- Node export/import so positions sync across devices
- Auto-refresh on the view page every N minutes
- Google Apps Script for automatic write-back when adding nodes
