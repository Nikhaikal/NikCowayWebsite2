# Product assets

Place product images in this folder, optionally grouped by product:

    assets/products/neon/main.webp
    assets/products/neo-plus/main.jpg

In Admin → Products, enter the corresponding site path in **Product image path**:

    /assets/products/neon/main.webp

Save the product. The homepage and product page both use this image.
Use lowercase filenames with hyphens and include the extension. Commit and deploy
these files along with the site. Local files are served immediately by Netlify Dev.

The optional admin upload still uses Netlify Blobs. A deployed serverless function
cannot permanently write files into this repository's assets folder. To keep all
product images here, copy them into this folder and use their /assets/ paths.
Existing uploaded images are not moved automatically.

## Colour and model photos

Each option has a folder under its parent product, for example:

- neon/pebble-grey/main.webp
- dazzie/peach-pink/main.webp
- villaem-iii/porcelain-white/main.webp
- studio/sand-beige/main.webp
- air-conditioner/f-series-10hp/main.webp
- air-conditioner/f-series-15hp/main.webp
- air-conditioner/p-series-15hp-white/main.webp
- air-conditioner/p-series-20hp-black/main.webp
- washer-dryer/12-9kg/main.webp
- washer-dryer/10-6kg/main.webp

Use the folders already created for the full list. JPG, JPEG, PNG and WebP are supported. Name the main photo main with its actual extension. Add extra views in the same folder; they appear after the main photo in filename order. Images are never shared across colours automatically. NEON has eight supplied product views for each of its five colours. These are 1600 px WebP copies; original source files are unchanged. Photos for the other products are still pending.

Run npm run build after adding photos. Generated HTML pages and Netlify's dynamic product pages use the same catalogue and template. Netlify keeps the dynamic product route so saved admin settings and reviews stay available. Reviews are grouped by parent product, not split across colour pages. F-Series has 1.0 and 1.5 HP; P-Series has 1.5 and 2.0 HP in White and Black. VILLAEM III is the interpretation of “Villain”. Colour dots are approximate visual labels, not verified product finishes.
