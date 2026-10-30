# Folio — Investment Tracker

[![Checks](https://github.com/SkyOne771/folio-investment-tracker/actions/workflows/health.yml/badge.svg)](https://github.com/SkyOne771/folio-investment-tracker/actions/workflows/health.yml)

A self-hosted investment portfolio and dividend tracker with a neutral dark theme, PLN-first currency display, read-only Trading 212 connections and local XTB statement imports.

**This repository contains application code and synthetic test fixtures only. It does not include personal portfolios, broker statements, account credentials, backups or a hosted credential vault.**

## Features

- Portfolio value, invested capital, realized/unrealized gains and recorded dividend income.
- One-day charts with one-minute price intervals, previous-close changes and hover values.
- Historical performance reconstructed from recorded trades, historical daily prices and reference FX, with explicit gaps where data is unavailable.
- Separate charts for portfolio value, total return and dividends, with labeled currency scales.
- Monthly/yearly received dividends and separately labeled future estimates.
- Read-only Trading 212 Invest/Stocks ISA positions and dividend-history pagination.
- XTB Excel/CSV imports for IKE and separate standard PLN, EUR and USD cash accounts; multi-file/folder selection, preview, deduplication and reconciliation.
- Sortable holdings and dividend tables, company names, account filters and JSON backup/restore.
- Ten display currencies: PLN, USD, EUR, GBP, CHF, CAD, JPY, AUD, SEK and DKK.
- Responsive light/dark layouts and data-health checks.

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
- **1D charts** value current share quantities at available minute prices using daily reference FX. They do not reconstruct today's trades, cash flows or intraday FX changes. Partial coverage is labeled explicitly.
- Historical charts replay available trade ledgers with historical daily closes and reference FX. Unavailable prices produce gaps, not invented prices.
- Dividend forecasts repeat historical distributions at unchanged share counts and estimate payment dates. They are gross heuristics, not confirmed company announcements.
- This is a portfolio tracker, not a tax-reporting engine or full cash-accounting system.

| Source | Use | Limits |
| --- | --- | --- |
| [Yahoo Finance chart feed / yfinance documentation](https://ranaroussi.github.io/yfinance/) | Quotes, minute/daily history, distributions and splits | Unofficial feed; exchange delays, coverage and availability vary. |
| [Frankfurter](https://frankfurter.dev/) | Daily reference FX | Not executable bank rates or intraday FX. |
| [Finnhub](https://finnhub.io/docs/api/quote) | Optional US quote override | Requires your own server-side key and appropriate entitlement. |

Provider terms and market-data licensing are separate from this source code. Refreshing every minute does not guarantee exchange real-time prices.

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
