const assert = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('fs');

// Mock browser globals needed by share-card.js
global.window = { location: { search: '', origin: 'https://goodsleep.rest', pathname: '/' } };
global.document = {
  documentElement: { classList: { add: () => {} } },
  createElement: () => ({ width: 0, height: 0, getContext: () => ({}) })
};
global.URLSearchParams = class { has() { return false; } };

// Read and evaluate the source code
const code = fs.readFileSync('./share-card.js', 'utf8');
eval(code);

const share = global.window.GoodSleepShare || GoodSleepShare;

describe('GoodSleepShare.getLines', () => {
  // Mock context that assumes every character is exactly 10 pixels wide
  // and includes spaces.
  const mockCtx = {
    measureText: (text) => ({ width: text.length * 10 })
  };

  it('should split text into multiple lines when it exceeds maxWidth', () => {
    // "hello world this is a test"
    // widths (including spaces):
    // "hello" = 50
    // "hello world" = 110 (over 100) -> line 1: "hello"
    // "world" = 50
    // "world this" = 100 (not < 100, so it hits else branch) -> line 2: "world"
    // "this" = 40
    // "this is" = 70 (< 100)
    // "this is a" = 90 (< 100)
    // "this is a test" = 140 (over 100) -> line 3: "this is a"
    // "test" = 40 -> line 4: "test"

    // Wait, the code says:
    // width = ctx.measureText(currentLine + " " + word).width;
    // if (width < maxWidth) currentLine += " " + word;
    // else { lines.push(currentLine); currentLine = word; }

    // So for "hello world this is a test" and maxWidth = 100
    // word1: "world", measure("hello world") = 110 < 100? No. lines.push("hello"). currentLine = "world"
    // word2: "this", measure("world this") = 100 < 100? No. lines.push("world"). currentLine = "this"
    // word3: "is", measure("this is") = 70 < 100? Yes. currentLine = "this is"
    // word4: "a", measure("this is a") = 90 < 100? Yes. currentLine = "this is a"
    // word5: "test", measure("this is a test") = 140 < 100? No. lines.push("this is a"). currentLine = "test"
    // lines.push("test")

    const text = "hello world this is a test";
    const maxWidth = 100;

    const expected = ['hello', 'world', 'this is a', 'test'];
    const result = share.getLines(mockCtx, text, maxWidth);

    assert.deepStrictEqual(result, expected);
  });

  it('should keep text on a single line if it is under maxWidth', () => {
    const text = "short text"; // length 10 -> width 100
    const maxWidth = 150; // greater than 100

    const expected = ['short text'];
    const result = share.getLines(mockCtx, text, maxWidth);

    assert.deepStrictEqual(result, expected);
  });

  it('should handle empty string correctly', () => {
    // Current implementation:
    // text = ""
    // words = [""]
    // words.length is 1, loop doesn't run
    // lines.push(currentLine) -> [""]
    const text = "";
    const maxWidth = 100;

    const expected = [''];
    const result = share.getLines(mockCtx, text, maxWidth);

    assert.deepStrictEqual(result, expected);
  });

  it('should push a single very long word without breaking it', () => {
    // If a single word is longer than maxWidth, the code handles it by keeping it as currentLine
    // Then when checking the next word: measureText(currentLine + " " + nextWord) which will be > maxWidth
    // So it pushes currentLine.

    const text = "supercalifragilisticexpialidocious is long";
    const maxWidth = 100;

    // "supercalifragilisticexpialidocious" width is 340.
    // next word "is", width is 370 > 100.
    // lines.push("supercalifragilisticexpialidocious")
    // currentLine = "is"
    // next word "long", "is long" width is 70 < 100.
    // currentLine = "is long"

    const expected = ['supercalifragilisticexpialidocious', 'is long'];
    const result = share.getLines(mockCtx, text, maxWidth);

    assert.deepStrictEqual(result, expected);
  });

  it('should handle exact width matching', () => {
    const text = "one two three";
    // widths: "one"=30, "two"=30, "three"=50
    // "one two" = 70.
    // If maxWidth = 70, then "width < maxWidth" is false for "one two".
    // It requires strictly less than. Let's make it hit exactly 70.
    const maxWidth = 70;

    // measure("one two") = 70. 70 < 70 is false.
    // lines.push("one"). currentLine = "two"
    // measure("two three") = 90. 90 < 70 is false.
    // lines.push("two"). currentLine = "three"
    // lines.push("three")

    const expected = ['one', 'two', 'three'];
    const result = share.getLines(mockCtx, text, maxWidth);

    assert.deepStrictEqual(result, expected);
  });

});
