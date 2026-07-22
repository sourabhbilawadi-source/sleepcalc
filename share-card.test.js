import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const mockLocalStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value.toString(); },
  clear() { this.store = {}; }
};

const mockElements = {};
const mockDocument = {
  documentElement: {
    classList: {
      add: () => {}
    }
  },
  getElementById: (id) => mockElements[id] || null,
  _setElement: (id, textContent) => {
    mockElements[id] = { textContent };
  },
  _clearElements: () => {
    for (const key in mockElements) delete mockElements[key];
  }
};

global.window = {
  location: {
    search: '',
    origin: 'https://goodsleep.com',
    pathname: '/test'
  },
  open: () => {}
};
global.document = mockDocument;
global.localStorage = mockLocalStorage;

const code = fs.readFileSync('./share-card.js', 'utf8');
vm.runInThisContext(code);

export function setupTest(slug) {
  mockLocalStorage.clear();
  mockDocument._clearElements();
  delete window.activeCaffeineData;
  if (slug) {
    if (slug === 'index' || slug === 'unknown-page') {
      global.window.location.pathname = '';
    } else {
      global.window.location.pathname = '/' + slug;
    }
  }
}

test('sleep-audit - with score and disrupter', () => {
  setupTest('sleep-audit');
  localStorage.setItem('gs-sleep-audit-score', '85');
  localStorage.setItem('gs-sleep-audit-disrupter', 'Caffeine');
  const result = window.GoodSleepShare.getShareData('sleep-audit');
  assert.strictEqual(result, 'I just completed my Sleep Quality Audit on GoodSleep! My sleep score is 85/100 (Main disrupter: Caffeine). Diagnose your sleep habits here: https://goodsleep.com/sleep-audit');
});

test('sleep-audit - with score only', () => {
  setupTest('sleep-audit');
  localStorage.setItem('gs-sleep-audit-score', '90');
  const result = window.GoodSleepShare.getShareData('sleep-audit');
  assert.strictEqual(result, 'I just completed my Sleep Quality Audit on GoodSleep! My sleep score is 90/100. Diagnose your sleep habits here: https://goodsleep.com/sleep-audit');
});

test('sleep-audit - without score', () => {
  setupTest('sleep-audit');
  const result = window.GoodSleepShare.getShareData('sleep-audit');
  assert.strictEqual(result, 'How good is your sleep? Take the GoodSleep Sleep Quality Audit to diagnose sleep disrupters and get your sleep score: https://goodsleep.com/sleep-audit');
});

test('caffeine-calculator - without data', () => {
  setupTest('caffeine-calculator');
  const result = window.GoodSleepShare.getShareData('caffeine-calculator');
  assert.strictEqual(result, 'Optimize your deep sleep by tracking your caffeine clearance curve! Find your sleep-safe hour with the GoodSleep caffeine calculator: https://goodsleep.com/caffeine-calculator');
});

test('caffeine-calculator - with data but low bedtime caffeine', () => {
  setupTest('caffeine-calculator');
  window.activeCaffeineData = { bedtimeCaffeine: 15 };
  const result = window.GoodSleepShare.getShareData('caffeine-calculator');
  assert.strictEqual(result, 'Tracked my bedtime caffeine clearance with GoodSleep. My bedtime level is 15mg, and sleep-safe clearance is Safe at Bedtime. Check yours: https://goodsleep.com/caffeine-calculator');
});

test('caffeine-calculator - with data and clearance time found', () => {
  setupTest('caffeine-calculator');
  window.activeCaffeineData = {
    bedtimeCaffeine: 50,
    bedtimeQueryMin: 1320,
    getCaffeineAtMinute: (m) => {
      if (m === 1320) return 50;
      if (m === 1335) return 40;
      if (m === 1350) return 30;
      if (m === 1365) return 20;
      if (m === 1380) return 15;
      return 0;
    }
  };
  const result = window.GoodSleepShare.getShareData('caffeine-calculator');
  assert.strictEqual(result, 'Tracked my bedtime caffeine clearance with GoodSleep. My bedtime level is 50mg, and sleep-safe clearance is 11:00 PM. Check yours: https://goodsleep.com/caffeine-calculator');
});

test('caffeine-calculator - with data and clearance time found after midnight', () => {
  setupTest('caffeine-calculator');
  window.activeCaffeineData = {
    bedtimeCaffeine: 50,
    bedtimeQueryMin: 1380,
    getCaffeineAtMinute: (m) => {
      if (m === 60) return 15;
      return 50;
    }
  };
  const result = window.GoodSleepShare.getShareData('caffeine-calculator');
  assert.strictEqual(result, 'Tracked my bedtime caffeine clearance with GoodSleep. My bedtime level is 50mg, and sleep-safe clearance is 1:00 AM. Check yours: https://goodsleep.com/caffeine-calculator');
});

test('caffeine-calculator - with data and clearance time next day (not cleared)', () => {
  setupTest('caffeine-calculator');
  window.activeCaffeineData = {
    bedtimeCaffeine: 100,
    bedtimeQueryMin: 1320,
    getCaffeineAtMinute: (m) => 50
  };
  const result = window.GoodSleepShare.getShareData('caffeine-calculator');
  assert.strictEqual(result, 'Tracked my bedtime caffeine clearance with GoodSleep. My bedtime level is 100mg, and sleep-safe clearance is Next Day. Check yours: https://goodsleep.com/caffeine-calculator');
});

test('chronotype - with bear', () => {
  setupTest('chronotype');
  localStorage.setItem('gs-chronotype', 'bear');
  const result = window.GoodSleepShare.getShareData('chronotype');
  assert.strictEqual(result, 'My biological chronotype is the 🐻 Bear! Peak energy: 10 AM - 2 PM. Take the quiz to find your sleep animal: https://goodsleep.com/chronotype');
});

test('chronotype - with lion', () => {
  setupTest('chronotype');
  localStorage.setItem('gs-chronotype', 'lion');
  const result = window.GoodSleepShare.getShareData('chronotype');
  assert.strictEqual(result, 'My biological chronotype is the 🦁 Lion! Peak energy: 6 AM - 10 AM. Take the quiz to find your sleep animal: https://goodsleep.com/chronotype');
});

test('chronotype - with unmapped type', () => {
  setupTest('chronotype');
  localStorage.setItem('gs-chronotype', 'alien');
  const result = window.GoodSleepShare.getShareData('chronotype');
  assert.strictEqual(result, 'My biological chronotype is the 🧬 alien! Peak energy: daytime. Take the quiz to find your sleep animal: https://goodsleep.com/chronotype');
});

test('chronotype - without type', () => {
  setupTest('chronotype');
  const result = window.GoodSleepShare.getShareData('chronotype');
  assert.strictEqual(result, 'Optimize your sleep by aligning with your biological clock! Discover your chronotype (Lion, Bear, Wolf, Dolphin) and peak energy hours: https://goodsleep.com/chronotype');
});

test('polyphasic-sleep-planner - with routine and hours', () => {
  setupTest('polyphasic-sleep-planner');
  localStorage.setItem('gs-polyphasic-routine', 'uberman');
  localStorage.setItem('gs-polyphasic-sleep-hours', '2');
  const result = window.GoodSleepShare.getShareData('polyphasic-sleep-planner');
  assert.strictEqual(result, 'I\'m planning a Uberman polyphasic sleep schedule (2h total sleep/day) using the GoodSleep sleep clock! Design your schedule: https://goodsleep.com/polyphasic-sleep-planner');
});

test('polyphasic-sleep-planner - with routine and no hours', () => {
  setupTest('polyphasic-sleep-planner');
  localStorage.setItem('gs-polyphasic-routine', 'everyman-e3');
  const result = window.GoodSleepShare.getShareData('polyphasic-sleep-planner');
  assert.strictEqual(result, 'I\'m planning a Everyman E3 polyphasic sleep schedule (custom total sleep/day) using the GoodSleep sleep clock! Design your schedule: https://goodsleep.com/polyphasic-sleep-planner');
});

test('polyphasic-sleep-planner - with unknown routine', () => {
  setupTest('polyphasic-sleep-planner');
  localStorage.setItem('gs-polyphasic-routine', 'custom-routine');
  const result = window.GoodSleepShare.getShareData('polyphasic-sleep-planner');
  assert.strictEqual(result, 'I\'m planning a custom-routine polyphasic sleep schedule (custom total sleep/day) using the GoodSleep sleep clock! Design your schedule: https://goodsleep.com/polyphasic-sleep-planner');
});

test('polyphasic-sleep-planner - without routine', () => {
  setupTest('polyphasic-sleep-planner');
  const result = window.GoodSleepShare.getShareData('polyphasic-sleep-planner');
  assert.strictEqual(result, 'Optimize your sleep schedules with our interactive 24-hour circular polyphasic clock planner! Customize Biphasic, Everyman, or Uberman schedules: https://goodsleep.com/polyphasic-sleep-planner');
});

test('jet-lag-planner - with data (positive diff)', () => {
  setupTest('jet-lag-planner');
  localStorage.setItem('gs-jet-lag-dep', 'LAX');
  localStorage.setItem('gs-jet-lag-dest', 'JFK');
  localStorage.setItem('gs-jet-lag-diff', '3');
  localStorage.setItem('gs-jet-lag-days', '4');
  const result = window.GoodSleepShare.getShareData('jet-lag-planner');
  assert.strictEqual(result, 'Planning a jet lag adaptation plan on GoodSleep for a +3h shift from LAX to JFK. Total transition: 4 days. Get your custom plan: https://goodsleep.com/jet-lag-planner');
});

test('jet-lag-planner - with data (negative diff)', () => {
  setupTest('jet-lag-planner');
  localStorage.setItem('gs-jet-lag-dep', 'JFK');
  localStorage.setItem('gs-jet-lag-dest', 'LAX');
  localStorage.setItem('gs-jet-lag-diff', '-3');
  localStorage.setItem('gs-jet-lag-days', '3');
  const result = window.GoodSleepShare.getShareData('jet-lag-planner');
  assert.strictEqual(result, 'Planning a jet lag adaptation plan on GoodSleep for a -3h shift from JFK to LAX. Total transition: 3 days. Get your custom plan: https://goodsleep.com/jet-lag-planner');
});

test('jet-lag-planner - without data', () => {
  setupTest('jet-lag-planner');
  const result = window.GoodSleepShare.getShareData('jet-lag-planner');
  assert.strictEqual(result, 'Travelling across timezones? Beat jet lag with the GoodSleep circadian timezone transition planner. Calculate your melatonin, light, and sleep offset times: https://goodsleep.com/jet-lag-planner');
});

test('shift-work-sleep-calculator - with anchor', () => {
  setupTest('shift-work-sleep-calculator');
  mockDocument._setElement('stat-anchor', '12:00 PM - 4:00 PM');
  const result = window.GoodSleepShare.getShareData('shift-work-sleep-calculator');
  assert.strictEqual(result, 'Planning my night-shift circadian blocks with the GoodSleep Shift Work Sleep Scheduler. Anchor sleep: 12:00 PM - 4:00 PM. Calculate your circadian plan: https://goodsleep.com/shift-work-sleep-calculator');
});

test('shift-work-sleep-calculator - without anchor', () => {
  setupTest('shift-work-sleep-calculator');
  const result = window.GoodSleepShare.getShareData('shift-work-sleep-calculator');
  assert.strictEqual(result, 'Rotating or night shifts disrupt your circadian master clock. Calculate optimal sleep blocks, protect anchor sleep, and manage light cycles: https://goodsleep.com/shift-work-sleep-calculator');
});

test('muscle-recovery-sleep-calculator - with total', () => {
  setupTest('muscle-recovery-sleep-calculator');
  mockDocument._setElement('stat-total', '9h 15m');
  const result = window.GoodSleepShare.getShareData('muscle-recovery-sleep-calculator');
  assert.strictEqual(result, 'Calculated my bodybuilding sleep needs with the GoodSleep Muscle Recovery sleep calculator. Optimal recovery sleep: 9h 15m. Optimize your growth hormone and deep sleep: https://goodsleep.com/muscle-recovery-sleep-calculator');
});

test('muscle-recovery-sleep-calculator - without total', () => {
  setupTest('muscle-recovery-sleep-calculator');
  const result = window.GoodSleepShare.getShareData('muscle-recovery-sleep-calculator');
  assert.strictEqual(result, 'Calculate the exact sleep duration needed for muscle protein synthesis and optimal growth hormone release based on your training splits: https://goodsleep.com/muscle-recovery-sleep-calculator');
});

test('new-parent-sleep-sync - with guarantee', () => {
  setupTest('new-parent-sleep-sync');
  mockDocument._setElement('stat-guarantee', '4.5h');
  const result = window.GoodSleepShare.getShareData('new-parent-sleep-sync');
  assert.strictEqual(result, 'Coordinated baby feeding duties and night shifts with the GoodSleep Parent Sleep Sync calculator. Uninterrupted sleep: 4.5h guaranteed. Sync your shifts: https://goodsleep.com/new-parent-sleep-sync');
});

test('new-parent-sleep-sync - without guarantee', () => {
  setupTest('new-parent-sleep-sync');
  const result = window.GoodSleepShare.getShareData('new-parent-sleep-sync');
  assert.strictEqual(result, 'Coordinate nighttime shifts between parents to guarantee critical consolidated sleep windows during infant feeding cycles: https://goodsleep.com/new-parent-sleep-sync');
});

test('default fallback', () => {
  setupTest('unknown-page');
  const result = window.GoodSleepShare.getShareData('unknown-page');
  assert.strictEqual(result, 'Optimize your circadian rhythms and improve sleep quality with interactive tools on GoodSleep: https://goodsleep.com');
});
