Before publishing changes to this app:

- Run `npm run verify` (production build, artifact checks, calculation/security/API tests and live data-provider checks).
- Use the T3 collaborative browser to exercise the affected user flows before deployment. Follow `docs/release-testing.md`; unit tests alone do not establish that the browser works.
- For portfolio/import changes, use synthetic fixtures and verify separate IKE/standard cash accounts and re-import deduplication. Optional checks with a contributor’s own original statements must remain private. Never commit financial exports or real credentials.
- For broker changes, run `npm run start:e2e` and test the actual browser-to-Worker-to-encrypted-vault flow with its dummy broker. Explicitly distinguish fixtures from live authenticated broker testing.
- Fix failures and rerun affected checks before publishing. Record what passed and any untested limits; do not claim that every browser, device or live account was tested.
