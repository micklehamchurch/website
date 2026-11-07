// About's public presentation omits temporary tools; Dev reviewers can still opt in.
document.documentElement.classList.toggle('about-design-preview', new URLSearchParams(location.search).get('design-preview') === '1');
