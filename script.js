const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mainNav');

function closeMenu({ returnFocus = false } = {}) {
  if (!nav?.classList.contains('open')) return;
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Open menu');
  if (returnFocus) toggle?.focus();
}

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

nav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => closeMenu());
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu({ returnFocus: true });
});

const form = document.querySelector('#contactForm');
const message = document.querySelector('#formMessage');

form?.addEventListener('submit', event => {
  event.preventDefault();
  message.textContent = 'Demo only — this form is not sent to the church. Please use the email address shown here to get in touch.';
  form.reset();
});
