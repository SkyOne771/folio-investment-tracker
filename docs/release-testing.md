# Release testing

Run `npm run verify` before publication. It builds the production artifact, validates its Worker entry point, runs the automated tests and checks live quote/dividend/FX schemas, Trading 212's published read-only contract, thirteen minute feeds including the S&P 500, daily history and historical FX.

Browser testing uses T3's collaborative browser. A successful unit suite does not replace these checks.

## Real statement checks

Start `npm start` on a local-only port and use a separate browser origin from production. Import the original XTB folder through the actual folder picker. Confirm unknown account cash currency instead of assuming it from the instrument's exchange. Check four independent account destinations, final record counts, tax refunds/reversals, open positions and re-import deduplication. Never commit the original files or account identifiers as fixtures.

Exercise account filters; all holdings/dividend sort columns; monthly/yearly dividends; all three chart metrics and date ranges; minute hover and previous-close change; currency changes and converter; manual buy/sell/dividend validation; export, clear, restore and reload. Confirm cancellation and malformed files cannot replace valid saved records.

Check all seven navigation pages at desktop, 768px tablet and 390px mobile widths, including dialogs and contained table scrolling. Check both themes. Inspect browser errors; missing historical feeds must remain explicit gaps rather than fabricated prices.

## Broker E2E environment

After building, run `npm run start:e2e` (default localhost:5230, or set PORT). This server binds only to loopback. Its test proxy supplies a fictional user identity and an in-memory R2-compatible store. The actual app Worker, validation, broker normalization, AES-GCM vault, same-origin guard and frontend run unchanged. Trading 212 upstream calls are replaced with fixtures; other market feeds remain live. Nothing is written to the production vault.

Use `e2e-key` / `e2e-secret` with Demo. These are dummy strings, not real credentials. Never enter a real API key in this environment.

Verify Remember connection, cleared credential inputs, absence of credentials in localStorage/export, encrypted vault contents, automatic reconnection after reload, older payment pagination and deduplication, immediate rate-limit feedback, failed reconnect retaining the existing snapshot, recovery and disconnect/forget.

Local-only controls:

- POST `/__test/control` JSON `{"brokerStatus":401}` (or 429/200) to simulate broker failures.
- `{"marketOutage":true}` simulates Yahoo failure; use a fresh instrument/cache to exercise an unavailable feed.
- `{"historyDelay":5000}` slows daily history; current quote refresh must remain usable.
- GET `/__test/state` exposes request methods/paths, vault object count and plaintext/tombstone checks. It never exposes vault values, API credentials or authorization headers.

Respect the app's ten-second broker request interval. A reload inside that interval can legitimately receive a rate-limit response; wait and retry before testing restoration.

## Scope of evidence

Record the tested commit and results. The local E2E identity/storage substitutes do not prove production sign-in, real Trading 212 account permissions or the deployed R2 binding. Check production's private access gate and read-only health/market endpoints separately. Never describe fixture connections as live authenticated-account tests. Browser viewport emulation is not a Safari/Firefox/device compatibility run.

## Trading 212 CSV history

Privately import original CSV files together using the dedicated header picker. Verify the combined ledger, split pairs, signed dividend corrections, GBX conversion and excluded cash-operation counts. Reimport the same and overlapping files; verify zero additions. Confirm a missing earlier purchase, conflicting operation ID, malformed CSV, cancelled preview, wrong account/environment and unavailable storage cannot change the existing portfolio. Verify current broker holdings, API dividends, XTB accounts and the encrypted saved connection are unchanged. Check the read-only CSV ledger in Activity, its pagination, market-symbol edits, historical coverage/FX/metrics and backup round trip. Use dummy broker credentials for vault checks; never publish originals or real-account results.

## Automated test scope

Keep automated tests for failures that can corrupt balances, lose saved data, mix accounts, misstate investment gains or expose credentials. The suite covers ledger accounting, historical valuation/FX and gaps, capital-flow exclusion, atomic and deduplicated XTB/Trading 212 imports, recovery, broker request restrictions and encrypted credential isolation.

Sorting, labels, logos, chart tick formatting and other reversible presentation behavior are checked in the collaborative browser when changed. Do not add a unit test for every helper branch or repeat an invariant already covered through an import or valuation scenario. Add a regression test when a material failure is otherwise unprotected; test count and coverage percentage are not targets.

Test-only maintenance does not require a production deployment or another financial import/browser run when application code and the build artifact are unchanged. Run `npm run verify` and the public-source guard before publishing the source changes.
