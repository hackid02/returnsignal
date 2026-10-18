# ReturnSignal

**Every refund, accounted for.** A privacy-first refund reconciliation casebook for shoppers who need to compare what a seller was expected to return with what actually arrived—and keep a useful record when it does not match.

## Demo and submission status

- **Live URL:** Pending GitHub Pages setup.
- **Public repository:** https://github.com/hackid02/returnsignal
- **TestSprite portal suite / GitHub App check:** Not configured yet.

These are hackathon requirements, not completed work. The app currently runs as a static page and has no server component. Its tests can be run locally with `npm test`; the S4-required TestSprite check must be configured separately through the TestSprite portal and GitHub App.

### Enable GitHub Pages

After the first push, open the repository's **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then select branch `main` and folder `/(root)`, and save. Wait for GitHub Pages to publish the app, open the URL shown on that settings page, and replace the pending live URL above with it. This avoids requiring a GitHub Actions workflow permission just to publish the static page.

Then create a TestSprite account, generate and run the portal suite against that public URL, install the TestSprite GitHub App on the repository, and open a pull request that receives the TestSprite result. Local tests do not substitute for this required check.

## Core workflow

1. Record the item, seller, purchase and return-by dates, expected refund, currency, and optional order context.
2. Mark an item returned and note its return date and tracking/drop-off evidence.
3. Log each refund payment as it arrives, including partial payments.
4. See the remaining expected balance per case, calculated to the cent; complete cases are separated from cases still open.
5. Search the case list by item, seller, order reference, or tracking note; filter by cases needing action, outstanding refunds, or resolved cases.
6. Copy a factual follow-up that states the expected, received, and still-owed amounts. The user reviews and sends it.
7. Export a JSON backup or restore one after confirming replacement of current browser data.

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

The automated suite uses Node's test runner, Happy DOM, and Playwright/Chromium. It exercises core logic and user journeys, checks layout at five viewport widths, and verifies both the navigation drawer and dialog keyboard behavior. Keep Chromium installed for `npm test` (`npx playwright install --with-deps chromium`). It does not replace checks on physical devices or in other browser engines. See `QA-STATUS.md` for what passed and what remains.

## TestSprite scenarios to create and run

Generate the browser suite in the TestSprite 3.0 portal using the deployed URL and this PRD. Include:

1. Create a case; confirm it appears in All cases and persists after refresh.
2. Reject a return-by date earlier than the purchase date.
3. A deadline today/within three days appears in Needs action; a deadline four days away does not.
4. Search by item, seller, order reference, and tracking note; verify a non-match empty state.
5. Record a return; verify date and tracking note appear in case history.
6. Record a partial payment: expected 120, received 100, outstanding 20; keep case open.
7. Record another 20; outstanding becomes zero and the case appears in Resolved.
8. A returned case with an expected refund date in the past and a remaining balance is labelled Refund overdue.
9. The follow-up contains the selected case's expected, received, and outstanding figures and its order context.
10. Export a backup, restore it into a clean state, and verify cases and payment history are preserved.
11. Reject malformed or ledger-inconsistent backup JSON without replacing current cases.
12. Reset demo cases only after confirmation.

## Current scope / non-goals

No payment processing, automated eligibility decisions, policy lookup, email/bank integrations, carrier tracking, outbound messaging, reminders, account system, or cross-device sync. This is a working prototype, not a consumer-ready financial product.
