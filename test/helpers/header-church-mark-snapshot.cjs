// Discount only the exact approved mark and delivery changes in older preservation tests.
const css=`\n/* The approved church illustration replaces only the header mark, including its drawer copy. */
.site-header .header-church-mark,.responsive-navigation-heading .header-church-mark { display:block; flex:none; object-fit:contain; width:52px; height:52px; }
@media(min-width:1536px) { .site-header:not(.is-condensed) .header-church-mark { width:80px; height:80px; } }
@media(max-width:767px) { .site-header .header-church-mark { width:44px; height:44px; } }
@media(orientation:landscape) and (max-width:999px) and (max-height:460px) { html body .site-header .header-church-mark { width:36px; height:36px; } }
.responsive-navigation-heading .header-church-mark { width:44px; height:44px; }
`;
module.exports=s=>s.replace('<img class="header-church-mark" src="assets/images/branding/church-illustration.svg" width="80" height="77" alt="" decoding="async">','<span class="brand-mark" aria-hidden="true">✝</span>').replace(css,'').replaceAll('navigation=20261104-church-mark-1','navigation=20261104-information-1').replaceAll('header=20261104-church-mark-1','header=20261104-information-1');
