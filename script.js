const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('#mainNav');
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false')}));
const form=document.querySelector('#contactForm');
const message=document.querySelector('#formMessage');
form?.addEventListener('submit',e=>{e.preventDefault();message.textContent='Demo only — the final site will send this enquiry to the church team.';form.reset()});
