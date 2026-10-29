# Google Form → Google Sheet → testimonials

The website connection is ready, but a Google Form and Sheet must be created in your Google account. No Google account connection or source sheet is configured yet.

## 1. Create the form

Create a Google Form called **Nik Haikal Coway — Testimoni Pelanggan** with these exact question titles:

| Question | Type | Required |
| --- | --- | --- |
| Name | Short answer | Yes |
| State | Short answer or dropdown | Yes |
| Product | Short answer or dropdown | Yes |
| Caption | Paragraph | Yes |
| Photo | File upload, images only, one file | Yes |

Explain that the name, state, product, caption and photo are intended for public display on the website, and ask for consent. File-upload questions require Google sign-in. Do not collect phone numbers or other private data for this public feed.

In **Responses**, link the form to a new Google Sheet. New responses will automatically create rows.

## 2. Review and prepare public photos

Add an **Approved** column in the response sheet (do not add it as a form question). Enter **Yes** only for testimonials you want to publish.

Google Forms stores uploaded photos in Drive. Before approving a row, make that specific photo viewable by **Anyone with the link**, as allowed by the customer's consent. The website converts its Drive link into a display URL. Test it signed out. If Drive will not serve an image publicly, copy it into `assets/testimonials/`, deploy the file, and replace the Photo cell with `/assets/testimonials/filename.jpg` or a direct HTTPS image URL.

## 3. Publish only an approved public tab

Create a second tab called **Public Testimonials** with these headers in row 1:

`Name | State | Product | Caption | Photo | Approved`

If the response tab is named `Form Responses 1` and has Timestamp in A, Name in B, State in C, Product in D, Caption in E, Photo in F and Approved in G, put this in A2:

```
=IFERROR(FILTER('Form Responses 1'!B2:G,'Form Responses 1'!G2:G="Yes"),"")
```

Adjust the ranges if your form adds email or consent columns. The public tab must contain only the six intended public columns. Publish **Public Testimonials**, not the entire response workbook: **File → Share → Publish to web**, select this tab and **Comma-separated values (.csv)**. Keep automatic republication enabled. Copy the published URL ending in `output=csv`.

## 4. Connect the website

Open `/admin.html` → **Website**, paste that URL into **Testimonials — published Google Sheets CSV URL**, and save. A normal private Sheets edit link will not work.

The site reads the feed on page load. New submissions populate the response sheet automatically; marking Approved as Yes includes them in the public tab automatically. Google may take a few minutes to republish changes; the website feed also caches for up to 60 seconds. Refresh the website to see updates. No website redeploy is needed for sheet content changes.

Cards use `Name (State) (Product)` as the title. Photos have no links or lightbox, cannot be dragged through the normal UI, and display the supplied HYPEHAUS logo as an overlay. The overlay does not modify the original image or prevent screenshots/downloads through browser tools.

Leave the source URL blank to keep the section empty. To hide a testimonial, clear its Approved cell and wait for the published feed to refresh.

Google guidance:
- https://support.google.com/docs/answer/139706
- https://support.google.com/docs/answer/183965
- https://support.google.com/docs/answer/2839588

## Existing Hypehaus form inspected on 27 September 2026

Response sheet: https://docs.google.com/spreadsheets/d/12Ex476HBGtPGCTzfsypyORQtRRFpFOyl1Qnix_rE_P0/edit

The existing `Form Responses 1` tab has Timestamp (A), Email Address (B), nama hp. (C), hp code (D), nama cust (E), lokasi pemasangan (F), and gambar hp dengan product dan customer (G). The website supports these Malay customer, location and photo headings as aliases. No cloud files have been modified or published.

Add form questions for **Produk** (short answer/dropdown) and **Caption** (paragraph). If an exact state is desired instead of the existing installation location, add **Negeri** as well. Then add an admin-only **Approved** column in the response sheet. Existing rows need their actual product and caption filled in manually; do not infer a product from HP code.

Create the public tab with only Name, State, Product, Caption, Photo and Approved. Map E to Name, F to State (or use the new Negeri column), G to Photo, and the new product/caption/approval columns accordingly. The earlier sample formula assumes a different layout and must not be pasted unchanged into this existing workbook. Do not publish the original response tab, which contains private internal fields.
