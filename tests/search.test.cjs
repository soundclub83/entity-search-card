const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../entity-search-card.js'), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createCard(config = {}) {
  const elements = new Map();
  const tag = (strings, ...values) => strings.reduce((out, text, i) => out + text + (values[i] ?? ''), '');
  const rows = [];
  elements.set('card-tools', {
    LitElement: class {}, LitHtml: tag, LitCSS: tag,
    createEntityRow: () => ({ addEventListener() {} }),
    moreInfo() {},
    createThing: (type, settings) => { rows.push(settings); return {}; },
  });
  vm.runInNewContext(source, {
    customElements: {
      whenDefined: async () => {}, get: (name) => elements.get(name),
      define: (name, element) => elements.set(name, element),
    },
    window: {}, HTMLElement: class {}, console: { warn() {} },
    setTimeout: (fn, ms) => ms === 2000 ? 0 : setTimeout(fn, ms), clearTimeout,
  });
  await Promise.resolve();
  const Card = elements.get('entity-search-card');
  assert.ok(Card, 'card registers independently of the original search-card');
  const card = new Card();
  card.setConfig(config);
  card.hass = {
    states: {
      'light.kitchen': { attributes: { friendly_name: 'Kitchen light' } },
      'switch.desk': { attributes: { friendly_name: 'Office desk' } },
      'sensor.temperature': { attributes: {} },
    },
    services: { demo: { run: {} } },
  };
  return { card, rows };
}

test('finds friendly names and entity IDs and applies domain filters', async () => {
  const { card } = await createCard({ included_domains: ['light'] });
  card._performSearch('kitchen|desk');
  assert.deepEqual(Array.from(card._results), ['light.kitchen']);
  card.setConfig({ excluded_domains: ['light'] });
  card._performSearch('kitchen|switch\\.desk');
  assert.deepEqual(Array.from(card._results), ['switch.desk']);
});

test('invalid regular expressions and missing names do not break searching', async () => {
  const { card } = await createCard();
  card._performSearch('sensor');
  assert.deepEqual(Array.from(card._results), ['sensor.temperature']);
  card._performSearch('[');
  assert.equal(card._results.length, 0);
});

test('clearing cancels a pending search so results do not reappear', async () => {
  const { card } = await createCard();
  card._valueChanged({ target: { value: 'kitchen' } });
  card._clearInput();
  await wait(150);
  assert.equal(card._searchValue, '');
  assert.equal(card._results.length, 0);
});

test('action substitutions can be reused without modifying configuration', async () => {
  const { card, rows } = await createCard();
  const action = { name: 'Run {1}', service: 'demo.run', service_data: { value: '{1}', count: 2 } };
  card._createActionRow(action, ['first', 'first']);
  card._createActionRow(action, ['second', 'second']);
  assert.equal(rows[0].service_data.value, 'first');
  assert.equal(rows[1].service_data.value, 'second');
  assert.equal(rows[1].service_data.count, 2);
  assert.equal(action.service_data.value, '{1}');
});

test('compact design works without a dashboard URL and classic remains selectable', async () => {
  const { card } = await createCard();
  assert.ok(card.render().includes('class="network-input"'));
  card.setConfig({ design: 'classic' });
  assert.ok(card.render().includes('<ha-input'));
  assert.ok(!card.render().includes('class="network-input"'));
});
