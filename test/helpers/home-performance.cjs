// Historical content snapshots ignore only the explicitly tested performance delivery changes.
// Home performance tests separately verify the stylesheet manifest, seeds and photo provenance.
module.exports = html => html.replace(/<head>[\s\S]*?<\/head>/, '<head></head>')
 .replace('home-header-hero header-photo-page', 'home-header-hero')
 .replace(/<(?:img|source)\b[^>]*>/g, tag => tag.replace(/\s+(?:src|srcset|sizes)="[^"]*"/g, ''));
