# Aliff Coway V3 CMS — Netlify Deployment

This version adds a persistent CMS for website settings, products, product images, blog posts, blog cover images and SEO fields.

## 1. Deploy

Connect this folder/repository to Netlify.

Build settings are already in `netlify.toml`:

- Publish directory: `.`
- Functions directory: `netlify/functions`

## 2. Add environment variables

In Netlify → Project configuration → Environment variables, add:

- `ADMIN_USER` — your admin username
- `ADMIN_PASSWORD` — your admin password
- `SESSION_SECRET` — a long random secret
- `SITE_URL` — your production URL, e.g. `https://aliffcoway.com`

Do not put the real password or session secret in GitHub or the ZIP.

## 3. Open the CMS

After deployment:

`https://YOUR-DOMAIN/admin.html`

The CMS has three sections:

### Website
- Sales/name shown on the website
- WhatsApp number
- Email
- Tagline

### Products
- Add/edit/delete products
- Product name and code
- Category
- Product type
- Monthly price and old price
- Upload product picture

### Blog
- Add/edit/delete articles
- Slug
- Excerpt
- Cover image upload
- Article content
- SEO title
- SEO description
- Keywords
- Published/draft status

## 4. Persistent storage

Settings and products are stored in Netlify Blobs. Blog articles remain in the existing blog store. Uploaded images are stored in a separate Netlify Blobs store and served through the API.

## 5. Image uploads

The admin uploader accepts JPG, PNG and WebP. Very large images are resized in the browser before upload.

## 6. Local development

Install dependencies, then run:

`npm.cmd install`

Set your environment variables, then:

`npm.cmd start`

Open `http://localhost:8888` (or the local URL shown by Netlify CLI).
