// FAQ toggle helper for standard FAQs
function toggleFaq(btn){
  // Handle specific case for World Cup sleep schedule FAQ cards
  if (btn.classList.contains('faq-card')) {
    const isOpen = btn.classList.contains('open');
    document.querySelectorAll('.faq-card').forEach(c => c.classList.remove('open'));
    if (!isOpen) {
      btn.classList.add('open');
    }
    return;
  }

  // Standard FAQ case
  const ans = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-icon');
  const open = ans.classList.contains('open');

  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-icon').forEach(i => i.textContent = '+');

  if(!open) {
    ans.classList.add('open');
    if (icon) icon.textContent = '×';
  }
}

// FAQ toggle helper for Magnesium Glycinate page and similar layouts
function toggleFaqBox(btn, id) {
  const ans = document.getElementById(id);
  const isOpen = ans.classList.contains('open');

  // Close others
  document.querySelectorAll('.faq-ans').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q-btn').forEach(b => b.classList.remove('active'));

  if (!isOpen) {
    ans.classList.add('open');
    btn.classList.add('active');
  }
}
