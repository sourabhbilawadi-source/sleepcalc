const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('node:vm');

// Setup mock window environment
const sandbox = {
  URLSearchParams: class {
    has() { return false; }
  },
  document: {
    documentElement: {
      classList: {
        add: () => {}
      }
    },
    createElementNS: (ns, name) => {
      return {
        tagName: name,
        namespaceURI: ns,
        textContent: ''
      };
    },
    createElement: (name) => {
       return {
         tagName: name,
         getContext: () => ({})
       };
    }
  },
  XMLSerializer: class {
    serializeToString(element) {
      let styleStr = '';
      let childrenHtml = '';

      let clonedElement = element;

      if (clonedElement.childNodes) {
         for (const child of clonedElement.childNodes) {
            if (child.tagName === 'style') {
               styleStr += `<style>${child.textContent}</style>`;
            } else if (child.nodeType === 3) {
               childrenHtml += child.textContent;
            } else {
               childrenHtml += `<${child.tagName}`;
               if (child.attributes) {
                  for(let key in child.attributes) {
                     childrenHtml += ` ${key}="${child.attributes[key]}"`;
                  }
               }
               childrenHtml += `>${child.innerHTML || ''}</${child.tagName}>`;
            }
         }
      }

      return `<svg>${styleStr}${childrenHtml}</svg>`;
    }
  },
  Blob: class {},
  URL: {
     createObjectURL: () => 'blob:url',
     revokeObjectURL: () => {}
  },
  Image: class {},
  localStorage: {
     getItem: () => null
  }
};

sandbox.window = {
  location: { search: '' }
};

// Evaluate the script in the context
const scriptContent = fs.readFileSync('./share-card.js', 'utf8');
vm.createContext(sandbox);
vm.runInContext(scriptContent, sandbox);


test('GoodSleepShare.serializeAndResolveSvg', async (t) => {
  const GoodSleepShare = sandbox.window.GoodSleepShare;

  await t.test('clones the element, adds style tag, and replaces design tokens', () => {
    // Setup a mock SVG element
    const mockSvgElement = {
      tagName: 'svg',
      childNodes: [
        { tagName: 'g', attributes: { fill: 'var(--teal)' }, innerHTML: '<path d="M0 0"/>' },
        { tagName: 'text', attributes: { fill: 'var(--text-hint)' }, innerHTML: 'Hello' },
        { tagName: 'rect', attributes: { stroke: 'var(--bg-soft)' }, innerHTML: '' },
        { tagName: 'circle', attributes: { fill: 'var(--border)' }, innerHTML: '' }
      ],
      firstChild: { tagName: 'g', attributes: { fill: 'var(--teal)' }, innerHTML: '<path d="M0 0"/>' },
      cloneNode(deep) {
        // Deep copy simulation
        const clone = {
           tagName: 'svg',
           childNodes: [
             { tagName: 'g', attributes: { fill: 'var(--teal)' }, innerHTML: '<path d="M0 0"/>' },
             { tagName: 'text', attributes: { fill: 'var(--text-hint)' }, innerHTML: 'Hello' },
             { tagName: 'rect', attributes: { stroke: 'var(--bg-soft)' }, innerHTML: '' },
             { tagName: 'circle', attributes: { fill: 'var(--border)' }, innerHTML: '' }
           ],
           insertBefore(newChild, referenceNode) {
             this.childNodes.unshift(newChild);
           }
        };
        clone.firstChild = clone.childNodes[1]; // First child logic is slightly simplified for testing insertBefore
        return clone;
      }
    };

    const result = GoodSleepShare.serializeAndResolveSvg(mockSvgElement);

    // 1. Check if the style tag was injected with svgStyles
    assert.match(result, /<style>.*\.caffeine-chart-axis-label.*<\/style>/s, 'Should contain the injected <style> tag with svgStyles');

    // 2. Check token replacements
    assert.match(result, /fill="#1d9e75"/, 'Should replace var(--teal) with its hex value (#1d9e75)');
    assert.doesNotMatch(result, /var\(--teal\)/, 'Should not contain var(--teal)');

    // 3. Check fallback replacements
    assert.match(result, /fill="#9ca3af"/, 'Should replace fallback var(--text-hint) with #9ca3af');
    assert.match(result, /stroke="#1f2937"/, 'Should replace fallback var(--bg-soft) with #1f2937');
    assert.match(result, /fill="#374151"/, 'Should replace fallback var(--border) with #374151');
  });

  await t.test('works with multiple occurrences of the same variable', () => {
     const mockSvgElement = {
      tagName: 'svg',
      childNodes: [
        { nodeType: 3, textContent: 'var(--purple) var(--purple)' },
      ],
      cloneNode(deep) {
        return {
           tagName: 'svg',
           childNodes: [
             { nodeType: 3, textContent: 'var(--purple) var(--purple)' },
           ],
           insertBefore(newChild, referenceNode) {
             this.childNodes.unshift(newChild);
           }
        };
      }
    };

    const result = GoodSleepShare.serializeAndResolveSvg(mockSvgElement);
    assert.match(result, /#8b5cf6 #8b5cf6/, 'Should replace all occurrences of a custom property');
  });
});
