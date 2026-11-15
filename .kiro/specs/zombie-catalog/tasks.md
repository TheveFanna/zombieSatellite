# Implementation Plan: zombie-catalog (S2)

## Overview

Build the static catalog data layer under `src/lib/catalog` exactly as specified in `design.md`: the types and an internal deep-freeze helper, the 7 raw entries, the three pure access functions with the `index.ts` barrel, the catalog acceptance tests, and a catalog-only source-boundary scanner. Language: TypeScript (strict, ES modules), tests in Vitest.

Ground rules for the implementer:

- `requirements.md` and `design.md` in this folder are the specification. Read the referenced design sections before each sub-task. Do not deviate from the module layout, field names, code values or function signatures given there.
- Every data value and every line of English copy comes from design.md, sections "Entry data: structured fields", "Entry data: source URLs" and "Entry data: copy drafts". These trace to `docs/reference/POSITIONING_AND_STORY.md` (the Fact_Source). Copy them as written. Do not add facts, numbers, equipment descriptions or sources, and do not consult other sources or model knowledge.
- Automated tests cover only the Verification scope of requirements.md (Req 1, Req 4.3, Req 5.1 to 5.9, Req 6, Req 7.1 to 7.3, Req 8). All other criteria are review checklist items listed in the relevant sub-task. Do not turn checklist items into tests.
- Keep tests minimal: plain Vitest assertions that enumerate the fixed data. No property-based generators (fast-check is not used), no scanner self-tests, no negative instrumentation, no multi-layer verification. If design.md seems insufficient, stop and ask instead of extending scope.
- Do not modify anything under `src/lib/orbit` or `tests/orbit`, and do not modify `tests/helpers/source-scan.ts` (design D20).
- Test command: `pnpm vitest run <paths>` (the `test` script is `vitest run`); full suite: `pnpm test`. Typecheck: `pnpm typecheck` (`tsc --noEmit`).
- Commit and push: the main agent commits locally once per top-level task after its tests and typecheck pass, staging files by name (never `git add -A` or `git add .`), then pushes immediately. Never push in the middle of a task.
- Execution is serial. Each top-level task depends on the one before it.

## Tasks

- [x] 1. Catalog types, deep-freeze helper and raw entry data
  - Depends on: nothing (first task).
  - [x] 1.1 Create `src/lib/catalog/types.ts`
    - Copy the code block of design.md "Data Models > Types (`src/lib/catalog/types.ts`)" verbatim: `NoradId`, `EntryStatus`, `Difficulty`, `UnplayableReason`, `BeaconMode`, `BeaconBlock`, internal `CatalogEntryBase`, `PlayableEntry`, `StoryOnlyEntry`, `CatalogEntry`.
    - All fields `readonly`; the discriminated union on `playable` per D14; absent values are `null`, never omitted (D1).
    - No imports in this file.
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 1.2 Create `src/lib/catalog/deep-freeze.ts`
    - Copy the `deepFreeze<T>` function of design.md "Components and Interfaces > `src/lib/catalog/deep-freeze.ts` (internal)" verbatim. No imports.
    - _Requirements: 7.5_
  - [x] 1.3 Create `src/lib/catalog/entries.ts`
    - Export `RAW_ENTRIES: readonly CatalogEntry[]` with the 7 entries as object literals typed against `CatalogEntry`, in Entry overview order 1002, 965, 7530, 5580, 26113, 28884, 2866 (D2). Only import: `import type { CatalogEntry } from './types';`. No logic.
    - Structured fields: copy every value from design.md "Entry data: structured fields" (slug, name, noradId, playable, difficulty, unplayableReason, status, launchDate, beacon.*, orbitLabel, operatorOrigin). Use the values only, not the parenthesised FS citations. Galaxy 15 `launchDate` is `null`.
    - Source URLs: copy from design.md "Entry data: source URLs" character for character, including the capitalised host `https://www.USGS.gov/...` for Galaxy 15.
    - Copy: copy `statusNote`, `hook` and `story` from design.md "Entry data: copy drafts". Each `story` is one string with no line breaks.
    - Review checklist (check by reading, no tests):
      - Every entry has every field of `CatalogEntry`, including `launchDate`, `difficulty`, `unplayableReason` and `orbitLabel` as `null` where absent (Req 2.1, 2.3, D1).
      - Launch dates are `YYYY-MM-DD`; Transit 5B-5 is exactly `1964-12-13` (Req 2.2, 5.1).
      - The 7 slugs are distinct and match `[a-z0-9]+(-[a-z0-9]+)*` (Req 2.6).
      - Beacon blocks match the table: LES-1 `downlinkMhz` 237, `displayFrequency` "about 237 MHz", `tumblePeriodS` 4, `beaconMode` null (D9, Req 5.8 to 5.10); `beaconMode` null for 1002, 5580 and 28884 (Req 3.6); `displayFrequency` is null exactly where `downlinkMhz` is null (Req 3.2).
      - `orbitLabel` is set only for 26113, 28884 and 2866, null for 1002, 965, 7530, 5580 (Req 4.4, 4.5, D10).
      - No field contains "236.997", "nuclear", or the LES-1 orbit figures 2800, 2,800 or 145.7 (Req 4.6, 5.3, 5.11).
      - Every Entry_Text is English only; every hook is one sentence (Req 4.2, 4.7, D11).
      - No Entry_Text mentions the in-app beacon; every real reception is credited to the named listener or listener group, never to the app; no equipment is described beyond the copy drafts (Req 9.1, 9.2, D18, D19).
      - Every fact appears in design.md's entry data, which traces to the Fact_Source (Req 4.1).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 9.1, 9.2_
  - [x] 1.4 Verify task 1 and hand over for commit
    - Run `pnpm typecheck`; it must pass (this catches missing fields and invalid codes in `entries.ts`).
    - Main agent: commit locally staging `src/lib/catalog/types.ts`, `src/lib/catalog/deep-freeze.ts`, `src/lib/catalog/entries.ts` by name, then push.
    - _Requirements: 2.1_

- [x] 2. Access interface, barrel and catalog acceptance tests
  - Depends on: task 1.
  - [x] 2.1 Create `src/lib/catalog/catalog.ts` and `src/lib/catalog/index.ts`
    - Copy the code blocks of design.md "Components and Interfaces > `src/lib/catalog/catalog.ts` (Access_Interface)" and "> `src/lib/catalog/index.ts` (barrel)" verbatim.
    - `ENTRIES = deepFreeze(RAW_ENTRIES)` and `PLAYABLE = Object.freeze(ENTRIES.filter(...))` built once at module load (D15, D16); list functions return those same arrays; `getCatalogEntry` uses strict-equality `find` (D17).
    - The barrel exports only the three functions and the types listed in design.md; `deepFreeze` and `RAW_ENTRIES` stay internal.
    - Review checklist (check by reading, no tests):
      - `getCatalogEntry` does no validation and cannot throw; unknown or invalid ids return `undefined` (Req 7.4, D6).
      - Every entry, nested `beacon` and `sourceUrls`, and both returned arrays are frozen (Req 7.5, D12).
      - No module under `src/lib/catalog` does network, storage, file system or other I/O (Req 7.6).
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x] 2.2 Create `tests/catalog/catalog.test.ts` with the example checks
    - Import only from the barrel: `import { getCatalogEntry, listCatalogEntries, listPlayableEntries } from '../../src/lib/catalog/index';` (same style as `tests/orbit/*.test.ts`).
    - Add a local `entryText(entry)` helper: the non-null values of `name`, `operatorOrigin`, `statusNote`, `beacon.displayFrequency`, `hook`, `story`, `orbitLabel` joined with a space. Case-insensitive checks lowercase the text (D5).
    - Implement every row of design.md "Correctness Properties > Example checks" as one `expect` each, grouped in `describe` blocks by requirement (Req 1, Req 5, Req 6, Req 7). Req 5.1 checks only `launchDate.slice(0, 4) === '1964'`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4, 7.1, 7.3_
  - [x] 2.3 Add Property 1 test to `tests/catalog/catalog.test.ts`
    - **Property 1: Every source URL is verbatim in the Fact_Source**
    - Read `docs/reference/POSITIONING_AND_STORY.md` with `readFileSync` (resolve from the repo root, e.g. `path.resolve(process.cwd(), 'docs/reference/POSITIONING_AND_STORY.md')`); loop over every entry, assert `sourceUrls.length > 0`, and assert each URL is a case-sensitive substring of the file.
    - Tag comment: `// Feature: zombie-catalog, Property 1: Every source URL is verbatim in the Fact_Source`.
    - **Validates: Requirements 4.3**
  - [x] 2.4 Add Property 2 test to `tests/catalog/catalog.test.ts`
    - **Property 2: No entry is described as nuclear-powered**
    - Loop over `listCatalogEntries()`; assert `entryText(entry).toLowerCase()` does not contain "nuclear".
    - Tag comment: `// Feature: zombie-catalog, Property 2: No entry is described as nuclear-powered`.
    - **Validates: Requirements 5.3**
  - [x] 2.5 Add Property 3 test to `tests/catalog/catalog.test.ts`
    - **Property 3: Lookup returns the listed entry for every catalog NORAD_ID**
    - Loop over `listCatalogEntries()`; assert `getCatalogEntry(e.noradId)` is `e` (`toBe`, same reference, D3) and its `noradId` equals the argument.
    - Tag comment: `// Feature: zombie-catalog, Property 3: Lookup returns the listed entry for every catalog NORAD_ID`.
    - **Validates: Requirements 7.2**
  - [x] 2.6 Verify task 2 and hand over for commit
    - Run `pnpm vitest run tests/catalog/catalog.test.ts` and `pnpm typecheck`; both must pass. If a data check fails, fix `entries.ts` to match design.md, not the test.
    - Main agent: commit locally staging `src/lib/catalog/catalog.ts`, `src/lib/catalog/index.ts`, `tests/catalog/catalog.test.ts` (and `src/lib/catalog/entries.ts` only if it was corrected) by name, then push.
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 3. Catalog source-boundary scan
  - Depends on: task 2 (the scan's sanity assertion needs `index.ts`).
  - [x] 3.1 Create `tests/helpers/catalog-source-scan.ts`
    - Implement `CatalogSourceViolation`, `listCatalogSourceFiles()` and `scanCatalogSources()` with the signatures and rules of design.md "Components and Interfaces > `tests/helpers/catalog-source-scan.ts` (test helper)" and D4, D20.
    - Walk `src/lib/catalog` recursively, `.ts` files only, sorted, relative names with `/` separators (normalise Windows `\`). Parse with `ts.createSourceFile` and check specifiers of `ImportDeclaration`, `ExportDeclaration` with a module specifier, `ImportEqualsDeclaration` with `ExternalModuleReference`, dynamic `import()` calls, `ImportTypeNode`, and `require()` calls.
    - Allowed only: a string literal starting with `./` or `../` whose `path.resolve(dirname(file), specifier)` lies inside `src/lib/catalog`. Anything else, including a non-literal argument, is a violation with a 1-based line number.
    - Use `tests/helpers/source-scan.ts` as a reading reference for node handling only; do not import from or change it.
    - _Requirements: 8.1, 8.2_
  - [x] 3.2 Create `tests/catalog/source-boundary.test.ts`
    - **Property 4: Every catalog specifier stays inside the catalog directory**
    - `expect(scanCatalogSources()).toEqual([])`, plus one sanity assertion that `listCatalogSourceFiles()` contains `'index.ts'`. Nothing else (no scanner self-tests).
    - Tag comment: `// Feature: zombie-catalog, Property 4: Every catalog specifier stays inside the catalog directory`.
    - **Validates: Requirements 8.1, 8.2**
  - [x] 3.3 Verify task 3 and hand over for commit
    - Run `pnpm vitest run tests/catalog/source-boundary.test.ts` and `pnpm typecheck`; both must pass.
    - Main agent: commit locally staging `tests/helpers/catalog-source-scan.ts`, `tests/catalog/source-boundary.test.ts` by name, then push.
    - _Requirements: 8.1, 8.2_

- [x] 4. Final checkpoint: full suite and review pass
  - Depends on: task 3.
  - Run `pnpm test` (full suite, including the untouched S1 tests under `tests/orbit` and `tests/scaffold`) and `pnpm typecheck`; both must pass. Confirm with `git status` that nothing under `src/lib/orbit`, `tests/orbit` or `tests/helpers/source-scan.ts` changed.
  - Review pass over `src/lib/catalog/entries.ts` against design.md entry data and the Fact_Source:
    - Red line (Req 9): no Entry_Text says the app receives, hears, detects or decodes a real signal; every reception is credited to a named listener or listener group; no added equipment descriptions; no mention of the in-app beacon.
    - Fact traceability (Req 4.1, 4.2, 4.6, 4.7, 5.10, 5.11): every value and sentence matches design.md; English only; no "236.997"; no 2800, 2,800 or 145.7; Transit 5B-5 `launchDate` is `1964-12-13`.
    - Access interface (Req 7.4 to 7.6): unknown lookup returns `undefined` without throwing, deep freeze in place, no I/O.
  - If the review requires a fix, the main agent commits the fixed files by name and pushes. Ensure all tests pass, ask the user if questions arise.

## Notes

- Test sub-tasks are not marked optional: requirements.md names these tests as acceptance tests in its Verification scope, so they are mandatory.
- design.md defines Correctness Properties, but its Testing Strategy rules out property-based generators: the input space is 7 fixed entries and one directory, so each property is checked by exhaustive enumeration in plain Vitest.
- The network guard `tests/setup/network-guard.ts` stays active; catalog tests make no network calls.
- All times are UTC; the catalog stores only calendar dates.
- Sub-tasks 2.2 to 2.5 all write `tests/catalog/catalog.test.ts`, so they run one after another.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["2.1"] },
    { "id": 5, "tasks": ["2.2"] },
    { "id": 6, "tasks": ["2.3"] },
    { "id": 7, "tasks": ["2.4"] },
    { "id": 8, "tasks": ["2.5"] },
    { "id": 9, "tasks": ["2.6"] },
    { "id": 10, "tasks": ["3.1"] },
    { "id": 11, "tasks": ["3.2"] },
    { "id": 12, "tasks": ["3.3"] }
  ]
}
```
