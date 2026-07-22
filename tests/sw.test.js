// Test sw.js service worker fetch event
const fs = require('fs');
const path = require('path');

// Read the SW code
const swCode = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');

describe('Service Worker - Fetch Event', () => {
  beforeEach(() => {
    // Reset mocks and global state before each test
    global.self = {
      addEventListener: jest.fn(),
      location: {
        origin: 'https://example.com'
      }
    };

    // Evaluate the service worker script in the current context
    eval(swCode);
  });

  it('should register fetch event listener', () => {
    expect(self.addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function));
  });
});
