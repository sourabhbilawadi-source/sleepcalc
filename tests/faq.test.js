const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.resolve(__dirname, '../faq.js'), 'utf8');
// Evaluate code to expose the functions
eval(code);

describe('faq.js functions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('toggleFaq', () => {
    it('should handle standard FAQs correctly', () => {
      document.body.innerHTML = `
        <div class="faq-item">
          <button class="faq-btn" id="btn1">
            <span class="faq-icon">+</span>
          </button>
          <div class="faq-a" id="ans1">Answer 1</div>
        </div>
        <div class="faq-item">
          <button class="faq-btn" id="btn2">
            <span class="faq-icon">+</span>
          </button>
          <div class="faq-a" id="ans2">Answer 2</div>
        </div>
      `;

      const btn1 = document.getElementById('btn1');
      const ans1 = document.getElementById('ans1');
      const icon1 = btn1.querySelector('.faq-icon');

      const btn2 = document.getElementById('btn2');
      const ans2 = document.getElementById('ans2');
      const icon2 = btn2.querySelector('.faq-icon');

      // Click first button
      toggleFaq(btn1);

      expect(ans1.classList.contains('open')).toBe(true);
      expect(icon1.textContent).toBe('×');
      expect(ans2.classList.contains('open')).toBe(false);
      expect(icon2.textContent).toBe('+');

      // Click second button
      toggleFaq(btn2);

      expect(ans1.classList.contains('open')).toBe(false);
      expect(icon1.textContent).toBe('+');
      expect(ans2.classList.contains('open')).toBe(true);
      expect(icon2.textContent).toBe('×');

      // Click second button again to close it
      toggleFaq(btn2);

      expect(ans2.classList.contains('open')).toBe(false);
      expect(icon2.textContent).toBe('+');
    });

    it('should handle missing faq-icon safely', () => {
      document.body.innerHTML = `
        <div class="faq-item">
          <button class="faq-btn" id="btn3"></button>
          <div class="faq-a" id="ans3">Answer 3</div>
        </div>
      `;

      const btn3 = document.getElementById('btn3');
      const ans3 = document.getElementById('ans3');

      toggleFaq(btn3);
      expect(ans3.classList.contains('open')).toBe(true);
    });

    it('should handle faq-card correctly (World Cup specific)', () => {
      document.body.innerHTML = `
        <div class="faq-card" id="card1">Card 1</div>
        <div class="faq-card" id="card2">Card 2</div>
      `;

      const card1 = document.getElementById('card1');
      const card2 = document.getElementById('card2');

      // Open card1
      toggleFaq(card1);
      expect(card1.classList.contains('open')).toBe(true);
      expect(card2.classList.contains('open')).toBe(false);

      // Open card2 (should close card1)
      toggleFaq(card2);
      expect(card1.classList.contains('open')).toBe(false);
      expect(card2.classList.contains('open')).toBe(true);

      // Close card2
      toggleFaq(card2);
      expect(card1.classList.contains('open')).toBe(false);
      expect(card2.classList.contains('open')).toBe(false);
    });
  });

  describe('toggleFaqBox', () => {
    it('should toggle faq boxes correctly', () => {
      document.body.innerHTML = `
        <button class="faq-q-btn" id="btn1"></button>
        <div class="faq-ans" id="ans1">Answer 1</div>
        <button class="faq-q-btn" id="btn2"></button>
        <div class="faq-ans" id="ans2">Answer 2</div>
      `;

      const btn1 = document.getElementById('btn1');
      const ans1 = document.getElementById('ans1');
      const btn2 = document.getElementById('btn2');
      const ans2 = document.getElementById('ans2');

      // Open box 1
      toggleFaqBox(btn1, 'ans1');

      expect(ans1.classList.contains('open')).toBe(true);
      expect(btn1.classList.contains('active')).toBe(true);
      expect(ans2.classList.contains('open')).toBe(false);
      expect(btn2.classList.contains('active')).toBe(false);

      // Open box 2
      toggleFaqBox(btn2, 'ans2');

      expect(ans1.classList.contains('open')).toBe(false);
      expect(btn1.classList.contains('active')).toBe(false);
      expect(ans2.classList.contains('open')).toBe(true);
      expect(btn2.classList.contains('active')).toBe(true);

      // Close box 2
      toggleFaqBox(btn2, 'ans2');

      expect(ans2.classList.contains('open')).toBe(false);
      expect(btn2.classList.contains('active')).toBe(false);
    });
  });
});
