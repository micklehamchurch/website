// TEMPORARY TYPOGRAPHY PREVIEW — remove after parish typography decision.
(() => {
  const root = document.documentElement;
  const script = document.currentScript;
  // The public head hook is never emitted for Admin; also guard accidental inclusion.
  if (/(^|\/)admin(\/|$)/.test(location.pathname)) return;
  const key = 'mickleham-typography-preview';
  const modes = ['heritage', 'modern-classic', 'contemporary'];
  const valid = value => modes.includes(value) ? value : 'heritage';
  const fontUrls = {
    'modern-classic': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap',
    contemporary: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
  };
  const loaded = new Set();
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('typography-preview.css', script.src).href;
  document.head.append(style);
  function apply(value) {
    const mode = valid(value);
    root.dataset.typography = mode;
    if (fontUrls[mode] && !loaded.has(mode)) {
      const font = document.createElement('link');
      font.rel = 'stylesheet'; font.href = fontUrls[mode];
      document.head.append(font); loaded.add(mode);
    }
    document.querySelectorAll('[data-typography-option]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.typographyOption === mode));
    });
  }
  let saved;
  try { saved = localStorage.getItem(key); } catch { /* Readable default when storage is unavailable. */ }
  apply(saved);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-typography-option]');
    if (!button) return;
    const mode = valid(button.dataset.typographyOption);
    apply(mode);
    try { localStorage.setItem(key, mode); } catch { /* Current-page switching still works. */ }
  });
  // site.js emits this after inserting its shared footer.
  document.addEventListener('typography-preview-ready', () => apply(root.dataset.typography));
})();
