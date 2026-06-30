# Image Intelligence

An Android-primary mobile intelligence platform that ingests photos via camera or gallery, extracts real EXIF metadata (GPS, device, timestamp), runs GPT-4o vision analysis, builds a knowledge graph, timeline, and investigation workspace. Privacy-first: all data stays on-device in AsyncStorage; only AI analysis calls leave the device.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- Required env: `OPENAI_API_KEY` — for GPT-4o analysis, `SESSION_SECRET` — express sessions

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo ~54, React Native 0.81.5, expo-router v6, AsyncStorage
- API: Express 5, esbuild bundle (port 8080)
- AI: GPT-4o / GPT-4o-mini via `/api/vision/analyze`
- Native modules: expo-image-picker, expo-location, expo-media-library, expo-camera

## Where things live

- `artifacts/mobile/app/(tabs)/` — 5 tabs: Library, Graph, Timeline, Cases, Pipeline
- `artifacts/mobile/app/onboarding.tsx` — 5-step permission walkthrough (first launch)
- `artifacts/mobile/app/import.tsx` — camera + gallery import with real EXIF parsing
- `artifacts/mobile/app/(tabs)/privacy.tsx` — Settings screen (live permission status, data management)
- `artifacts/mobile/utils/exif.ts` — Real EXIF GPS parser (handles iOS decimal + Android DMS rational)
- `artifacts/mobile/utils/analyze.ts` — GPT-4o image analysis client
- `artifacts/mobile/context/PipelineContext.tsx` — batch AI processing queue
- `artifacts/mobile/context/ImageContext.tsx` — primary image store (AsyncStorage)
- `artifacts/mobile/types/image.ts` — canonical type definitions
- `artifacts/api-server/src/routes/vision.ts` — `/api/vision/analyze` endpoint

## Architecture decisions

- **Privacy-first local storage**: AsyncStorage only; no cloud sync, no telemetry
- **EXIF-first metadata**: GPS/device/timestamp extracted from EXIF before AI, not guessed by AI
- **Android primary**: `android.package`, full Android permissions array, adaptive icon, expo-location foreground-only, `READ_MEDIA_IMAGES` for Android 13+
- **Onboarding gates permissions**: first-launch walkthrough requests camera/library/location with live status; tracked via `onboarding_v1_complete` AsyncStorage key
- **Settings via gear icon**: privacy/settings is a hidden tab route (`href: null`) accessed from Library header gear button — keeps tab bar at 5 items
- **AI analysis is the only outbound network call**: enforced by API server; image sent as base64 URL; model validated against allowlist (gpt-4o, gpt-4o-mini)

## Product

- **Library**: 3-column photo grid with search by tag/scene/content; gear icon opens Settings; + button imports images
- **Graph**: force-directed knowledge graph connecting images by shared tags, GPS proximity, device, date, objects, faces
- **Timeline**: chronological view of images grouped by date with GPS/EXIF metadata display
- **Cases**: investigation workspace — create cases, attach images, add notes, track findings
- **Pipeline**: batch AI processing queue with 6 prompt templates (general, forensic, scene, text, geolocation, people), model selector, pause/resume/retry, batch reports
- **Settings**: live permission status for Camera/Library/Save/Location with request & Open Settings buttons; native integration info; activity log; delete-all with confirmation

## Android Permissions

```
CAMERA, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE,
READ_MEDIA_IMAGES, READ_MEDIA_VIDEO,
ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION,
INTERNET, ACCESS_NETWORK_STATE, VIBRATE
```

Blocked: `RECORD_AUDIO`, `READ_CONTACTS`, `WRITE_CONTACTS`

## User preferences

- Android-primary, privacy-first
- Real EXIF extraction (not simulated GPS or device info)
- No mock data anywhere in the app
- All simulated toggles removed

## Gotchas

- `expo-location` must be installed before adding its plugin to `app.json` (plugin validates at build time)
- `ONBOARDING_KEY` exported from `app/onboarding.tsx` — imported by `(tabs)/index.tsx` to check first launch. Avoid circular deps here.
- The onboarding check lives in `(tabs)/index.tsx` `useEffect` (not `_layout.tsx`) because expo-router Redirect only works inside route components
- EXIF GPS on Android comes as DMS rational strings like `"37/1,26/1,42600/1000"` — the parser in `utils/exif.ts` handles both iOS decimal and Android DMS formats
- Do NOT run `pnpm dev` at workspace root — use workflow restart or Expo Go QR scan

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `utils/exif.ts` for GPS/device/timestamp EXIF parsing (handles all platform edge cases)
