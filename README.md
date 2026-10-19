# ReturnSignal

**Every refund, accounted for.** A privacy-first refund reconciliation casebook for shoppers who need to compare what a seller was expected to return with what actually arrived—and keep a useful record when it does not match.

## Demo and submission status

- **Live URL:** https://hackid02.github.io/returnsignal/
- **Public repository:** https://github.com/hackid02/returnsignal
- **TestSprite portal:** Project created; first generated run reported issues now being addressed. GitHub App PR check is not connected yet.

The app is a static page with no server component. GitHub Pages publishes the production site from `main` at the live URL above. Vercel is connected for pull-request preview deployments; use each PR's preview URL for TestSprite checks so judges can verify the proposed code before merge. Local tests run with `npm test`; they do not substitute for the S4-required TestSprite portal suite and PR check.

## Core workflow

1. Record the item, seller, purchase and return-by dates, expected refund, currency, and optional order context.
2. Mark an item returned and note its return date and tracking/drop-off evidence.
3. Log each refund payment as it arrives, including partial payments.
4. See the remaining expected balance per case, calculated to the cent; complete cases are separated from cases still open.
5. Search the case list by item, seller, order reference, tracking note, or payment-history text without changing the active filter.
6. Copy a factual follow-up that states the expected, received, and still-owed amounts; review the visible read-only preview before sending it yourself.
7. Export a versioned JSON backup (`returnsignal-backup-v1-YYYY-MM-DD.json`) or restore one after confirming replacement of current browser data.

## Trust and data handling

- Case data stays in the current browser's local storage. There is no account, analytics service, or cloud sync in this prototype.
- The app does not connect to banks, email, retailers, or carriers; dates, amounts, and notes are user-entered.
- Backup files contain the case data in readable JSON. Store them carefully; they may include order references and personal notes.
- ReturnSignal does not determine refund eligibility, verify a retailer's policy, or send messages. Verify terms with the seller.

## Run locally

Open `index.html` in a modern browser or serve the folder with a static web server. No install or build step is required. Node.js 18+ is only needed for the test suite.

```sh
npm test
```

The automated suite uses Node's test runner, Happy DOM, and Playwright/Chromium. It exercises core logic and user journeys, checks layout at five viewport widths, verifies keyboard behavior, searches payment-history text, checks the follow-up preview, inspects a real JSON download, and restores from a reusable fixture. Keep Chromium installed for `npm test` (`npx playwright install --with-deps chromium`). It does not replace checks on physical devices or in other browser engines. See `QA-STATUS.md` for what passed and what remains.

## TestSprite scenarios to create and run

Generate the browser suite in the TestSprite 3.0 portal using the deployed URL and this PRD. Include:

1. Create a case; confirm it appears in All cases and persists after refresh.
2. Reject a return-by date earlier than the purchase date.
3. A deadline today/within three days appears in Needs action; a deadline four days away does not.
4. Search by item, seller, order reference, tracking note, and the payment-history phrase “Partial refund received”; confirm the active filter remains selected.
5. Record a return; verify date and tracking note appear in case history.
6. Record a partial payment: expected 120, received 100, outstanding 20; keep case open.
7. Record another 20; outstanding becomes zero and the case appears in Resolved.
8. A returned case with an expected refund date in the past and a remaining balance is labelled Refund overdue.
9. Copy the follow-up and verify the visible preview contains the selected case's expected, received, and outstanding figures with neutral wording.
10. Export a backup; verify its versioned filename, format/version fields, all cases, and payment ledger entries.
11. Restore the reusable fictional fixture at `tests/fixtures/testsprite-refund-case.json`; confirm replacement, partial balance, and overdue state.
12. Reject malformed or ledger-inconsistent backup JSON without replacing current cases; reset demo cases only after confirmation.

For TestSprite restore tests, upload `tests/fixtures/testsprite-refund-case.json` under **Test Files** or use its public Pages URL: https://hackid02.github.io/returnsignal/tests/fixtures/testsprite-refund-case.json .

## Current scope / non-goals

No payment processing, automated eligibility decisions, policy lookup, email/bank integrations, carrier tracking, outbound messaging, reminders, account system, or cross-device sync. This is a working prototype, not a consumer-ready financial product.
