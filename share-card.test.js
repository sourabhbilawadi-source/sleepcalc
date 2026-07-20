const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

// Read the share-card.js file
const code = fs.readFileSync('./share-card.js', 'utf8');

// Create a sandbox with a fake window and document to allow the script to evaluate
const sandbox = {
  window: {
    location: {
      search: ''
    }
  },
  document: {
    createElement: () => ({}),
    documentElement: {
      classList: {
        add: () => {}
      }
    }
  },
  URLSearchParams: class {
    has() { return false; }
  },
  Blob: class {},
  GoodSleepShare: undefined // Provide a hook to extract it
};

// Run the script in the sandbox
vm.createContext(sandbox);
vm.runInContext(code + '\nGoodSleepShare_exported = GoodSleepShare;', sandbox);

const GoodSleepShare = sandbox.GoodSleepShare_exported;

test('GoodSleepShare.getLines', async (t) => {

  // Mock context that returns 10 width for each character
  const mockCtx = {
    measureText: (text) => ({ width: text.length * 10 })
  };

  await t.test('Happy path: short text that fits on one line', () => {
    // "hello world" length 11, width 110. Max width 200. Should fit.
    const result = GoodSleepShare.getLines(mockCtx, "hello world", 200);
    assert.deepEqual(result, ["hello world"]);
  });

  await t.test('Wrapping path: text that exceeds maxWidth', () => {
    // "hello world this is a test"
    // "hello world" length 11 -> width 110 (fits < 150)
    // "hello world this" length 16 -> width 160 (exceeds 150)
    // -> break: "hello world", start next with "this"
    // "this is a test"
    // "this is a" length 9 -> width 90 (fits < 150)
    // "this is a test" length 14 -> width 140 (fits < 150)

    // Wait, let's trace exactly what happens:
    // currentLine = "hello"
    // word = "world", width("hello world") = 110 < 150, currentLine = "hello world"
    // word = "this", width("hello world this") = 160 >= 150, push "hello world", currentLine = "this"
    // word = "is", width("this is") = 70 < 150, currentLine = "this is"
    // word = "a", width("this is a") = 90 < 150, currentLine = "this is a"
    // word = "test", width("this is a test") = 140 < 150, currentLine = "this is a test"
    // push currentLine -> ["hello world", "this is a test"]

    const result = GoodSleepShare.getLines(mockCtx, "hello world this is a test", 150);
    assert.deepEqual(result, ["hello world", "this is a test"]);
  });

  await t.test('Edge case: a single word longer than maxWidth', () => {
    // "supercalifragilisticexpialidocious" length 34 -> width 340
    // maxWidth = 100
    // The code logic:
    // currentLine = "supercalifragilisticexpialidocious"
    // loop won't run if it's just one word.
    // lines.push(currentLine)
    const result1 = GoodSleepShare.getLines(mockCtx, "supercalifragilisticexpialidocious", 100);
    assert.deepEqual(result1, ["supercalifragilisticexpialidocious"]);

    // Let's test with other words
    // "hello supercalifragilisticexpialidocious world"
    // currentLine = "hello"
    // word = "super...", width("hello super...") > 100. push "hello", currentLine = "super..."
    // word = "world", width("super... world") > 100. push "super...", currentLine = "world"
    // push "world"
    const result2 = GoodSleepShare.getLines(mockCtx, "hello supercalifragilisticexpialidocious world", 100);
    assert.deepEqual(result2, ["hello", "supercalifragilisticexpialidocious", "world"]);
  });

  await t.test('Boundary condition: text width exactly equals maxWidth', () => {
    // strict less than is used: if (width < maxWidth)
    // "hello world" length 11 -> width 110. maxWidth = 110.
    // width < maxWidth is false.
    // currentLine = "hello"
    // word = "world". width = 110. 110 < 110 is false.
    // push "hello", currentLine = "world"
    // push "world"
    const result = GoodSleepShare.getLines(mockCtx, "hello world", 110);
    assert.deepEqual(result, ["hello", "world"]);
  });
});
