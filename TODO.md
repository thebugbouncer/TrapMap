# TrapMap To-Do

- [ ] Map history / snapshots feature — see [SNAPSHOTS.md](SNAPSHOTS.md) for full plan.
      First step: ship manual "Save Version" capture so snapshots can accumulate;
      build the dashboard / sparkline / scrubber / split-circle viewers later.

- [ ] Replace map background with high-res export from Google Earth Pro
      - Download Google Earth Pro (free): https://www.google.com/earth/about/versions/
      - Navigate to Amerige Heights, zoom until image quality is sharp
      - File → Save → Save Image → set Resolution to maximum
      - Drop the exported file into Assets/Images/
      - Update IMG_URL and IMG_W/IMG_H in index.html and view.html
