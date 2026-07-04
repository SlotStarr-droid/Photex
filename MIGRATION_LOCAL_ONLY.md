# Photex: Local-Only Migration

## Overview
This document outlines the migration from a backend-dependent architecture to a fully local, backend-free app.

## Changes Required

### 1. Environment Setup
Remove backend requirement, keep only:
- `OPENAI_API_KEY` — for direct mobile-to-OpenAI calls

No longer needed:
- ~~`SESSION_SECRET`~~ — express sessions not required
- ~~Backend server (port 8080)~~ — all logic moves to mobile

### 2. Mobile App Changes

#### a) Direct OpenAI Integration
- Move vision analysis from `api-server` to mobile app
- Call OpenAI API directly from Expo (with API key in env)
- Replace server-side `/api/vision/analyze` with local function

#### b) AsyncStorage Remains Central
- All image metadata (EXIF, analysis results) stored locally
- No cloud sync, no telemetry — privacy-first unchanged

#### c) Prompt Templates
- Pipeline prompt templates remain in app
- Move from server validation to client-side model allowlist

### 3. Removed Components
- `artifacts/api-server/` — no longer needed for local operation
- Express routes, middleware, logging (pino) — can be removed
- Any backend build artifacts

### 4. Verification Steps
- Run `expo doctor` — ensure all Expo dependencies are healthy
- Run `pnpm audit` — verify no security vulnerabilities
- Test local storage with sample images
- Verify OpenAI integration without server

## Status
- [ ] Update mobile app with direct OpenAI client
- [ ] Remove server dependencies from workspace
- [ ] Test local-only flow end-to-end
- [ ] Run expo doctor + pnpm audit
- [ ] Verify build targets (APK)

## References
- `artifacts/mobile/utils/analyze.ts` — current server-side analysis
- `artifacts/mobile/context/PipelineContext.tsx` — batch processing
- `replit.md` — current architecture docs
