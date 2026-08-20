# AvaYar M6 private beta checklist

## Build

```powershell
npm ci
npm run check
```

## Load unpacked

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select the repository `dist-extension` directory.
5. Start the AvaYar backend with `npm run dev`.
6. Open an article and click the AvaYar toolbar action.

## Product test

- Persian article, full playback, female voice.
- Persian article, summary playback, male voice.
- English article, translated full playback.
- English article, translated summary playback.
- Pause and stop.
- Restricted browser page returns an actionable error.
- Extension artifact contains no provider credential.
