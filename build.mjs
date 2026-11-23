// Builds the static pages from src/ into the repo root. No dependencies.
// Usage: node build.mjs
//
// Each file in src/pages/ starts with a meta comment:
//   <!--meta {"title": "...", "description": "...", "nav": "pricing", "cta": true} -->
// The page body is inserted into src/layout.html in place of {{content}}.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;

// Public address of the site. Canonical links, the sitemap, social previews and structured data use it.
// Change it here (or set SITE_URL when building) if the site moves, e.g. to https://fortis.dev.
const SITE = (process.env.SITE_URL || 'https://fortis-website-three.vercel.app').replace(/\/$/, '');
// Google Search Console HTML-tag verification code (the content="…" value). Leave empty if you verify another way.
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || '';
const TODAY = new Date().toISOString().slice(0, 10);

const ORG = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'Fortis',
  url: `${SITE}/`,
  logo: `${SITE}/brand/fortis-icon-512.png`,
  email: 'hello@fortis.dev',
  description: 'Continuous security testing for African fintech: checks on every push and deploy, and an evidence pack for auditors and partner banks.',
  address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
  areaServed: ['NG', 'KE', 'GH', 'ZA'],
  contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', email: 'hello@fortis.dev' }, { '@type': 'ContactPoint', contactType: 'security', email: 'security@fortis.dev' }],
};
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Fortis', url: `${SITE}/`, publisher: { '@id': `${SITE}/#organization` }, inLanguage: 'en' };
const APP = {
  '@type': 'SoftwareApplication',
  name: 'Fortis',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'macOS, Linux, Windows',
  description: 'Fintech security testing: payment-key and secret detection, vulnerable dependencies, fintech code rules, staging access checks and a CBN, NDPA and PCI DSS evidence pack.',
  publisher: { '@id': `${SITE}/#organization` },
  offers: [
    { '@type': 'Offer', name: 'Fortis Free', price: '0', priceCurrency: 'NGN' },
    { '@type': 'Offer', name: 'Fortis Core', price: '450000', priceCurrency: 'NGN', description: 'Per month, before VAT' },
    { '@type': 'Offer', name: 'Fortis Plus', price: '750000', priceCurrency: 'NGN', description: 'Per month, before VAT' },
  ],
};
const pageUrl = (page) => (page === 'index' ? `${SITE}/` : `${SITE}/${page}.html`);
const sitemapEntries = [];
const layout = readFileSync(join(root, 'src/layout.html'), 'utf8');

const CTA = `<section class="cta-band">
  <div class="container cta-inner">
    <div>
      <span class="eyebrow">Early access</span>
      <h2 class="h2 words">Ship every day. <span class="it accent-mint">Prove it's safe.</span></h2>
    </div>
    <div class="cta-actions reveal">
      <p>We're onboarding a small group of fintechs, PSPs, MFBs and lenders in Nigeria as design partners.</p>
      <div class="cta-btns">
        <a href="contact.html" class="btn btn-primary">Become a design partner <svg><use href="#i-arrow"/></svg></a>
        <a href="pricing.html" class="btn btn-ghost light">See pricing <svg><use href="#i-arrow"/></svg></a>
      </div>
    </div>
  </div>
</section>`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const pages = readdirSync(join(root, 'src/pages')).filter((f) => f.endsWith('.html'));
for (const file of pages) {
  const src = readFileSync(join(root, 'src/pages', file), 'utf8');
  const m = src.match(/^<!--meta\s+(\{[\s\S]*?\})\s*-->\n?/);
  if (!m) throw new Error(`${file}: missing <!--meta {...} --> header`);
  const meta = JSON.parse(m[1]);
  const body = src.slice(m[0].length);
  const page = file.replace(/\.html$/, '');

  const url = pageUrl(page);
  const graph = [ORG, WEBSITE];
  if (page === 'index') graph.push(APP);
  else graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Fortis', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: meta.title.replace(/ · Fortis$/, ''), item: url },
  ] });
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  if (!meta.noindex) sitemapEntries.push({ url, priority: page === 'index' ? '1.0' : ['product', 'pricing', 'solutions', 'compare'].includes(page) ? '0.9' : '0.6' });

  let html = layout
    .replaceAll('{{url}}', url)
    .replaceAll('{{site}}', SITE)
    .replace('{{robots}}', meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
    .replace('{{verification}}', GOOGLE_SITE_VERIFICATION ? `\n  <meta name="google-site-verification" content="${esc(GOOGLE_SITE_VERIFICATION)}">` : '')
    .replace('{{jsonld}}', jsonld)
    .replaceAll('{{title}}', esc(meta.title))
    .replaceAll('{{description}}', esc(meta.description))
    .replaceAll('{{page}}', page)
    .replace('{{cta}}', meta.cta ? CTA : '')
    .replace('{{content}}', body.trimEnd())
    .replace('{{scripts}}', (meta.scripts || []).map((src) => `<script src="${src}" defer></script>`).join('\n'));

  if (meta.nav) {
    html = html.replace(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" data-current`);
  }
  writeFileSync(join(root, file), html);
  console.log(`built ${file}`);
}

// Search engines: sitemap of every indexable page, and robots.txt pointing at it.
sitemapEntries.sort((a, b) => b.priority.localeCompare(a.priority));
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map((e) => `  <url><loc>${e.url}</loc><lastmod>${TODAY}</lastmod><priority>${e.priority}</priority></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(root, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /offline.html
Disallow: /unavailable.html

Sitemap: ${SITE}/sitemap.xml
`);
console.log(`wrote sitemap.xml (${sitemapEntries.length} pages) and robots.txt for ${SITE}`);
