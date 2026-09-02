# Atmosphere preset screenshots (source)

Put original screenshots here, one directory per preset id:

- `mochott/`, `diary/`, `tomarigi/`, `poll/`, `kaku/`
- File names decide the display order: `01.png`, `02.png`, `03.png` ... (PNG / JPG / WebP)
- Any size. The long side is resized to 1600px; keep the same aspect ratio within one service (16:10 such as 1600x1000 for desktop, portrait for mobile apps).

Then run:

```
node scripts/atmosphere-screenshots.mjs
```

It writes `static/atmosphere/<id>/NN.webp` and regenerates `src/lib/atmosphere/presetScreenshots.ts`.
