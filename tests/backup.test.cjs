const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Window } = require('happy-dom');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dateOffset = days => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

async function load() {
  const window = new Window({ url: 'http://returnsignal.test/', settings: {
    enableJavaScriptEvaluation: true,
    suppressInsecureJavaScriptEnvironmentWarning: true,
    timer: { maxTimeout: 10 },
  } });
  window.confirm = () => true;
  window.document.write(html);
  await window.happyDOM.whenAsyncComplete();
  return window;
}
async function importJson(window, value) {
  const file = new window.File([JSON.stringify(value)], 'backup.json', { type: 'application/json' });
  const transfer = new window.DataTransfer();
  transfer.items.add(file);
  const input = window.document.querySelector('#backup-file');
  input.files = transfer.files;
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 20));
}

test('restore replaces cases only after confirmation and rejects invalid backups without data loss', async t => {
  const window = await load();
  t.after(() => window.happyDOM.abort());
  const originalCount = window.document.querySelectorAll('button.case').length;
  window.document.querySelector('#export-cases').click();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.match(window.document.querySelector('#toast').textContent, /Backup downloaded/);
  const sample = {
    id: 'backup-case', item: 'Backup chair', store: 'Studio Shop',
    purchased: dateOffset(-4), deadline: dateOffset(9), expected: 80,
    currency: 'gbp', received: 20, refundDue: dateOffset(3), note: 'Order ABC',
    status: 'returned', returnedOn: dateOffset(-2), tracking: 'Drop-off 55',
    payments: [{ amount: 20, date: dateOffset(-1), note: 'Part one' }], created: 1,
  };
  await importJson(window, { format: 'returnsignal-backup', version: 1, cases: [sample] });
  assert.equal(window.document.querySelectorAll('button.case').length, 1);
  assert.ok(window.document.querySelector('#case-list').textContent.includes('Backup chair'));
  assert.equal(JSON.parse(window.localStorage.getItem('returnsignal-v2'))[0].currency, 'GBP');

  await importJson(window, { format: 'returnsignal-backup', version: 1, cases: [{ ...sample, purchased: '2031-02-31' }] });
  assert.equal(window.document.querySelectorAll('button.case').length, 1, 'invalid import preserves current cases');
  assert.match(window.document.querySelector('#toast').textContent, /invalid required information/i);

  window.confirm = () => false;
  await importJson(window, { format: 'returnsignal-backup', version: 1, cases: [] });
  assert.equal(window.document.querySelectorAll('button.case').length, 1, 'cancelled replacement preserves current cases');
  assert.notEqual(originalCount, 1, 'fixture began with demo data');
});
