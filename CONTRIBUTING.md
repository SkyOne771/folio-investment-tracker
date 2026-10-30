# Contributing

Use Node.js 22+, run `npm ci`, and follow the setup in the README. Keep changes focused and include meaningful regression coverage for calculation, import or security changes.

Before submitting:

1. Run `npm run check:public` to catch accidentally tracked exports, secrets and private deployment identifiers.
2. Run `npm run verify`.
3. Exercise the affected browser flow using the [release-testing checklist](docs/release-testing.md).
4. Describe the behavior change, validation and any limits in the pull request.

Use synthetic account references, invented transaction amounts and dummy API strings in fixtures. Do not attach real statements, backups, API credentials, account numbers or unredacted portfolio screenshots to issues or pull requests. Describe the layout using a minimal synthetic example instead.

Report security problems privately to the repository owner; never publish a working secret or personal financial record in an issue. See [SECURITY.md](SECURITY.md).
