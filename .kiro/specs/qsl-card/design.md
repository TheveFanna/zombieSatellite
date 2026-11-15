# Design Document: qsl-card (S5)
## Overview
S5 turns the completed Session_Results that S4 stores into QSL_Cards. A pure layer under `src/lib/qsl` derives a Card_Model from one Session_Result and its catalog entry, renders it as Card_SVG text, orders the collection, assigns Group_Ordinals and derives the Pass_Number. A thin component layer under `src/components/qsl` reads the stored results through the S4 read path and performs the `.svg` and `.png` downloads with injected browser objects. Two client pages show the collection and one card.
### Normative inputs used by this design
- S4 `SessionResult`, `readSessionResults(storage)` (oldest first, never throws) and `formatUtc` (the only time format).
- S2 `getCatalogEntry(noradId)` and the entry fields `name`, `noradId`, `status` and `beacon.displayFrequency`.
- S3 `KeyValueStorage` and `TimerApi` from `src/components/pointing/deps.ts`.
- The Honesty_Scan rules 1.24 and 1.25 of `tests/scaffold/scaffold.test.ts`.
### Settled decisions carried over from requirements.md
- Only `completed: true` results become cards (Requirement 4).
- RQ-1: the Pass_Number identifies the pass; cards of one Pass_Group share it.
- RQ-2: no Catalog_Prose on the card face or the Card_Detail_Page; the detail page may show one Status_Label from the QSL_Copy.
- RQ-3: a card is addressed by `noradId`, `aosMs` and its Group_Ordinal, assigned in the Collection_Order.
### Design decisions made in this design
- D1 (rendering): the SVG proposal of the brief is confirmed. The card face is a deterministic SVG string built by a pure function, asserted as text in Node tests.
- D2 (copy location): the QSL_Copy module is `src/lib/qsl/copy.ts`, inside the pure layer. Reason: the Card_SVG builder is pure and must take every string it shows from the Card_Model or the QSL_Copy (Requirement 5, criterion 5), and the source boundary forbids `src/lib/qsl` from importing component code. A copy module of plain string literals has no side effects, so it fits the pure layer. The Honesty_Scan reads it like `src/components/session/copy.ts`.
- D3 (no-frequency note): `QSL_COPY.noFrequency` is `'No documented downlink frequency'`, the same wording as `SESSION_COPY.noFrequency`. It is a separate literal because the pure layer cannot import the S4 copy module.
- D4 (display rules): stated in "Display rules" below and pinned in tests.
- D5 (null best pointing error): shown as an em dash `—` (U+2014), the same presentation as the S4 completion screen.
- D6 (aborted results): the pages present no Session_Result with `completed: false`. They are not counted, not listed and not mentioned.
- D7 (ordering): newest `aosMs` first; tie-break for equal `aosMs` is the storage position, later stored first.
- D8 (Group_Ordinal): within a Pass_Group, Group_Ordinal 1 is the card listed first in the Collection_Order, so the most recently stored card of that pass. See "Group_Ordinal stability" for which changes shift them.
- D9 (routes): Collection_Page `/cards`; Card_Detail_Page `/cards/[noradId]/[aosMs]/[n]`, where `n` is the Group_Ordinal. Every card has a three-segment address, also when its Pass_Group has one card, so one rule resolves every address.
- D10 (Pass_Number format): `ZS-` + `noradId` padded to 5 digits + `-` + `aosMs` in base 36, upper case. Injective by construction (fixed-width id, separator, base-36 integer), so distinct passes can never share it.
- D11 (inline display): the pages show the Card_SVG through `<img src={svgDataUrl(svg)}>`, not by inserting the SVG markup into the DOM. The browser renders the image as an isolated SVG document, so even a missed escape could not inject markup into the page. Accessibility comes from the `alt` text and, on the detail page, from the field list rendered as HTML.
- D12 (S4 link): a plain `<Link href="/cards">View your QSL cards</Link>` is added to the completion section of `src/app/session/[noradId]/page.tsx`. It links to the collection, not to a computed card address, so it needs no logic and no state. It is shown in the completed phase unconditionally, also after an Abort; the collection then simply has no card for that session.
- D13 (PNG): the PNG is 2× the SVG size, 1200 × 760 px, rasterized from a `data:` URL of the SVG.
- D14 (file names): `zombiesatellite-qsl-<Pass_Number>-<n>.svg` and `.png`. The Pass_Number already names the pass, so no second time format is invented.
## Architecture
```
src/lib/qsl/                     pure, no React, no DOM
  copy.ts         QSL_COPY
  types.ts        CardKind, CardModel, CardField, CardAddress, CollectionCard
  format.ts       display rules (D4, D5)
  pass-number.ts  passNumber (D10)
  card-model.ts   buildCardModel, cardKind, cardFields, describeCard
  card-svg.ts     escapeXml, buildCardSvg, svgDataUrl, CARD_WIDTH, CARD_HEIGHT
  collection.ts   buildCollection, findCard, parseCardAddress, cardHref
  index.ts        barrel, the only entry file
src/components/qsl/              side effects, injected deps
  deps.ts               DownloadDeps, CanvasLike, Canvas2dLike
  collection-reader.ts  readCollection(storage)
  card-download.ts      createCardDownloader(deps)
  browser-deps.ts       createQslBrowserDeps()
src/app/cards/page.tsx                    Collection_Page
src/app/cards/[noradId]/[aosMs]/[n]/page.tsx  Card_Detail_Page
```
Data flow: `localStorage` → `readSessionResults` (S4) → `buildCollection` → `CollectionCard[]` → page → `buildCardSvg(card.model)` → `<img>` and the downloader.
`src/lib/qsl` imports only relative modules inside itself and the barrels `src/lib/session/index.ts` (for `formatUtc` and `SessionResult`) and `src/lib/catalog/index.ts` (for `getCatalogEntry` and the entry types).
## Card model
### Types (`types.ts`)
```ts
export type CardKind = 'real-manual' | 'demo-manual' | 'demo-auto-point' | 'real-auto-point';
export interface CardModel {
  readonly satelliteName: string;          // entry.name
  readonly noradId: NoradId;               // entry.noradId
  readonly frequencyText: string;          // displayFrequency verbatim, or QSL_COPY.noFrequency
  readonly aosUtc: string;                 // formatUtc(result.aosMs)
  readonly losUtc: string;                 // formatUtc(result.losMs)
  readonly maxElevationDeg: number;
  readonly lockedSeconds: number;
  readonly lockedRatio: number;
  readonly bestPointingErrorDeg: number | null;
  readonly passNumber: string;             // passNumber(result.noradId, result.aosMs)
  readonly demoMark: boolean;              // result.mode === 'demo'
  readonly autoPointMark: boolean;         // result.autoPointUsed
  readonly kind: CardKind;
  readonly simulatedNotice: readonly [string, string]; // QSL_COPY.simulatedNoticeLine1, Line2
}
export interface CardField { readonly label: string; readonly value: string }
export interface CardAddress { readonly noradId: NoradId; readonly aosMs: number; readonly ordinal: number }
export interface CollectionCard {
  readonly model: CardModel;
  readonly address: CardAddress;
  readonly href: string;          // cardHref(address)
  readonly statusLabel: string;   // QSL_COPY.statusLabels[entry.status]
  readonly fileBaseName: string;  // `zombiesatellite-qsl-${passNumber}-${ordinal}`
}
```
The raw `status`, `statusNote`, `hook` and `story` are never copied into these types (RQ-2).
### Functions (`card-model.ts`)
- `cardKind(mode, autoPointUsed): CardKind`. Total over the four combinations. S4 produces only the first three, since Auto_Point exists only in demo, but a stored `real` result with `autoPointUsed: true` is valid data and gets `real-auto-point` and the Auto_Point_Mark.
- `buildCardModel(result, entry): CardModel | null`. Returns `null` when `result.completed` is false; otherwise the frozen model of the table above. It reads nothing but its two parameters, `formatUtc`, `passNumber` and `QSL_COPY`.
- `cardFields(model): readonly CardField[]`. The labelled rows of the card face, in this fixed order: Frequency, AOS, LOS, Max elevation, Locked, Locked ratio, Best pointing error, Pass No. Labels come from `QSL_COPY.labels`, values from the display rules. The SVG builder and the detail page both use it, so the page never formats a value itself.
- `describeCard(model): string`. The `alt` text: `` `${satelliteName}, ${QSL_COPY.kindLabels[kind]}, AOS ${aosUtc}` ``.
### Display rules (`format.ts`, D4, D5)
| Value | Rule | Examples |
|---|---|---|
| `maxElevationDeg` | `toFixed(1)` + `°` | 47.26 → `47.3°` |
| `lockedSeconds` | T = `Math.round(s)`; T < 60 → `${T} s`; else `${⌊T/60⌋} min ${pad2(T mod 60)} s` | 42.4 → `42 s`; 59.6 → `1 min 00 s`; 512.4 → `8 min 32 s` |
| `lockedRatio` | `(r × 100).toFixed(1)` + ` %` | 0.6789 → `67.9 %` |
| `bestPointingErrorDeg` | `toFixed(1)` + `°`; `null` → `—` | 1.84 → `1.8°`; null → `—` |
| AOS, LOS | `formatUtc` | `2026-11-09 11:18:05 UTC` |
| NORAD | `NORAD ${noradId}` | `NORAD 7530` |
Elevation, ratio and the `—` match the S4 completion screen. Locked time uses minutes and seconds because real passes last up to about 15 min and demo IMAGE passes count hours of virtual seconds, where a bare second count is hard to read.
### Pass_Number (`pass-number.ts`, D10)
```ts
passNumber(noradId, aosMs) = `ZS-${String(noradId).padStart(5, '0')}-${aosMs.toString(36).toUpperCase()}`
```
Pinned example: `passNumber(1002, 46656)` is `ZS-01002-1000` (46656 = 36³). The function reads only its two integer arguments, so the cards of a Pass_Group share it and distinct passes differ.
## Honesty marks
`demoMark`, `autoPointMark` and `kind` are computed in `buildCardModel` only. Pages read them from the model and never compare `mode` or `autoPointUsed` (Requirement 3, criterion 5).
On the card face (see "Card face"):
| Kind | Main badge (top right) | Second badge | Frame |
|---|---|---|---|
| real-manual | `REAL TIME`, small green filled badge | none | solid green |
| demo-manual | `DEMO 60×`, large orange filled banner | none | solid orange |
| demo-auto-point | `DEMO 60×`, large orange filled banner | `AUTO-POINT`, dashed violet outline | dashed orange |
| real-auto-point | `REAL TIME`, small green filled badge | `AUTO-POINT`, dashed violet outline | dashed green |
Colour, badge size and frame style all differ between the three kinds S4 produces, so they can be told apart at thumbnail size. The Simulated_Notice is on every card regardless of kind.
## Copy (`src/lib/qsl/copy.ts`, D2)
Every value is a plain string literal in an `Object.freeze({...})` object, as in `SESSION_COPY`. Each string passes 1.24 and 1.25: the only radio term is in `simulatedNoticeLine2`, which also says "synthesized" and contains no reception word.
```ts
export const QSL_COPY = Object.freeze({
  cardTitle: 'zombieSatellite · simulated QSL',
  simulatedNoticeLine1: 'Confirms a simulated session, not a real reception.',
  simulatedNoticeLine2: 'Beacon tone synthesized from public orbital data.',
  demoMark: 'DEMO 60×',
  autoPointMark: 'AUTO-POINT',
  realTimeMark: 'REAL TIME',
  noFrequency: 'No documented downlink frequency',
  labels: Object.freeze({
    frequency: 'Frequency', aos: 'AOS', los: 'LOS', maxElevation: 'Max elevation',
    locked: 'Locked', lockedRatio: 'Locked ratio', bestPointingError: 'Best pointing error',
    passNumber: 'Pass No.', status: 'Catalog status', kind: 'Session',
  }),
  kindLabels: Object.freeze({
    'real-manual': 'Real time, manual pointing',
    'demo-manual': 'Demo at 60×, manual pointing',
    'demo-auto-point': 'Demo at 60×, auto-point',
    'real-auto-point': 'Real time, auto-point',
  } satisfies Record<CardKind, string>),
  statusLabels: Object.freeze({
    'still-transmitting': 'Still transmitting',
    'semi-operational': 'Semi-operational',
    'silent-again': 'Silent again since 2018',
    unconfirmed: 'Unconfirmed',
    historical: 'Historical',
  } satisfies Record<EntryStatus, string>),
  collectionTitle: 'Your QSL cards',
  collectionIntro: 'Each card records one simulated session that you followed to LOS. All times are UTC.',
  loading: 'Reading your cards…',
  emptyState: 'No cards yet. Follow a pass to LOS in a session, real time or demo, and its card appears here.',
  startSession: 'Pick a satellite',
  notFound: 'This card is not in the collection on this device.',
  backToCollection: 'Back to your cards',
  downloadSvg: 'Download SVG',
  downloadPng: 'Download PNG',
  pngFailed: 'This browser could not make the PNG. The SVG download still works.',
});
```
`collectionIntro` and `emptyState` contain "LOS" and no radio term. The status labels repeat the S4 wording, so a status reads the same on both pages.
## Card face (`card-svg.ts`, D1)
`buildCardSvg(model): string` returns one SVG document, `CARD_WIDTH` 600 × `CARD_HEIGHT` 380, `viewBox="0 0 600 380"`, with no random ids, no timestamps and no external references, so equal models give equal strings.
Layout, top to bottom:
1. Background rect, rounded, dark (`#0d1117`), frame stroke in the kind colour, dashed when `autoPointMark`.
2. `QSL_COPY.cardTitle` at the top left.
3. Main badge at the top right (table above); the `AUTO-POINT` badge below it when `autoPointMark`.
4. `satelliteName`, large and bold; `NORAD <id>` below it.
5. The eight `cardFields(model)` rows in two columns of four, label small and grey, value in a monospace font.
6. The two Simulated_Notice lines at the bottom, in an amber colour, inside a thin rule.
The root carries `role="img"` and an `aria-label` of `describeCard(model)`, and a `<title>` with the same text.
`escapeXml(text)` replaces `&`, `<`, `>`, `"` and `'` with `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;`. Every interpolated text, including `aria-label` and `<title>`, goes through it. Coordinates, colours and font names are constants of the module.
`svgDataUrl(svg)` returns `'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)`. `encodeURIComponent` is an ECMAScript global, not a DOM global.
SVG has no automatic line wrapping. The longest catalog name, "AMSAT-OSCAR 7 (AO-7)", and the longest field value, a `formatUtc` text, fit at the chosen font sizes; the Card_Visual_Check confirms the fit.
## Collection (`collection.ts`)
### `buildCollection(results)`
Input: Session_Results in storage order, oldest first, as `readSessionResults` returns them. Steps:
1. Pair each result with its storage index i.
2. Keep only results with `completed: true` (Requirement 4, criterion 1; D6).
3. Resolve `getCatalogEntry(result.noradId)`; skip a result whose entry is `undefined` (Requirement 4, criterion 2).
4. Sort by `aosMs` descending, then by i descending (D7). The order is total because storage indices are distinct.
5. Walk the sorted list and give each card Group_Ordinal 1, 2, … in order of appearance within its `(noradId, aosMs)` group (D8).
6. Return frozen `CollectionCard`s with model, address, href, statusLabel and fileBaseName.
### Address helpers
- `cardHref(address)` = `` `/cards/${noradId}/${aosMs}/${ordinal}` ``.
- `parseCardAddress(params)` takes the three route segments as `unknown` (Next.js gives `string | string[]`). It accepts only a string matching `/^[1-9]\d{0,4}$/` for `noradId`, `/^-?(0|[1-9]\d*)$/` with a safe-integer value for `aosMs`, and `/^[1-9]\d*$/` with a safe-integer value for `n`. Anything else gives `null`.
- `findCard(cards, address)` returns the card of `buildCollection` whose address equals all three parts, or `undefined`. The detail page resolves an address only through `buildCollection` plus `findCard`, so it applies the same rule as the list (Requirement 7, criterion 7).
### Group_Ordinal stability (Known limitation 3)
Group_Ordinal 1 is the most recently stored card of the pass.
- Storing a new completed result for a pass that already has cards gives the new card Group_Ordinal 1 and moves every earlier card of that pass up by one. An old address then opens the next older card of the same pass.
- S4's 50-result cap removes the oldest stored result. If it was a card, it held the highest Group_Ordinal of its group, so the other ordinals stay; its own address then shows the not-found message.
- Aborted results, results with unknown `noradId` and results of other passes never change a Group_Ordinal.
## Controllers (`src/components/qsl`)
### `readCollection(storage: KeyValueStorage): readonly CollectionCard[]` (`collection-reader.ts`)
`buildCollection(readSessionResults(storage))`. Never throws, because both parts never throw.
### Downloads (`deps.ts`, `card-download.ts`)
```ts
export interface Canvas2dLike { drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void }
export interface CanvasLike {
  getContext(type: '2d'): Canvas2dLike | null;
  toBlob(callback: (blob: unknown | null) => void, type: string): void;
}
export interface DownloadDeps {
  makeTextBlob(text: string, type: string): unknown;
  createObjectUrl(blob: unknown): string;
  revokeObjectUrl(url: string): void;
  triggerDownload(url: string, fileName: string): void;
  loadImage(src: string): Promise<unknown>;
  createCanvas(width: number, height: number): CanvasLike | null;
  timers: TimerApi;
}
export type PngOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'image-load-failed' | 'canvas-unavailable' | 'encode-failed' };
```
`createCardDownloader(deps)` returns:
- `downloadSvg(svg, fileBaseName): void`. Builds a blob of type `image/svg+xml;charset=utf-8`, creates an object URL, calls `triggerDownload(url, fileBaseName + '.svg')`, and revokes the URL after `REVOKE_DELAY_MS` = 1000 through `timers`.
- `downloadPng(svg, fileBaseName): Promise<PngOutcome>`. Loads `svgDataUrl(svg)` as an image; creates a canvas of `PNG_WIDTH` 1200 × `PNG_HEIGHT` 760 (D13); draws the image to the full canvas; calls `toBlob(…, 'image/png')`; on a blob, creates an object URL, triggers `fileBaseName + '.png'` and schedules the revoke. A rejected image load gives `image-load-failed`; a `null` canvas or `null` 2D context gives `canvas-unavailable`; a `null` blob or a throw from `toBlob` (a tainted canvas throws `SecurityError`) gives `encode-failed`. It never rejects.
### Browser dependencies (`browser-deps.ts`)
`createQslBrowserDeps(): { storage: KeyValueStorage; download: DownloadDeps }`, browser only, called inside `useEffect`. The storage wrapper repeats the try/catch wrapper of `src/components/session/browser-deps.ts`, which is not exported. `triggerDownload` creates an `<a download>` element, clicks it and removes it; `loadImage` wraps `new Image()` `onload` and `onerror`; `createCanvas` uses `document.createElement('canvas')`; `makeTextBlob` uses `new Blob([text], { type })`; `timers` binds `window.setTimeout` and `window.clearTimeout`. This module is checked by review, like the S4 browser dependencies.
## Pages
Both pages are `'use client'` and render a neutral loading state on the server and on the first client render, then read the collection in `useEffect`.
### `/cards` (`src/app/cards/page.tsx`)
- Heading `QSL_COPY.collectionTitle` and `QSL_COPY.collectionIntro`.
- Empty collection: `QSL_COPY.emptyState` and a link to `/session` labelled `QSL_COPY.startSession`.
- Otherwise a list in `buildCollection` order; each item is a `<Link href={card.href}>` around `<img src={svgDataUrl(buildCardSvg(card.model))} alt={describeCard(card.model)}>`, full width up to 600 px.
### `/cards/[noradId]/[aosMs]/[n]` (`src/app/cards/[noradId]/[aosMs]/[n]/page.tsx`)
- `parseCardAddress(useParams())`, then `findCard(readCollection(storage), address)`.
- Not found or unparsable: `QSL_COPY.notFound` and a link to `/cards` labelled `QSL_COPY.backToCollection`.
- Found: the large card image; a `<dl>` with `QSL_COPY.labels.kind` → `kindLabels[kind]`, the `cardFields(model)` rows and `QSL_COPY.labels.status` → `card.statusLabel`; the two Simulated_Notice lines; buttons `QSL_COPY.downloadSvg` and `QSL_COPY.downloadPng`; `QSL_COPY.pngFailed` after a failed PNG outcome; the back link.
### S4 completion screen (D12)
In the `phase === 'completed'` section of `src/app/session/[noradId]/page.tsx`, one line is added after the New session button: `<p><Link href="/cards">View your QSL cards</Link></p>`. `Link` is already imported. The JSX text "View your QSL cards" is already in Honesty_Scan coverage through `SESSION_PAGES`.
## Components and Interfaces
### `src/lib/qsl` (barrel `index.ts`)
`QSL_COPY`; types `CardKind`, `CardModel`, `CardField`, `CardAddress`, `CollectionCard`; `formatElevation`, `formatLockedDuration`, `formatLockedRatio`, `formatPointingError`; `passNumber`; `cardKind`, `buildCardModel`, `cardFields`, `describeCard`; `CARD_WIDTH`, `CARD_HEIGHT`, `escapeXml`, `buildCardSvg`, `svgDataUrl`; `buildCollection`, `findCard`, `parseCardAddress`, `cardHref`.
### `src/components/qsl`
`readCollection`; `createCardDownloader`, `REVOKE_DELAY_MS`, `PNG_WIDTH`, `PNG_HEIGHT`, `PngOutcome`; `DownloadDeps`, `CanvasLike`, `Canvas2dLike`; `createQslBrowserDeps`.
### `src/app`
New route directory `cards` with `page.tsx` and `[noradId]/[aosMs]/[n]/page.tsx`; one link line in `session/[noradId]/page.tsx`.
## Data Models
S5 stores nothing. Its only input is the S4 storage key `zombieSatellite.session.results`, read through `readSessionResults`. Every S5 value is recomputed from it on each page load.
## Correctness Properties
### Property 1: QSL source modules stay inside their boundary
Every import and export specifier under `src/lib/qsl` is relative and resolves inside `src/lib/qsl` or to the barrels of `src/lib/session` or `src/lib/catalog`. **Validates: Requirements 1.2, 1.4**
### Property 2: Card model fixture
For one hand-computed AO-7 result (`noradId` 7530, AOS `2026-11-09 11:18:05 UTC`, LOS `2026-11-09 11:30:39 UTC`, `maxElevationDeg` 47.26, `lockedSeconds` 512.4, `lockedRatio` 0.6789, `bestPointingErrorDeg` 1.84, `completed` true, `mode` real, `autoPointUsed` false), every field of the Card_Model and every row of `cardFields` equals its hand-written value, including `145.9775 MHz`, `47.3°`, `8 min 32 s`, `67.9 %` and `1.8°`. An IMAGE result gives `No documented downlink frequency`; a `null` best pointing error gives `—`. The display rule examples of D4 are pinned. **Validates: Requirements 2.1–2.10**
### Property 3: Marks exactly when
For the four combinations of `mode` and `autoPointUsed`, `demoMark` is true exactly for `demo`, `autoPointMark` exactly for `autoPointUsed`, and `kind` is the matching CardKind. **Validates: Requirements 3.3–3.5**
### Property 4: Eligibility
`buildCardModel` returns `null` for `completed: false`; `buildCollection` yields no card for it and skips a completed result with `noradId` 99999, which has no catalog entry. **Validates: Requirements 4.1, 4.2**
### Property 5: Card face text
The SVG of a plain card contains the name, `NORAD 7530`, both UTC texts, every `cardFields` value, the frequency text and both notice lines, and contains neither `DEMO 60×` nor `AUTO-POINT`. The mark texts appear exactly when the model carries the marks. A model whose name is `<b>&"'` appears only escaped. Two calls with one model give equal strings. **Validates: Requirements 3.1, 3.6, 5.1–5.4**
### Property 6: Order, ordinals and look-up
Over one fixture list in storage order (an older pass of LES-1, an IMAGE pass with the same `aosMs` stored later, three completed AO-7 results of one newer pass stored as demo auto-point, real manual and demo auto-point again with equal fields, one aborted result and one unknown `noradId`), `buildCollection` returns the AO-7 cards first with Group_Ordinals 1, 2, 3 in reverse storage order, then the IMAGE card before the LES-1 card. `findCard` with each card's address returns that card; an address with ordinal 4 returns `undefined`. `parseCardAddress` accepts the segments of each `href` and rejects a non-numeric segment. **Validates: Requirements 7.1, 7.2, 7.6, 7.7**
### Property 7: Pass_Number
`passNumber(1002, 46656)` is `ZS-01002-1000`; two calls with equal inputs agree; the three AO-7 cards of Property 6 share one Pass_Number; the Pass_Numbers of the three distinct passes differ pairwise. **Validates: Requirements 8.1–8.5**
### Property 8: Downloads against mocks
`downloadSvg` creates a blob of the SVG text with type `image/svg+xml;charset=utf-8`, triggers `<base>.svg` with its object URL and revokes it when the mock timer fires. `downloadPng` loads the SVG data URL, creates a 1200 × 760 canvas, draws the loaded image at `0, 0, 1200, 760`, encodes `image/png`, triggers `<base>.png` and resolves `{ ok: true }`; with a rejecting image loader it resolves `{ ok: false, reason: 'image-load-failed' }` and triggers nothing. **Validates: Requirements 6.1–6.4**
### Property 9: Copy honesty and routes
Checks 1.24 and 1.25 cover the property strings of `src/lib/qsl/copy.ts` and the JSX text of both S5 pages; check 1.19 admits exactly the S5 route files in addition to the existing ones. **Validates: Requirements 9.3, 9.4**
## Error Handling
- Storage unavailable or malformed: `readSessionResults` returns `[]`, so the collection shows the empty state.
- Unknown `noradId` in a stored result: skipped in `buildCollection`.
- Unparsable or stale Card_Address: the not-found message and the link back.
- PNG failure: a typed `PngOutcome`, shown as `QSL_COPY.pngFailed`; the SVG download is unaffected.
- No function of S5 throws on stored data.
## Testing Strategy
Tests run in the Vitest `node` environment, offline under the network guard.
- `tests/helpers/qsl-source-scan.ts` and `tests/qsl/source-boundary.test.ts`: a copy of the S4 scan with `src/lib/qsl` as root and the session and catalog barrels as the allowed outside files (Property 1).
- `tests/qsl/card-model.test.ts`: Properties 2, 3 and the `null` case of 4.
- `tests/qsl/pass-number.test.ts`: the pinned example and stability of Property 7.
- `tests/qsl/card-svg.test.ts`: Property 5.
- `tests/qsl/collection.test.ts`: Properties 4 (collection part), 6 and the shared and distinct Pass_Number part of 7.
- `tests/qsl/collection-reader.test.ts`: `readCollection` over a mock `KeyValueStorage` holding the JSON of two results returns their cards.
- `tests/qsl/card-download.test.ts`: Property 8 with recording mocks; no real image or file.
- `tests/scaffold/scaffold.test.ts`: `CARDS_PAGES` added to the rendered JSX texts, `['qsl copy strings', propertyStrings('src/lib/qsl/copy.ts')]` added to `checkedTexts`, and check 1.19 extended with `cards`, `app/cards/page.tsx` and `app/cards/[noradId]/[aosMs]/[n]/page.tsx` (Property 9).
Plain example assertions only; no property-based generators, no instrumentation of single helpers.
### Card_Visual_Check (final task, review item)
On a phone: the Collection_Page with one card of each of the three S4 kinds, then one Card_Detail_Page with a PNG and an SVG download. Check that the kinds are distinguishable at list size, that no text overflows the card, and that the PNG matches the inline card.
## Risks
- Older Safari versions taint a canvas after drawing an SVG image, and `toBlob` then throws. This is handled as `encode-failed`, and the SVG download stays available.
- An SVG drawn as an image cannot load web fonts, so the card uses system fonts and can look slightly different between devices. The layout leaves margin for this.
- Group_Ordinals can shift (Known limitation 3), so a bookmarked detail URL is not a permanent link.
