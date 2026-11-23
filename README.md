# Fortis website

Marketing site for **Fortis**: security testing on every release, between your annual pentests, for African fintech.

A static site (HTML, CSS and vanilla JavaScript) with no dependencies. The built pages are committed, so any static host serves the repo as is.

## Run locally

```bash
npx serve .
```

Or open `index.html` directly in a browser.

## Deploy

The site works on any static host. For Vercel, Netlify or Cloudflare Pages, import the repo with no build command and an output directory of `/`. For GitHub Pages, go to Settings → Pages and deploy from the `main` branch at the root.

## Pages

| Page | What's on it |
|---|---|
| `index.html` | Home: hero, problem, how it works, showcase, comparison, pricing, trust, FAQ, early access |
| `product.html` | Guard CLI, fintech rule pack, staging checks, evidence pack, dashboard, pentest partners, integrations |
| `solutions.html` | Developers, security leads, compliance, partner banks, who we serve |
| `compare.html` | Regular tests vs vulnerability assessment vs pentest vs Fortis, release-year view, landscape |
| `pricing.html` | Plans, full feature table, pentest-gap calculator, add-ons, billing FAQ |
| `trust.html` | Principles, data flow, safe active checks, compliance mapping, documents, sub-processors |
| `about.html` | Mission, values, roadmap, careers |
| `faq.html` | Searchable, filterable FAQ |
| `contact.html` | Early-access / contact form (supports `?plan=` and `?topic=`) |
| `privacy.html`, `terms.html`, `disclosure.html` | Legal pages (privacy and terms are drafts for counsel review) |
| `404.html` | Not-found page (GitHub Pages and Netlify pick it up automatically) |

## Editing pages

Edit the source files, not the built pages in the root:

```
src/layout.html       shared <head>, icon sprite, nav, drawer, footer
src/pages/*.html      each page's content, with a <!--meta {...} --> header
build.mjs             inserts each page into the layout and writes it to the root
```

After editing, rebuild:

```bash
node build.mjs
```

The meta header sets the page `title`, `description`, which top-nav item is highlighted (`nav`), and whether the green call-to-action band appears above the footer (`cta`).

## Search engines (SEO)

`node build.mjs` also writes `sitemap.xml` and `robots.txt`, and gives every page a canonical link, a robots tag,
Open Graph and Twitter tags (with `assets/img/og-image.png` as the share image) and schema.org structured data
(Organization, WebSite, plus SoftwareApplication with naira offers on the home page and breadcrumbs elsewhere).

- **Site address:** `SITE` at the top of `build.mjs` (default `https://fortis-website-three.vercel.app`). If the site moves,
  for example to `https://fortis.dev`, change it there or build with `SITE_URL=https://fortis.dev node build.mjs`.
- **Google Search Console:** add the site as a URL-prefix property, choose the "HTML tag" method, put the code in
  `GOOGLE_SITE_VERIFICATION` in `build.mjs` (or the env var of that name), rebuild and deploy, then verify and submit
  `sitemap.xml`. A page that shouldn't be indexed gets `"noindex": true` in its meta header.

## Assets

```
assets/css/styles.css design tokens, layout, components, animations (inner pages at the end)
assets/js/main.js     reveals, mega menus, tabs, terminals, pricing toggle and calculator, FAQ search, scroll-spy, forms
assets/js/globe.js    hero Earth: WebGL shader with lighting, clouds, city lights and city links (falls back to a static image)
assets/img/           photos, avatars, favicon, earth/ globe textures
.well-known/security.txt  security contact for researchers
```

- **Colours, fonts and spacing:** the `:root` tokens at the top of `styles.css`.
- **Pricing:** the `.plan` cards in `src/pages/pricing.html` and `src/pages/index.html`. Annual figures live in `data-m` / `data-y`.
- **Forms:** `main.js` shows a success state but doesn't send data yet. Connect it to Formspree, a serverless function or your CRM where the code says `Placeholder`.
- **Email addresses:** `hello@`, `security@`, `press@` and `privacy@fortis.dev` are placeholders. Replace them with your real domain, including in `.well-known/security.txt`.

## Notes

- Globe textures are NASA Blue Marble and Black Marble imagery (public domain), via the three-globe package. `earth-aux.jpg` packs clouds (red), city lights (green) and the water mask (blue) into one file.

- Photos are AI-generated placeholders. Replace them with real team and customer photos before launch.
- The characters and company in the examples (Tunde, Amaka, PayWave) are illustrative.
- All motion respects `prefers-reduced-motion`.
