const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

// Read the share-card.js file
const shareCardCode = fs.readFileSync('./share-card.js', 'utf8');

// Mock browser globals
const mockWindow = {
  location: {
    search: '',
    origin: 'https://goodsleep.rest',
    pathname: '/'
  },
  open: () => {}
};

const mockDocument = {
  documentElement: {
    classList: {
      add: () => {}
    }
  },
  createElement: () => ({}),
  createElementNS: () => ({}),
  getElementById: () => null,
  body: {
    appendChild: () => {}
  }
};

class MockURLSearchParams {
  constructor(search) {
    this.search = search;
  }
  has(param) {
    return this.search.includes(param);
  }
}

// Create a context with the mocks
const context = {
  window: mockWindow,
  document: mockDocument,
  URLSearchParams: MockURLSearchParams,
  URL: {
    createObjectURL: () => 'blob:url',
    revokeObjectURL: () => {}
  },
  Blob: class Blob {},
  Image: class Image {},
  localStorage: {
    getItem: () => null
  }
};

vm.createContext(context);
vm.runInContext(shareCardCode, context);

const GoodSleepShare = context.window.GoodSleepShare;

test.describe('GoodSleepShare.drawRoundedRect', () => {

  function createMockCtx() {
    const calls = [];
    return {
      calls,
      beginPath: (...args) => calls.push(['beginPath', ...args]),
      moveTo: (...args) => calls.push(['moveTo', ...args]),
      lineTo: (...args) => calls.push(['lineTo', ...args]),
      quadraticCurveTo: (...args) => calls.push(['quadraticCurveTo', ...args]),
      closePath: (...args) => calls.push(['closePath', ...args]),
      fill: (...args) => calls.push(['fill', ...args]),
      stroke: (...args) => calls.push(['stroke', ...args]),
    };
  }

  test.it('should draw a rounded rectangle with only fill', () => {
    const ctx = createMockCtx();
    GoodSleepShare.drawRoundedRect(ctx, 10, 20, 100, 50, 5, true, false);

    assert.deepStrictEqual(ctx.calls, [
      ['beginPath'],
      ['moveTo', 15, 20], // x + radius, y
      ['lineTo', 105, 20], // x + width - radius, y
      ['quadraticCurveTo', 110, 20, 110, 25], // x + width, y, x + width, y + radius
      ['lineTo', 110, 65], // x + width, y + height - radius
      ['quadraticCurveTo', 110, 70, 105, 70], // x + width, y + height, x + width - radius, y + height
      ['lineTo', 15, 70], // x + radius, y + height
      ['quadraticCurveTo', 10, 70, 10, 65], // x, y + height, x, y + height - radius
      ['lineTo', 10, 25], // x, y + radius
      ['quadraticCurveTo', 10, 20, 15, 20], // x, y, x + radius, y
      ['closePath'],
      ['fill']
    ]);
  });

  test.it('should draw a rounded rectangle with only stroke', () => {
    const ctx = createMockCtx();
    GoodSleepShare.drawRoundedRect(ctx, 0, 0, 50, 50, 10, false, true);

    const operations = ctx.calls.map(c => c[0]);
    assert.ok(operations.includes('stroke'), 'should call stroke');
    assert.ok(!operations.includes('fill'), 'should not call fill');
    assert.strictEqual(ctx.calls[ctx.calls.length - 1][0], 'stroke', 'stroke should be the last call');
  });

  test.it('should draw a rounded rectangle with both fill and stroke', () => {
    const ctx = createMockCtx();
    GoodSleepShare.drawRoundedRect(ctx, 5, 5, 20, 20, 2, true, true);

    const operations = ctx.calls.map(c => c[0]);
    assert.ok(operations.includes('fill'), 'should call fill');
    assert.ok(operations.includes('stroke'), 'should call stroke');

    // Check that fill is called before stroke
    const fillIndex = operations.indexOf('fill');
    const strokeIndex = operations.indexOf('stroke');
    assert.ok(fillIndex < strokeIndex, 'fill should be called before stroke');
  });

  test.it('should trace the correct path when parameters vary', () => {
    const ctx = createMockCtx();
    GoodSleepShare.drawRoundedRect(ctx, 100, 200, 300, 150, 15, false, false);

    assert.deepStrictEqual(ctx.calls, [
      ['beginPath'],
      ['moveTo', 115, 200],
      ['lineTo', 385, 200],
      ['quadraticCurveTo', 400, 200, 400, 215],
      ['lineTo', 400, 335],
      ['quadraticCurveTo', 400, 350, 385, 350],
      ['lineTo', 115, 350],
      ['quadraticCurveTo', 100, 350, 100, 335],
      ['lineTo', 100, 215],
      ['quadraticCurveTo', 100, 200, 115, 200],
      ['closePath']
    ]);
  });
});
