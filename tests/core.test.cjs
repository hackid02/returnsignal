const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'the inline app script is present');
const window = { __RETURNSIGNAL_TEST__: true };
vm.runInNewContext(script, { window }, { filename: 'returnsignal-inline.js' });
const core = window.__ReturnSignalTest;
const offset = n => {
  const d = core.today();
  d.setDate(d.getDate() + n);
  return core.iso(d);
};
const caseOf = overrides => ({
  id: 'case-1', item: 'Camera', store: 'Example Shop',
  purchased: offset(-10), deadline: offset(5), expected: 120,
  currency: 'USD', received: 100, refundDue: offset(-1),
  note: '', status: 'returned', returnedOn: offset(-8), tracking: '',
  payments: [{ amount: 100, date: offset(-2), note: '' }], created: 1,
  ...overrides,
});

test('cent-based reconciliation handles partial, exact and excess receipts', () => {
  assert.equal(core.outstanding(caseOf({ expected: 120, received: 100 })), 20);
  assert.equal(core.outstanding(caseOf({ expected: 0.3, received: 0.1 })), 0.2);
  assert.equal(core.outstanding(caseOf({ expected: 120, received: 120 })), 0);
  assert.equal(core.outstanding(caseOf({ expected: 120, received: 121.25 })), 0);
});

test('open, overdue and attention classifications distinguish case states', () => {
  const partial = caseOf({ expected: 120, received: 100 });
  assert.equal(core.open(partial), true);
  assert.equal(core.overdue(partial), true);
  assert.equal(core.label(partial), 'Refund overdue');
  assert.equal(core.badgeClass(partial), 'late');
  assert.equal(core.open(caseOf({ status: 'complete', received: 120 })), false);
  assert.equal(core.overdue(caseOf({ status: 'complete', received: 120 })), false);
  assert.equal(core.attention(caseOf({ status: 'purchased', deadline: offset(0), received: 0, refundDue: '' })), true);
  assert.equal(core.attention(caseOf({ status: 'purchased', deadline: offset(4), received: 0, refundDue: '' })), false);
});

test('date parsing rejects malformed and impossible calendar dates', () => {
  assert.equal(core.day('2031-02-31'), null);
  assert.equal(core.day('not-a-date'), null);
  assert.ok(core.day('2032-02-29'));
  assert.equal(core.diff('2032-02-02', '2032-02-01'), 1);
});

test('backup validation accepts a consistent export and normalizes currency', () => {
  const source = caseOf({ currency: 'usd' });
  const restored = core.validateBackup({ format: 'returnsignal-backup', version: 1, cases: [source] });
  assert.equal(restored.length, 1);
  assert.equal(restored[0].currency, 'USD');
  assert.equal(restored[0].received, 100);
  assert.equal(restored[0].id, source.id);
});

test('backup validation rejects corrupted dates, amounts, and inconsistent ledgers', () => {
  const valid = caseOf({});
  assert.throws(() => core.validateBackup({ format: 'nope', version: 1, cases: [] }), /supported ReturnSignal backup/);
  assert.throws(() => core.validateBackup({ format: 'returnsignal-backup', version: 1, cases: [caseOf({ purchased: '2032-02-31' })] }), /invalid required information/);
  assert.throws(() => core.validateBackup({ format: 'returnsignal-backup', version: 1, cases: [caseOf({ expected: -1 })] }), /invalid required information/);
  assert.throws(() => core.validateBackup({ format: 'returnsignal-backup', version: 1, cases: [caseOf({ received: 99 })] }), /does not match its ledger/);
  assert.equal(valid.received, 100);
});
