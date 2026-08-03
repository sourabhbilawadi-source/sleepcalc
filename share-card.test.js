require('./share-card.js');

describe('GoodSleepShare.drawRoundedRect', () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn()
    };
  });

  it('should call fill and stroke when true', () => {
    window.GoodSleepShare.drawRoundedRect(ctx, 0, 0, 100, 100, 10, true, true);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('should call fill but not stroke when fill is true and stroke is false', () => {
    window.GoodSleepShare.drawRoundedRect(ctx, 0, 0, 100, 100, 10, true, false);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('should handle undefined radius', () => {
    window.GoodSleepShare.drawRoundedRect(ctx, 0, 0, 100, 100, undefined, false, false);

    // Default radius logic should lead to radius=0 or a full object of {tl:0, tr:0, br:0, bl:0}
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0); // x + 0, y
  });

  it('should handle numeric radius correctly', () => {
    window.GoodSleepShare.drawRoundedRect(ctx, 10, 20, 100, 200, 5, false, false);

    // radius = 5
    // tl=5, tr=5, br=5, bl=5
    // moveTo(x + radius, y) => moveTo(15, 20)
    expect(ctx.moveTo).toHaveBeenCalledWith(15, 20);
    // lineTo(x + width - radius.tr, y) => lineTo(105, 20)
    expect(ctx.lineTo).toHaveBeenCalledWith(105, 20);
    // quadraticCurveTo(x + width, y, x + width, y + radius.tr) => qCT(110, 20, 110, 25)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(110, 20, 110, 25);
    // lineTo(x + width, y + height - radius.br) => lineTo(110, 215)
    expect(ctx.lineTo).toHaveBeenCalledWith(110, 215);
    // quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height) => qCT(110, 220, 105, 220)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(110, 220, 105, 220);
    // lineTo(x + radius.bl, y + height) => lineTo(15, 220)
    expect(ctx.lineTo).toHaveBeenCalledWith(15, 220);
    // quadraticCurveTo(x, y + height, x, y + height - radius.bl) => qCT(10, 220, 10, 215)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(10, 220, 10, 215);
    // lineTo(x, y + radius.tl) => lineTo(10, 25)
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 25);
    // quadraticCurveTo(x, y, x + radius.tl, y) => qCT(10, 20, 15, 20)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(10, 20, 15, 20);
  });

  it('should handle object radius correctly', () => {
    const radius = { tl: 5, tr: 10, br: 15, bl: 20 };
    window.GoodSleepShare.drawRoundedRect(ctx, 10, 20, 100, 200, radius, false, false);

    // moveTo(x + radius.tl, y) => moveTo(15, 20)
    expect(ctx.moveTo).toHaveBeenCalledWith(15, 20);
    // lineTo(x + width - radius.tr, y) => lineTo(100, 20)
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 20);
    // quadraticCurveTo(x + width, y, x + width, y + radius.tr) => qCT(110, 20, 110, 30)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(110, 20, 110, 30);
    // lineTo(x + width, y + height - radius.br) => lineTo(110, 205)
    expect(ctx.lineTo).toHaveBeenCalledWith(110, 205);
    // quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height) => qCT(110, 220, 95, 220)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(110, 220, 95, 220);
    // lineTo(x + radius.bl, y + height) => lineTo(30, 220)
    expect(ctx.lineTo).toHaveBeenCalledWith(30, 220);
    // quadraticCurveTo(x, y + height, x, y + height - radius.bl) => qCT(10, 220, 10, 200)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(10, 220, 10, 200);
    // lineTo(x, y + radius.tl) => lineTo(10, 25)
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 25);
    // quadraticCurveTo(x, y, x + radius.tl, y) => qCT(10, 20, 15, 20)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(10, 20, 15, 20);
  });

  it('should handle partial object radius with defaults', () => {
    const radius = { tl: 5 }; // others should be 0
    window.GoodSleepShare.drawRoundedRect(ctx, 10, 20, 100, 200, radius, false, false);

    // moveTo(x + radius.tl, y) => moveTo(15, 20)
    expect(ctx.moveTo).toHaveBeenCalledWith(15, 20);
    // lineTo(x + width - radius.tr, y) => lineTo(110, 20)
    expect(ctx.lineTo).toHaveBeenCalledWith(110, 20);
    // quadraticCurveTo(x + width, y, x + width, y + radius.tr) => qCT(110, 20, 110, 20)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(110, 20, 110, 20);
    // lineTo(x + width, y + height - radius.br) => lineTo(110, 220)
    expect(ctx.lineTo).toHaveBeenCalledWith(110, 220);
    // quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height) => qCT(110, 220, 110, 220)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(110, 220, 110, 220);
    // lineTo(x + radius.bl, y + height) => lineTo(10, 220)
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 220);
    // quadraticCurveTo(x, y + height, x, y + height - radius.bl) => qCT(10, 220, 10, 220)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(10, 220, 10, 220);
    // lineTo(x, y + radius.tl) => lineTo(10, 25)
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 25);
    // quadraticCurveTo(x, y, x + radius.tl, y) => qCT(10, 20, 15, 20)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(10, 20, 15, 20);
  });
});

describe('GoodSleepShare.truncateText', () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      measureText: jest.fn((text) => ({ width: text.length * 10 }))
    };
  });

  it('should return the original text if it fits within maxWidth', () => {
    const text = 'Hello'; // length 5, width 50
    const maxWidth = 100;
    const result = window.GoodSleepShare.truncateText(ctx, text, maxWidth);
    expect(result).toBe('Hello');
  });

  it('should truncate the text and append ... if it exceeds maxWidth', () => {
    const text = 'Hello World'; // length 11, width 110
    const maxWidth = 90;
    const result = window.GoodSleepShare.truncateText(ctx, text, maxWidth);
    expect(result).toBe('Hello ...');
    expect(ctx.measureText(result).width).toBeLessThanOrEqual(maxWidth);
  });

  it('should return only ... if maxWidth is extremely small', () => {
    const text = 'Hello'; // length 5, width 50
    const maxWidth = 30; // '...' is width 30
    const result = window.GoodSleepShare.truncateText(ctx, text, maxWidth);
    expect(result).toBe('...');
    expect(ctx.measureText(result).width).toBeLessThanOrEqual(maxWidth);
  });

  it('should handle empty string correctly', () => {
    const text = ''; // length 0, width 0
    const maxWidth = 50;
    const result = window.GoodSleepShare.truncateText(ctx, text, maxWidth);
    expect(result).toBe('');
  });
});
