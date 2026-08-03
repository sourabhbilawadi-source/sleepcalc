const nodeTest = typeof describe === 'undefined' ? require('node:test') : null;
const describeFn = typeof describe !== 'undefined' ? describe : (nodeTest ? nodeTest.describe : describe);
const itFn = typeof it !== 'undefined' ? it : (nodeTest ? nodeTest.it : it);
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const themeCodePath = path.join(__dirname, '../js/theme.js');
const themeCode = fs.readFileSync(themeCodePath, 'utf8');

describeFn('theme.js', () => {
  itFn('sets data-theme attribute if gs-theme is in localStorage', () => {
    let setAttributeCalled = false;
    let attributeName = '';
    let attributeValue = '';

    const sandbox = {
      localStorage: {
        getItem: (key) => {
          if (key === 'gs-theme') return 'dark';
          return null;
        }
      },
      document: {
        documentElement: {
          setAttribute: (name, value) => {
            setAttributeCalled = true;
            attributeName = name;
            attributeValue = value;
          }
        }
      }
    };

    vm.createContext(sandbox);
    vm.runInContext(themeCode, sandbox);

    assert.strictEqual(setAttributeCalled, true);
    assert.strictEqual(attributeName, 'data-theme');
    assert.strictEqual(attributeValue, 'dark');
  });

  itFn('does not set data-theme attribute if gs-theme is not in localStorage', () => {
    let setAttributeCalled = false;

    const sandbox = {
      localStorage: {
        getItem: (key) => {
          return null;
        }
      },
      document: {
        documentElement: {
          setAttribute: (name, value) => {
            setAttributeCalled = true;
          }
        }
      }
    };

    vm.createContext(sandbox);
    vm.runInContext(themeCode, sandbox);

    assert.strictEqual(setAttributeCalled, false);
  });
});
