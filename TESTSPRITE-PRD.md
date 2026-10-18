# ReturnSignal — TestSprite product requirements

## Product purpose
ReturnSignal is a privacy-first casebook for reconciling the refund a shopper expected with the money they recorded receiving. It makes a shortfall or overdue refund visible, preserves the user's evidence and payment history, and prepares a factual follow-up.

## Target user and scope
A shopper who has returned—or is preparing to return—an online purchase and wants to account for the expected refund. The user enters all facts manually. A case has one currency; totals must not be combined across cases with different currencies. Data remains in the current browser unless the user exports it.

## Case model
- Item and seller name.
- Purchase date and return-by date.
- Expected refund amount and ISO 4217 three-letter currency code.
- Optional expected refund date and order/context note.
- Return date and optional tracking/drop-off note.
- A ledger of refund payments, each with amount, date, and optional note.
- A status (`purchased`, `returned`, or `complete`) derived/maintained through the workflow.

Amounts are converted to integer cents for comparison. Outstanding is `max(0, expected cents − received cents) / 100`. Partial payments accumulate. A case is resolved when recorded receipts meet or exceed the expected amount. Never sum balances across currencies.

## User journeys and acceptance criteria

### Create a case
- Required: item, seller, purchase date, return-by date, expected amount > 0, three-letter currency code.
- Optional: expected refund date and order/context note.
- Return-by date cannot precede purchase date.
- A saved case appears in All cases and remains after refresh where browser storage is available.

### Record a return
- A not-yet-returned case can be marked returned.
- Return date is required and cannot precede purchase date.
- Tracking/drop-off context is optional and appears in the case history.

### Record refund payments
- Refund payments can be logged on a returned, open case.
- Amount must be greater than zero; payment date cannot precede purchase date.
- Multiple partial payments accumulate in the ledger and survive refresh.
- A partial payment leaves a positive balance and the case open.
- Exact or excess cumulative payment yields zero outstanding and a resolved case.

### Identify and follow up
- A returned case with a past expected refund date and positive balance is marked Refund overdue.
- A case not yet returned with a return-by date up to and including three days away is included in Needs action. Past return windows remain visible there as well.
- Search matches item, seller, order/context note, and tracking/drop-off note without changing the selected status filter.
- A follow-up for the selected case states expected amount, amount received, and outstanding amount. It must not claim a seller policy or legal entitlement was verified.
- Follow-up is copied for the user to review; the app does not send it.

### Back up and restore
- Export creates a versioned JSON backup containing all current cases and payment ledger entries.
- Restore accepts only supported backup format/version and validates required fields, dates, amounts, payment ledgers, status, and currency before replacing data.
- Current cases are replaced only after explicit confirmation.
- Invalid or cancelled imports leave current data unchanged.

### Filters and demo reset
- All cases shows every case.
- Needs action shows imminent/overdue return windows and overdue refunds.
- Refunds outstanding shows open cases with a positive balance.
- Resolved shows cases with no remaining balance.
- Reset demo cases requires confirmation and restores the original illustrative examples.

## Edge-case coverage
- Deadlines today, tomorrow, exactly three days away, four days away, and overdue.
- Leap day and impossible dates.
- Partial payment, several partial payments, exact completion, and payment over the expected amount.
- Expected refund date today versus yesterday; no expected date.
- Two currencies on separate cases; currency formatting fallback.
- Empty cases, empty filter, no search matches, malformed local storage, unavailable browser storage.
- Export/import round trip, unsupported backup version, invalid date, invalid currency, payment-ledger mismatch, cancellation, and duplicate identifiers.

## Non-goals
Bank/email connection, retailer-policy lookup, carrier tracking, message sending, reminders, account system, cloud sync, legal advice, automatic refund processing, and payment initiation.
