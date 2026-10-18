const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Window } = require('happy-dom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dateOffset = days => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function launch(savedData) {
  const window = new Window({
    url: 'http://returnsignal.test/',
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      timer: { maxTimeout: 25 },
    },
  });
  if (savedData) window.localStorage.setItem('returnsignal-v2', savedData);
  window.document.write(html);
  await window.happyDOM.whenAsyncComplete();
  return window;
}
const set = (window, selector, value) => { window.document.querySelector(selector).value = value; };
const submit = (window, selector) => window.document.querySelector(selector)
  .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
const findCase = (window, item) => [...window.document.querySelectorAll('button.case')]
  .find(button => button.textContent.includes(item));


test('shopper can create a case, log a return, reconcile partial payments, search, and reload', async t => {
  const window = await launch();
  t.after(() => window.happyDOM.abort());
  const doc = window.document;
  assert.equal(doc.querySelectorAll('button.case').length, 3, 'illustrative cases render');

  doc.querySelector('#add-top').click();
  set(window, '#item', 'Travel mug');
  set(window, '#store', 'Acme Shop');
  set(window, '#purchased', dateOffset(-4));
  set(window, '#deadline', dateOffset(-5));
  set(window, '#expected', '120.00');
  set(window, '#currency', 'USD');
  submit(window, '#case-form');
  assert.equal(doc.querySelectorAll('button.case').length, 3, 'return-by date before purchase is rejected');
  set(window, '#deadline', dateOffset(10));
  submit(window, '#case-form');
  await pause(5);
  assert.ok(findCase(window, 'Travel mug'), 'new case is visible');

  findCase(window, 'Travel mug').click();
  doc.querySelector('#mark-returned').click();
  set(window, '#returned-on', dateOffset(-2));
  set(window, '#tracking', 'Drop-off receipt 482');
  submit(window, '#return-form');
  await pause(5);
  assert.ok(findCase(window, 'Travel mug'));

  findCase(window, 'Travel mug').click();
  doc.querySelector('#record-refund').click();
  set(window, '#received-amount', '100');
  set(window, '#received-date', dateOffset(-1));
  submit(window, '#refund-form');
  await pause(5);
  assert.match(findCase(window, 'Travel mug').textContent, /Partial refund/);
  assert.match(findCase(window, 'Travel mug').textContent, /20\.00\s+still owed/);

  findCase(window, 'Travel mug').click();
  doc.querySelector('#record-refund').click();
  set(window, '#received-amount', '20');
  set(window, '#received-date', dateOffset(0));
  submit(window, '#refund-form');
  await pause(5);
  doc.querySelector('[data-filter="complete"]').click();
  assert.match(findCase(window, 'Travel mug').textContent, /Resolved/);

  const saved = window.localStorage.getItem('returnsignal-v2');
  const reloaded = await launch(saved);
  t.after(() => reloaded.happyDOM.abort());
  assert.ok(findCase(reloaded, 'Travel mug'), 'reloaded app restores saved case');
  assert.match(findCase(reloaded, 'Travel mug').textContent, /0\.00\s+still owed/);
  reloaded.document.querySelector('#case-search').value = 'Acme Shop';
  reloaded.document.querySelector('#case-search').dispatchEvent(new reloaded.Event('input', { bubbles: true }));
  assert.equal(reloaded.document.querySelectorAll('button.case').length, 1, 'search applies to the case list');
  reloaded.document.querySelector('[data-filter="all"]').click();
  reloaded.document.querySelector('#case-search').value = 'no such case';
  reloaded.document.querySelector('#case-search').dispatchEvent(new reloaded.Event('input', { bubbles: true }));
  assert.match(reloaded.document.querySelector('#case-list').textContent, /No matching cases/);
});


test('malformed saved data falls back safely without silently overwriting it', async t => {
  const corrupted = '[{}]';
  const window = await launch(corrupted);
  t.after(() => window.happyDOM.abort());
  assert.equal(window.document.querySelectorAll('button.case').length, 3, 'demo cases keep the interface usable');
  assert.match(window.document.querySelector('#toast').textContent, /could not be read/i);
  assert.equal(window.localStorage.getItem('returnsignal-v2'), corrupted, 'corrupt data is not silently replaced');
});

test('user-provided case names are rendered as text, not interpreted as markup', async t => {
  const window = await launch();
  t.after(() => window.happyDOM.abort());
  window.document.querySelector('#add-top').click();
  set(window, '#item', '<img src=x onerror=alert(1)>');
  set(window, '#store', 'Example');
  set(window, '#purchased', dateOffset(-1));
  set(window, '#deadline', dateOffset(14));
  set(window, '#expected', '15');
  set(window, '#currency', 'USD');
  submit(window, '#case-form');
  await pause(5);
  assert.equal(window.document.querySelectorAll('#case-list img').length, 0);
  assert.ok(window.document.querySelector('#case-list').textContent.includes('<img src=x onerror=alert(1)>'));
});
