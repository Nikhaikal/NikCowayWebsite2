const fs = require('node:fs');
const path = require('node:path');
const { defaultSettings, defaultProducts, resolveProduct } = require('../lib/catalogue');
const { page } = require('../netlify/functions/product-page');
const directory = path.join(__dirname, '../products');
fs.mkdirSync(directory, {recursive:true});
let count = 0;
for (const product of defaultProducts()) {
 for (const id of [product.id, ...(product.groups || []).map(group => group.id), ...(product.variants || []).map(variant => variant.id)]) {
  fs.writeFileSync(path.join(directory, id + '.html'), page(resolveProduct([product], id), defaultSettings()));
  count++;
 }
}
console.log(`Generated ${count} product and option HTML pages.`);
