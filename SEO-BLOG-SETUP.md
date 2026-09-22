# SEO Blog CMS

This version adds a small Express-based blog CMS.

## Run locally
1. Install Node.js.
2. In this folder run `npm install`.
3. Set environment variables:
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `SITE_URL`
4. Run `npm start`.
5. Public blog: `/blog`
6. Private admin login: `/admin.html`

The admin page is deliberately not linked from the public navigation, but **do not treat an unlinked URL as security**. The server-side login is the security boundary.

## SEO
Each article gets:
- its own `/blog/<slug>` URL
- `<title>`
- meta description
- keywords
- canonical URL
- Open Graph title/description

For best SEO, write genuinely useful original content, use descriptive titles, and avoid keyword stuffing.

## Hosting
This CMS requires a Node.js-capable host. A purely static host cannot save articles to the server without a backend.


### Netlify note
The Netlify version uses Netlify Functions for the API and Netlify Blobs for persistent articles.
