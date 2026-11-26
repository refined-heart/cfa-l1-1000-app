# CFA Study V2 — 2,318 Practice Questions

A browser-first V2 QA implementation in `v2/` for an existing Expo CFA study repository. It is intentionally separated from the V1 Android app; do not replace the APK until the user accepts the new UI and data model.

**Development:** `npm install && npm run dev` (port 5173)
**Build:** `npm run build`
**Logic tests:** `npm run test:logic`

On first launch, use the Import action to select the user-provided `practice.zip`. The question archive is never transmitted to or stored in the public GitHub repository. Browser persistence is via IndexedDB. Profiles are separate and can be exported as versioned JSON or per-profile CSV.

Features: subject/module tree, case studies and HTML tables, objective + manual-answer question types, immediate feedback, original English explanation, curated Chinese high-level module notes, optional Chrome Translator API for per-item English-to-Chinese machine translation on desktop, sectioned wrong-question review, quality flags and exclusions, too-easy filter, multi-profile records (up to 5), analytics with question deep links, JSON export/import and CSV reporting.

See `../V2_SETUP.md` for a Chinese setup guide and explicit limitations.
