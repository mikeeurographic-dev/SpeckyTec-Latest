# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SpeckyTec (speckytec.com) — a static marketing/newsletter site with a paywalled report library, deployed on Netlify. There is no build step, no package manager, and no test suite: every page is a hand-written, self-contained `.html` file deployed as-is.

## Commands

There is no build/lint/test tooling in this repo. To preview changes locally, just open the HTML files directly in a browser or serve the directory statically, e.g.:

```
python3 -m http.server 8000
```

Deployment is via Netlify, configured in `netlify.toml` (build settings, security headers, HTTP→HTTPS redirect). The only server-side logic is the Netlify Function at `netlify/functions/verify-subscriber.js`.

## Architecture

**No templating, no shared includes.** Each top-level page (`index.html`, `blog.html`, `library.html`, `reports.html`, `privacy.html`, `terms.html`, `newsletter.html`, `thankyou.html`) is an independent, fully self-contained HTML file. Nav bar, footer, and CSS custom properties (`--navy`, `--gold`, `--teal`, etc.) are duplicated inline in most pages rather than shared. Only `index.html`, `newsletter.html`, and `terms.html` link the shared `style.css`; the rest (`blog.html`, `library.html`, `reports.html`, `privacy.html`, `thankyou.html`) carry their own `<style>` block with a near-duplicate copy of the same design tokens. **When changing shared visual elements (nav, footer, color palette, buttons), the edit generally has to be repeated across every page individually** — check both `style.css` and each page's inline `<style>` block.

Some pages embed images as base64 data URIs directly in the HTML (`blog.html`, `reports.html`), which is why those files are large (500KB–1MB+). Others reference image files on disk (`images/image_1.png`, `images/image_2.png`, `images/image_3.png` for logo/hero art; top-level `*_landscape*.png` / `Car_Image_2.png` files for report-category thumbnails on `index.html`).

Internal links are inconsistent between pages: `index.html` links other pages with `.html` extensions (`reports.html`, `blog.html`), while `reports.html` links with extensionless root paths (`/reports`, `/blog`, `/library`). This relies on Netlify's default clean-URL handling — be aware of which convention a given page already uses before adding new links to it.

### Report library / paywall (`library.html`)

- Reports are hardcoded as a JS array (`REPORTS`) inside `library.html`, each with `issue`, `title`, `description`, `category`, `tag`/`tagClass`, `emoji`, `date`, `free`, and a `file` URL (Google Drive direct-download links). Adding a report means adding an entry to this array and re-rendering (`renderReports`) — there is no CMS or data file.
- **`library.html`'s `REPORTS` array is the single source of truth for which reports are free vs. members-only** (the `free: true/false` field on each entry). Other pages (`blog.html`, `index.html`, etc.) that display report cards or free/paid labels must match this array — check it before adding, styling, or "correcting" any free/locked report card elsewhere, and flag any conflict rather than trusting a description of the free list from memory or from another page.
- Access is gated client-side by a SHA-256 password check (`hashPassword` + `CORRECT_HASH`) against a salted hash of a single shared subscriber password, with the unlocked state kept in `sessionStorage` (`st_verified`). This is a soft gate for convenience, not real per-user auth — the actual report files are just publicly reachable Drive links.
- `netlify/functions/verify-subscriber.js` is a separate, currently-unused-by-the-frontend Stripe-based verification path (looks up a customer by email via Stripe's API and checks for an active subscription). It expects `STRIPE_RESTRICTED_KEY` and `LIBRARY_SECRET` env vars in Netlify. If wiring up real per-subscriber auth, this function — not the password hash in `library.html` — is the intended integration point.

### Lead capture (`script.js`, HubSpot)

`script.js` defines `submitHubSpot()`, used by the newsletter/contact forms on `index.html` and `newsletter.html`. It posts directly to HubSpot's Forms API (`api.hsforms.com`) client-side with a hardcoded portal ID and form ID — no backend involved. Validates name/email/consent checkboxes before submitting, then swaps `#hs-custom-form` for `#hs-success` on success.

### Savings calculator (`index.html`)

`index.html` has an inline salary/savings calculator (`stCalc()`, ids prefixed `st-*`: `st-cur`, `st-sal`, `st-results`, `st-grid`, `st-total`, `st-punchline`, `st-spotlight-banner`) that computes reader savings by currency and renders a results grid plus a "product spotlight" callout. This logic lives inline in `index.html`'s `<script>` block, not in `script.js`.

## Brand & Content Rules

- SpeckyTec must never be described as a one-person operation. Always present it as a fully formed consumer intelligence brand.
- Never mention Portugal anywhere in site content, in any form.
- Brand positioning: "Buy Smarter, No Hype" — no affiliate links, no sponsorships.
- All pricing must be tri-currency: USD, GBP, EUR.
- Costs are converted to "Hours Worked" using a fixed US median wage constant of $60,575/year ($29.03/hour pre-tax).
- Brand colors: navy `#17294B`, teal `#0e6b5e`, gold `#eaa845`.
- Six permanently free reports: 001 Smartphones, 002 Laptops, 003 Air Fryer, 004 Robot Vacuums, 007 Washing Machines, 050 TV Habits. All other reports are paid members-only. This list must match `library.html`'s `REPORTS` array (see below) — treat that array as authoritative if the two ever disagree.
- Last-page CTA on every report always reads: "More reports at www.speckytec.com — smart buying decisions start here."
- Primary audience is Americans from YouTube; UK and Europe are secondary.
- `~/Desktop/speckytec-pull.sh` and `~/Desktop/speckytec-update.sh` are built for Michael's Claude.ai (web/desktop) workflow, where pages are generated in chat, downloaded to `~/Downloads`, then `speckytec-update.sh` copies matching files (`index*.html`, `library*.html`, `blog*.html`, `reports*.html`, `privacy*.html`, etc.) out of Downloads into the repo before committing and pushing. It handles only `index.html`, `library.html`, `blog.html`, `reports.html`, `privacy.html` — any new page filename must be added to the script explicitly, so flag this to Michael if a new page is created.
- **In a Claude Code CLI session (this repo, edited directly on disk), do not run `speckytec-update.sh`.** There's nothing in `~/Downloads` for it to pick up, so it just hangs at its "download your files then type DONE" prompt without ever pushing — confirmed 2026-07-10 when it stalled and had to be killed. Deploy CLI edits directly instead: `git add <files>`, `git commit -m "..."`, `git push`.
- `speckytec-pull.sh` overwrites `index.html`, `library.html`, `blog.html`, `reports.html`, `privacy.html` in the repo with whatever is currently live on GitHub's `main` branch, discarding local differences. Only run it at the very start of a session before making any edits. **Never run it after edits are already made but not yet pushed** — it will silently clobber that work with the stale live version instead of the version you just wrote.

## Content conventions

- Design system: dark navy/teal gradient background, gold (`--gold`/`#eaa845`) accent, Nunito font, pill-shaped buttons/inputs (`border-radius:50px`) — keep new sections consistent with this rather than introducing new colors/fonts.
- Report/blog cards follow a consistent shape: emoji thumbnail, category tag, issue number, title, description, date, download/read CTA. Match this structure (`report-card`/`card-*` classes) when adding new report or blog entries.
- `netlify.toml` sets `X-Robots-Tag: noindex, nofollow` specifically on `/library.html` — it's intentionally kept out of search indexes since it's subscriber-only content.
