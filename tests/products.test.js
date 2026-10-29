const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {page,tags} = require('../netlify/functions/product-page');
const routes = new Map(), stores = new Map();
const app = {use(){}};
for (const method of ['get','post','put','delete']) app[method] = (path,...handlers) => routes.set(`${method} ${path}`, handlers.at(-1));
const express = Object.assign(()=>app, {json:()=>()=>{}});
const getStore = options => {
  const name = typeof options === 'string' ? options : options.name;
  if (!stores.has(name)) stores.set(name,new Map());
  const data = stores.get(name);
  return {get:async key=>data.get(key),setJSON:async(key,value)=>data.set(key,value),list:async({prefix})=>({blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))})};
};
vm.runInNewContext(fs.readFileSync(require.resolve('../netlify/functions/api'),'utf8'),{require:name=>name==='express'?express:name==='@netlify/blobs'?{getStore,connectLambda(){}}:name==='serverless-http'?()=>()=>{}:name==='./product-page'?{page,tags}:name==='../../lib/applications'?require('../lib/applications'):name==='../../lib/catalogue'?require('../lib/catalogue'):name==='../../lib/testimonials'?require('../lib/testimonials'):require(name),process,Buffer,console,__dirname:require('node:path').resolve('netlify/functions'),module:{exports:{}}});
async function call(method,path,params={},body={}) {
  const res={statusCode:200,status(n){this.statusCode=n;return this;},type(){return this;},set(){return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};
  await routes.get(`${method} ${path}`)({params,body},res,error=>{throw error;});return res;
}
test('HTML renders product details safely and exposes accessible tabs',()=>{
 const html=page({id:'one',name:'<script>alert(1)</script>',price:'RM59',tags:['Hot & Cold'],description:'Line one\nLine two'}, {name:'Shop'});
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert'));
 assert.ok(html.includes('Hot &amp; Cold'));assert.ok(html.includes('Line one\nLine two'));assert.ok(html.includes('role="tabpanel"'));
});
test('product route renders existing products and returns a genuine 404',async()=>{
 assert.equal((await call('get','/products/:id.html',{id:'neon'})).statusCode,200);
 assert.equal((await call('get','/products/:id.html',{id:'missing'})).statusCode,404);
});
test('reviews persist independently, remain product-specific and never expose phone numbers',async()=>{
 const submit=body=>call('post','/products/:id/reviews',{id:'neon'},body);
 const results=await Promise.all([submit({name:'A',phone:'0123456789',message:'Great',rating:5}),submit({name:'B',phone:'0198765432',message:'Good',rating:4})]);
 assert.ok(results.every(r=>r.statusCode===201));
 const response=await call('get','/products/:id/reviews',{id:'neon'});
 assert.equal(response.body.length,2);assert.equal(response.body.map(r=>r.rating).sort().join(), "4,5");assert.ok(response.body.every(r=>!('phone' in r)));
 assert.equal((await call('get','/products/:id/reviews',{id:'neo-plus'})).body.length,0);
 assert.equal((await submit({name:' ',phone:'123',message:'Hello'})).statusCode,400);
 assert.equal((await call('post','/products/:id/reviews',{id:'missing'},{name:'A',phone:'0123456789',message:'Hi'})).statusCode,404);
});
test('admin-created products retain tags and long description and get a page automatically',async()=>{
 const result=await call('post','/admin/products',{}, {name:'New product',price:'RM20',tags:'Compact, Popular',description:'Full specifications'});
 assert.equal(result.statusCode,201);assert.equal(result.body.tags.join(','),'Compact,Popular');
 const html=await call('get','/products/:id.html',{id:result.body.id});
 assert.ok(html.body.includes('Full specifications'));assert.ok(html.body.includes('RM20'));
});

test('rejects missing, fractional and out-of-range ratings', async()=>{
 for (const rating of [undefined,0,6,2.5,'5']) {
  const response = await call('post','/products/:id/reviews',{id:'neon'},{name:'A',phone:'0123456789',message:'Good',rating});
  assert.equal(response.statusCode,400);
 }
});
test('old reviews remain unrated and private',async()=>{
 const store=stores.get('coway-product-reviews');
 store.set('neon/legacy',{id:'legacy',name:'Legacy',message:'Old review',date:'2020-01-01',phone:'0123456789'});
 const response=await call('get','/products/:id/reviews',{id:'neon'});
 const legacy=response.body.find(review=>review.id==='legacy');
 assert.equal(legacy.rating,null);assert.ok(!('phone' in legacy));
});
test('each catalogue product has its own HTML with a required star selector',()=>{
 const {defaultProducts}=require('../lib/catalogue');
 for(const product of defaultProducts()) {
  const html=fs.readFileSync(require('node:path').join(__dirname,'../products',product.id+'.html'),'utf8');
  assert.ok(html.includes(`data-product-id="${product.id}"`));
  assert.equal((html.match(/type="radio" name="rating"/g)||[]).length,5);
 }
});

test('requested colours and model combinations have separate working pages',async()=>{
 const {defaultProducts}=require('../lib/catalogue');
 const products=defaultProducts();
 const find=id=>products.find(product=>product.id===id);
 const colours=['Pebble Grey','Peach Pink','Ciel Blue','Mint Green','Porcelain White'];
 assert.deepEqual(find('neon').variants.map(v=>v.label),colours);
 assert.deepEqual(find('dazzie').variants.map(v=>v.label),colours);
 assert.deepEqual(find('villaem-iii').variants.map(v=>v.label),['Pebble Grey','Porcelain White']);
 assert.deepEqual(find('studio').variants.map(v=>v.label),['Sand Beige','Porcelain White']);
 assert.deepEqual(find('washer-dryer').variants.map(v=>v.capacity),['12/9 kg','10/6 kg']);
 const ac=find('air-conditioner').variants;
 assert.equal(ac.length,6);
 assert.deepEqual(ac.filter(v=>v.series==='F-Series').map(v=>v.capacity),['1.0 HP','1.5 HP']);
 assert.ok(ac.filter(v=>v.series==='F-Series').every(v=>!v.colour));
 assert.equal(ac.filter(v=>v.series==='P-Series' && v.colour==='Black').length,2);
 for(const product of products) for(const variant of product.variants){
  const result=await call('get','/products/:id.html',{id:variant.id});
  assert.equal(result.statusCode,200);
  assert.ok(result.body.includes(`data-product-id="${product.id}"`));
  assert.ok(result.body.includes('aria-current="page"'));
  assert.ok(fs.existsSync(require('node:path').join(__dirname,'../products',variant.id+'.html')));
  const href=result.body.match(/href="(https:\/\/wa.me\/[^\"]+)"/)[1];
  assert.ok(new URL(href.replace(/&amp;/g,'&')).searchParams.get('text').includes(variant.label));
 }
});
test('saved catalogue retains configured variants and custom product entries',()=>{
 const {mergeProducts,resolveProduct}=require('../lib/catalogue');
 const products=mergeProducts([{id:'neon',name:'NEON',price:'RM60'},{id:'custom',name:'Custom'}]);
 assert.equal(products.find(p=>p.id==='neon').variants.length,5);
 assert.equal(resolveProduct(products,'neon-mint-green').price,'RM60');
 assert.equal(resolveProduct(products,'custom').name,'Custom');
 assert.equal(resolveProduct(products,'air-conditioner-p-series').variants.length,4);
 assert.equal(resolveProduct(products,'neon-invalid'),null);
});
test('photos belong only to their matching option and main photo comes first',()=>{
 const path=require('node:path');const {defaultProducts,resolveProduct}=require('../lib/catalogue');
 const directory=path.join(__dirname,'../assets/products/dazzie/mint-green');
 const files=['main.webp','angle-test.jpg'];
 const backups=new Map(files.map(file=>[file,fs.existsSync(path.join(directory,file))?fs.readFileSync(path.join(directory,file)):null]));
 const before=defaultProducts();
 const originalCount=resolveProduct(before,'dazzie-mint-green').selected.images.length;
 const pinkCount=resolveProduct(before,'dazzie-peach-pink').selected.images.length;
 try{
  for(const file of files)fs.writeFileSync(path.join(directory,file),'fixture');
  const products=defaultProducts();
  const mint=resolveProduct(products,'dazzie-mint-green');
  const pink=resolveProduct(products,'dazzie-peach-pink');
  assert.ok(mint.image.endsWith('/mint-green/main.webp'));
  assert.equal(mint.selected.images.length,originalCount+files.filter(file=>backups.get(file)===null).length);
  assert.equal(pink.selected.images.length,pinkCount);
  const html=page(mint,{name:'Shop'});
  assert.ok(html.includes('/mint-green/angle-test.jpg'));
  assert.ok(!html.includes('/peach-pink/main.webp'));
 }finally{for(const file of files){const backup=backups.get(file);if(backup)fs.writeFileSync(path.join(directory,file),backup);else fs.unlinkSync(path.join(directory,file));}}
});

test('NEON supplied photos map to five colours with eight views each',()=>{
 const {defaultProducts,resolveProduct}=require('../lib/catalogue');
 const products=defaultProducts();const neon=products.find(product=>product.id==='neon');
 assert.ok(neon.image.endsWith('/neon/pebble-grey/main.webp'));
 for(const variant of neon.variants){
  assert.equal(variant.images.length,8);
  assert.ok(variant.images[0].endsWith('/main.webp'));
  for(const image of variant.images){
   assert.ok(image.includes('/neon/'+variant.key+'/'));
   assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',image)));
  }
  const html=page(resolveProduct(products,variant.id),{name:'Shop'});
  assert.equal((html.match(/class="gallery-image"/g)||[]).length,1);
  assert.equal((html.match(/class="gallery-thumbnail"/g)||[]).length,8);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 }
});

test('NEO PLUS shows exactly five selected photos with one main view',()=>{
 const {defaultProducts}=require('../lib/catalogue');
 const product=defaultProducts().find(p=>p.id==='neo-plus');
 assert.equal(product.images.length,5);
 assert.ok(product.images[0].endsWith('/main.webp'));
 const html=page(product,{name:'Shop'});
 assert.equal((html.match(/class="gallery-image"/g)||[]).length,1);
 assert.equal((html.match(/class="gallery-thumbnail"/g)||[]).length,5);
 for(const image of product.images)assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',image)));
});

test('air purifier galleries use all unique supplied views and keep STUDIO colours separate',()=>{
 const {defaultProducts,resolveProduct}=require('../lib/catalogue');
 const products=defaultProducts();
 for(const [id,count] of [['lombok-iii',3],['noble-ii',9],['storm-ii',8],['studio-sand-beige',7],['studio-porcelain-white',7]]){
  const product=resolveProduct(products,id);
  const images=product.selected?.images || product.images;
  assert.equal(images.length,count);
  assert.ok(product.image.endsWith('/main.webp'));
  for(const image of images)assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',image)));
  const html=page(product,{name:'Shop'});
  assert.equal((html.match(/class="gallery-thumbnail"/g)||[]).length,count);
 }
});

test('supplied gallery main images override old saved CMS image paths',()=>{
 const {mergeProducts}=require('../lib/catalogue');
 const saved=['lombok-iii','noble-ii','storm-ii'].map(id=>({id,image:'/api/media/old-image'}));
 const products=mergeProducts(saved);
 for(const item of saved){
  const product=products.find(product=>product.id===item.id);
  assert.equal(product.image,`/assets/products/${item.id}/gallery/main.webp`);
  assert.ok(product.images.length>1);
 }
});

test('P-Series photos stay with their correct capacity and colour',()=>{
 const {defaultProducts,resolveProduct}=require('../lib/catalogue');
 const products=defaultProducts();
 for(const size of ['15','20'])for(const colour of ['white','black']){
  const key=`p-series-${size}hp-${colour}`;
  const product=resolveProduct(products,'air-conditioner-'+key);
  assert.equal(product.selected.images.length,3);
  assert.equal(product.image,`/assets/products/air-conditioner/${key}/main.webp`);
  for(const image of product.selected.images)assert.ok(image.includes('/'+key+'/'));
  const html=page(product,{name:'Shop'});
  assert.equal((html.match(/class="gallery-thumbnail"/g)||[]).length,3);
 }
});
