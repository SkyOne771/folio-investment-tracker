# Folio — Investment Tracker

[![Checks](https://github.com/SkyOne771/folio-investment-tracker/actions/workflows/health.yml/badge.svg)](https://github.com/SkyOne771/folio-investment-tracker/actions/workflows/health.yml)

A self-hosted investment portfolio and dividend tracker with a neutral dark theme, PLN-first currency display, read-only Trading 212 connections and local XTB statement imports.

**This repository contains application code and synthetic test fixtures only. It does not include personal portfolios, broker statements, account credentials, backups or a hosted credential vault.**

## Features

- Portfolio value, invested capital, realized/unrealized gains and recorded dividend income.
- One-day charts with one-minute intervals, a 0% starting point, a dotted zero baseline, and percentage/amount hover values.
- Historical performance reconstructed from recorded trades, historical daily prices and reference FX, with explicit gaps where data is unavailable.
- Separate charts for portfolio value, total return and dividends, with labeled currency scales.
- Monthly/yearly received dividends and separately labeled future estimates.
- S&P 500 price-index comparisons on minute and historical charts, plus separate percentage references beside dividend and allocation charts.
- Read-only Trading 212 Invest/Stocks ISA positions and dividend-history pagination.
- Merge-only XTB recovery-file imports preserve existing Trading 212 snapshots, mappings, connections, preferences and other records. Recovery files are parsed locally and deduplicate account-scoped transactions.
- XTB Excel/CSV imports for IKE and separate standard PLN, EUR and USD cash accounts; multi-file/folder selection, preview, deduplication and reconciliation.
- Sortable holdings and dividend tables, company names, account filters and JSON backup/restore.
- Position changes for 1D, 1W, 1M, 3M and 1Y, in display-currency amounts and native price percentages; All shows unrealised return since purchase. Period amounts use current shares and fixed reference FX, excluding trades and dividends.
- Company and fund-issuer icons bundled locally, with letter fallbacks. Viewing a portfolio makes no external logo-service requests.
- Color-coded transaction labels: green buys, red sells and blue dividend income.
- Ten display currencies: PLN, USD, EUR, GBP, CHF, CAD, JPY, AUD, SEK and DKK.
- Historical chart currency overlays for 1W, 1M, 3M, 1Y and All: the same recorded ledger translated at daily rates versus rates frozen at the first available chart date. Value, return and dividend metrics are supported; gaps remain explicit. The return comparison shows the difference between flow-adjusted return estimates as an FX contribution. Historical broker snapshots cannot replace missing trade history; imported-only coverage is clearly labeled.
- Optional 1D chart currency overlay using minute FX feeds: portfolio including FX, price-only performance at starting FX, and the FX contribution. The contribution includes the price/FX interaction and is expressed in percentage points of starting value. Missing FX preserves the original fixed-FX chart with an explicit notice.
- Optional sortable currency-influence columns for 1D–1Y (click a heading for highest amounts first, click again for lowest): price effect at starting FX, currency effect including the interaction, and their combined change. Uses current shares and historical/current daily reference FX; excludes trades and dividends. All-time purchase-date attribution is unavailable.
- Three saved appearance choices: Light, Dark and Midnight. Midnight uses a black canvas, charcoal cards, compact spacing and green/red performance colors.
- Responsive layouts and data-health checks.
- Expand performance, allocation and dividend charts to fill the viewport; close with the button or Escape.

## Quick start

Requires **Node.js 22+** and npm.

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:5173**. To use another port:

```sh
PORT=5188 npm start
```

The first visit shows an explicitly labeled **synthetic example portfolio**. Choose **Start my portfolio** to replace it with your own records. Portfolio data stays in that browser profile; export backups regularly.

The development server binds to loopback. It is not a public production server.

## Checks and development

```sh
npm test                # calculation, parser, API, security and vault tests
npm run verify          # build + artifact validation + tests + live-provider checks
npm run start:e2e       # local full-stack environment with a fictional broker
```

The E2E environment runs at http://localhost:5230 by default. It uses the actual frontend, Worker and AES-GCM vault implementation with a fictional identity, in-memory storage and mocked Trading 212 responses. Its `e2e-key` / `e2e-secret` strings are dummy fixtures, never real credentials. **Do not enter real credentials in the E2E environment.**

See [release testing](docs/release-testing.md), [contributing](CONTRIBUTING.md) and the [security model](SECURITY.md).

GitHub Actions runs on pushes, pull requests, manual dispatch and every six hours. Live checks validate quote/dividend/FX responses, Trading 212's published API schema, European minute feeds and historical data. External-provider outages can fail these checks.

## Broker connections

### Trading 212

In **Connections**, choose Live or Demo and supply your own API key and secret. Use only the required **read permissions**: account data, portfolio, dividend history and metadata where needed. The connector uses fixed HTTPS endpoints and GET requests; it cannot place orders or modify pies.

Without Remember connection, credentials remain in page-session memory. On a correctly authenticated production deployment, **Remember this connection securely** stores them encrypted in server-side R2 storage, bound to the signed-in identity. Credentials are excluded from portfolio exports and browser storage. Disconnect/Forget removes the saved connection.

A snapshot describes current positions, not a complete trade ledger. Earlier Trading 212 performance cannot be reconstructed from a current snapshot alone. One connected Trading 212 account is supported at a time.

### XTB

Use original `.xlsx` statements or Cash Operations CSV exports. No XTB password, website scraping or public XTB API is required.

1. Export full Cash Operations history separately for each XTB cash account.
2. Select multiple files or a folder in **XTB import**.
3. Confirm each account's type, reference and cash currency. Currency is left for confirmation when the statement cannot identify it reliably.
4. Review errors, symbol mappings, exclusions and duplicates, then import the validated batch.

Files are parsed in the browser and are not uploaded to the application server. IKE and each standard currency account stay separate even when they hold the same instrument. Re-importing overlapping statements deduplicates account-scoped operations.

PDFs, old `.xls` files and position-only reports cannot reconstruct the trade ledger. Unsupported operations require review. Deposits, withdrawals, FX movements and interest are not treated as equity investments or dividend income.

## Calculations and data limits

- **Invested capital** is the acquisition cost of current holdings, including recorded purchase fees. It is not lifetime cash deposits.
- **Recorded purchases** sums recorded buys, including fees. Reinvested sale proceeds may be counted again. A broker snapshot does not supply lifetime purchase history.
- Sales use average acquisition cost and recorded sale fees. Dividend income includes recorded withholding, reversals and tax refunds.
- **1D charts** start both portfolio and benchmark lines at 0% at the first available portfolio minute of the displayed session, with a dotted zero baseline. They value current share quantities at available minute prices using daily reference FX. They do not reconstruct today's trades, cash flows or intraday FX changes. Partial coverage is labeled explicitly. Instruments awaiting their first session trade retain a confirmed previous close, with a carry-forward notice. The chart headline shows the latest complete account total; minute-feed valuations can have different timestamps.
- Historical charts replay available trade ledgers with historical daily closes and reference FX. Unavailable prices produce gaps, not invented prices.
- Dividend forecasts repeat historical distributions at unchanged share counts and estimate payment dates. They are gross heuristics, not confirmed company announcements.
- This is a portfolio tracker, not a tax-reporting engine or full cash-accounting system.

| Source | Use | Limits |
| --- | --- | --- |
| [Yahoo Finance chart feed / yfinance documentation](https://ranaroussi.github.io/yfinance/) | Quotes, minute/daily history, distributions and splits | Unofficial feed; exchange delays, coverage and availability vary. |
| [Frankfurter](https://frankfurter.dev/) | Daily reference FX | Not executable bank rates or intraday FX. |
| [Finnhub](https://finnhub.io/docs/api/quote) | Optional US quote override | Requires your own server-side key and appropriate entitlement. |

Provider terms and market-data licensing are separate from this source code. Refreshing every minute does not guarantee exchange real-time prices.

The S&P 500 reference uses the price index (`^GSPC`), which excludes reinvested dividends. Historical currency-value charts are kept separate from percentage comparisons. Percentage comparisons use daily flow-adjusted portfolio return estimates and daily FX-converted index returns over the same continuous data window. New capital is assumed available before each day’s return; missing valuations restart the window. These estimates are not exact broker-reported returns. Dividend charts keep the index on a separate percentage scale and do not project future index prices.

## Storage and deployment

Portfolio records, snapshots, preferences and daily observations are stored in browser `localStorage`. They do not automatically sync across devices. Backups and statements contain sensitive financial information: keep them outside Git.

The build emits a Cloudflare-compatible module Worker at `dist/server/index.js`. The included `.openai/hosting.json` is a **sanitized configuration without a deployment/project identity**. Configure your own hosting project and bindings; this repository does not link to an owner's private instance.

For production:

- Put the application behind authentication and HTTPS.
- Provide a trusted authentication proxy that strips client-supplied identity headers and supplies the authenticated identity expected by the Worker. Never trust a header directly from the public internet.
- Configure an R2 binding named `BUCKET` and a private `BROKER_VAULT_KEY` containing a base64-encoded 32-byte key to enable saved broker connections.
- Optionally configure `FINNHUB_API_KEY` as a server secret.
- Never commit environment files, secrets, account exports or vault contents.

If using the optional Actions variable `APP_URL`, it must point to a testable API deployment. Do not point unauthenticated CI checks at a private sign-in page. Optional CI secrets are configured separately from production hosting secrets.

## Project layout

```text
src/        Browser application, Worker, calculations and importers
scripts/    Build, local servers, validation and live checks
tests/      Synthetic regression fixtures and automated tests
docs/       Release-testing workflow
```

## License

A source-code license has not been selected yet.

## Trading 212 CSV trade history

Use **↑ T212 CSV** in the header (or **Connections → Import trade history CSV**) and select all English-language Trading 212 history exports together. Review the preview and confirm the account number and Live/Demo environment: CSV files do not contain a reliable account identity. Imports merge by operation IDs and fingerprints; overlapping exports are deduplicated. A sale without an earlier purchase blocks saving, so include the full history. Split open/close pairs become one share-ratio event. Unsupported investment operations require review; deposits, withdrawals, card activity, interest and currency-conversion cash movements are counted as exclusions.

The CSV ledger is stored locally and included in portfolio JSON backups. It feeds historical charts and **Activity → Trading 212 CSV history**. It does not add positions or payments to the connected snapshot: current portfolio/dividend cards continue to use API records. Historical dividend distributions and signed dividend corrections are included once in the reconstructed CSV curve. Costs and distributions are recorded in the instrument currency and translated using reference FX; this does not reproduce exact broker settlement FX profit or tax accounting. GBX quotes are converted to GBP. This is investment-value history, excluding cash balances.

Review market symbols for the exchange and currency in the export. Existing broker mappings and supported US/issuer aliases are suggested; unresolved listings remain explicitly missing, rather than guessed. Delisted instruments or unavailable historical prices can leave gaps even after mapping. Snapshots for another account/environment never enter the CSV historical curve. Keep separate accounts in separate browser profiles; this version supports one Trading 212 CSV account per portfolio.

## Excluding added capital from charts

Under **Portfolio value**, enable **Exclude added capital** for historical ranges. The main chart switches to a growth percentage, separating recorded investment profit from net capital entering/leaving securities and compounding the resulting period returns. Purchases funded by new cash do not count as growth; dividends, fees and currency changes still affect profit. It also shows the investment profit amount for the displayed window. The setting persists, and the original portfolio-value chart remains available by switching it off. The 1D fixed-holdings chart already excludes new capital automatically.

This is a daily flow-adjusted estimate, using current holdings only for 1D and actual recorded ledgers/observations for longer ranges. Positive net capital is assumed invested at the start of each interval. It is not an exact time-weighted return: that requires valuations at each external cash flow ([GIPS calculation guidance](https://www.gipsstandards.org/standards/gips-standards-for-firms/gips-standards-handbook-for-firms/)). Missing prices/FX restart the calculation; the latest continuous complete window is labeled. Portfolio growth remains available if S&P 500 data is unavailable. The currency overlay compares the same window at daily FX and fixed starting FX.
