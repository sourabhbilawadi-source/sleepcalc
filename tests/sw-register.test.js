/**
 * @jest-environment jsdom
 */

describe('sw-register', () => {
  let addEventListenerSpy;

  beforeEach(() => {
    jest.resetModules();
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete navigator.serviceWorker;
  });

  it('should not add event listener if serviceWorker is not supported', () => {
    require('../sw-register.js');
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('should add event listener and register service worker on load', async () => {
    const registerMock = jest.fn().mockResolvedValue('mock-reg');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true
    });

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    require('../sw-register.js');
    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));

    const loadCallback = addEventListenerSpy.mock.calls.find(call => call[0] === 'load')[1];
    loadCallback();

    await new Promise(process.nextTick);

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    expect(consoleLogSpy).toHaveBeenCalledWith('Service Worker registered', 'mock-reg');
  });

  it('should log error if registration fails', async () => {
    const registerMock = jest.fn().mockRejectedValue('mock-err');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    require('../sw-register.js');

    const loadCallback = addEventListenerSpy.mock.calls.find(call => call[0] === 'load')[1];
    loadCallback();

    await new Promise(process.nextTick);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Service Worker registration failed', 'mock-err');
  });
});
