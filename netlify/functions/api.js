const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getStore, connectLambda } = require("@netlify/blobs");
const serverless = require("serverless-http");

const { page: productPage, tags: productTags } = require("./product-page");
const { sheetUrl, testimonials } = require("../../lib/testimonials");
const { defaultSettings, defaultProducts, mergeProducts, resolveProduct } = require("../../lib/catalogue");
const { application, saveApplication } = require("../../lib/applications");
const app = express();
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  const prefixes = [
    "/.netlify/functions/api",
    "/api"
  ];

  for (const prefix of prefixes) {
    if (req.url === prefix) {
      req.url = "/";
      break;
    }

    if (req.url.startsWith(prefix + "/")) {
      req.url = req.url.slice(prefix.length) || "/";
      break;
    }
  }

  next();
});

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHANGE-ME-NOW";
const SESSION_SECRET = process.env.SESSION_SECRET || "CHANGE-ME-SESSION-SECRET";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "") || "http://localhost:8888";
// Keep legacy cookie and storage identifiers so existing sessions, products and images remain accessible.
const COOKIE = "NikHaikal_admin";
const STORE = "NikHaikal-coway-blog";
const KEY = "articles.json";
const CMS_STORE = "NikHaikal-coway-cms";
const SETTINGS_KEY = "settings.json";
const PRODUCTS_KEY = "products.json";
const MEDIA_STORE = "NikHaikal-coway-media";

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 1000*60*60*8 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function verifyToken(token) {
  try {
    const [payload, sig] = String(token || "").split(".");
    if (!payload || !sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(payload)))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data.user;
  } catch { return null; }
}
function cookie(req) {
  const raw = req.headers.cookie || "";
  const found = raw.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="));
  return found ? decodeURIComponent(found.slice(COOKIE.length + 1)) : "";
}
async function getCmsJson(key, fallback) {
  try {
    const store = getStore(CMS_STORE);
    const data = await store.get(key, { type: "json" });
    if (key === SETTINGS_KEY && data && typeof data.name === 'string') {
      data.name = data.name.replace(/Nik Haikal\s+coway/gi, 'Nik Haikal coway');
    }
    // Upgrade previously saved contact settings without changing customer phone numbers.
    if (key === SETTINGS_KEY && data && data.contactPhoneVersion !== 1) {
      data.whatsapp = '60199881304';
      data.contactPhoneVersion = 1;
    }
    if (key === SETTINGS_KEY && data && data.testimonialsFeedVersion !== 1 && !data.testimonialsSheetUrl) {
      data.testimonialsSheetUrl = defaultSettings().testimonialsSheetUrl;
      data.testimonialsFeedVersion = 1;
    }
    return data == null ? fallback : data;
  } catch { return fallback; }
}
async function setCmsJson(key, value) {
  await getStore(CMS_STORE).setJSON(key, value);
}
async function saveMedia(contentType, data) {
  const id = crypto.randomUUID();

  const buffer = Buffer.from(data, "base64");

  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  await getStore(MEDIA_STORE).set(id, arrayBuffer, {
    metadata: {
      contentType
    }
  });

  return `/api/media/${id}`;
}

function auth(req,res,next) {
  const user = verifyToken(cookie(req));
  if (user) { req.adminUser = user; return next(); }
  res.status(401).json({error:"Unauthorised"});
}
function slugify(s) {
  return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"");
}
function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function readArticles() {
  try {
    const store = getStore(STORE);
    const data = await store.get(KEY, { type: "json" });
    if (Array.isArray(data)) return data;
  } catch {}
  // First deploy fallback: use bundled seed data if present.
  try {
    const file = path.join(__dirname, "../../data/articles.json");
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { return []; }
}
async function writeArticles(items) {
  const store = getStore(STORE);
  await store.setJSON(KEY, items);
}

app.get("/auth", (req,res) => {
  const user = verifyToken(cookie(req));
  res.json({loggedIn:!!user, user:user || null});
});
app.post("/login", (req,res) => {
  const {username,password}=req.body||{};
  if (username===ADMIN_USER && password===ADMIN_PASSWORD) {
    const token=makeToken(username);
    const secure = process.env.NODE_ENV === "production" || String(req.headers["x-forwarded-proto"] || "").includes("https");
    res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax; Max-Age=28800`);
    return res.json({ok:true});
  }
  res.status(401).json({error:"Invalid login"});
});
app.post("/logout", auth, (req,res) => {
  const secure = process.env.NODE_ENV === "production" || String(req.headers["x-forwarded-proto"] || "").includes("https");
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax; Max-Age=0`);
  res.json({ok:true});
});

app.post('/applications', async (req,res)=>{
 let data;
 try { data=application(req.body); } catch(error) { return res.status(400).json({error:error.message}); }
 const result=await saveApplication(data);
 return res.status(result.status).json(result.ok ? {ok:true} : {error:result.error});
});

app.get("/settings", async (req,res)=>{
  res.json(await getCmsJson(SETTINGS_KEY, defaultSettings()));
});
app.get('/testimonials', async (req,res) => {
  try {
    const settings=await getCmsJson(SETTINGS_KEY, defaultSettings());
    const source=sheetUrl(settings.testimonialsSheetUrl || '');
    if(!source)return res.json([]);
    const response=await fetch(source,{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Sheet unavailable');
    const csv=await response.text();
    if(csv.length>2000000)throw new Error('Sheet too large');
    res.set('Cache-Control','public, max-age=60').json(testimonials(csv));
  } catch(error) { console.error('Testimonials:',error.message);res.status(502).json({error:'Unable to load testimonials'}); }
});
app.get("/products", async (req,res)=>{
  res.json(mergeProducts(await getCmsJson(PRODUCTS_KEY, defaultProducts())));
});
// Each product gets a server-rendered HTML page, including products added in admin.
app.get("/products/:id.html", async (req,res,next) => {
  try {
    const products = mergeProducts(await getCmsJson(PRODUCTS_KEY, defaultProducts()));
    const product = resolveProduct(mergeProducts(products), req.params.id);
    if (!product) return res.status(404).send('<h1>Produk tidak ditemui</h1><a href="/#products">Semua Produk</a>');
    res.type('html').send(productPage(product, await getCmsJson(SETTINGS_KEY, defaultSettings())));
  } catch (error) { next(error); }
});
app.get("/products/:id/reviews", async (req,res,next) => {
  try {
    const products = mergeProducts(await getCmsJson(PRODUCTS_KEY, defaultProducts()));
    if (!products.some(p => p.id === req.params.id)) return res.status(404).json({error:'Product not found'});
    const store = getStore({name:'coway-product-reviews', consistency:process.env.NETLIFY_DEV === 'true' ? 'eventual' : 'strong'});
    const { blobs } = await store.list({prefix: encodeURIComponent(req.params.id) + '/'});
    const reviews = await Promise.all(blobs.map(blob => store.get(blob.key, {type:'json'})));
    res.set('Cache-Control', 'no-store').json(reviews.filter(Boolean).map(({id,name,message,date,rating}) => ({id,name,message,date,rating:Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null})).sort((a,b)=>b.date.localeCompare(a.date)));
  } catch (error) { next(error); }
});
app.post("/products/:id/reviews", async (req,res,next) => {
  try {
    const products = mergeProducts(await getCmsJson(PRODUCTS_KEY, defaultProducts()));
    if (!products.some(p => p.id === req.params.id)) return res.status(404).json({error:'Product not found'});
    const {name,phone,message,rating} = req.body || {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({error:"Sila pilih penilaian 1 hingga 5 bintang."});
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof message !== 'string' || !message.trim() || message.length > 3000 || typeof phone !== 'string' || phone.length > 25 || !/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g,'').length < 8 || phone.replace(/\D/g,'').length > 15) return res.status(400).json({error:'Sila isi nama, nombor telefon yang sah dan ulasan (maksimum 3000 aksara).'});
    const review = {id:crypto.randomUUID(), rating, name:name.trim(), phone:phone.trim(), message:message.trim(), date:new Date().toISOString()};
    await getStore({name:'coway-product-reviews', consistency:process.env.NETLIFY_DEV === 'true' ? 'eventual' : 'strong'}).setJSON(encodeURIComponent(req.params.id) + '/' + review.id, review);
    res.status(201).json({ok:true});
  } catch (error) { next(error); }
});
app.get("/media/:id", async (req, res) => {
  try {
    const store = getStore(MEDIA_STORE);

    const result = await store.getWithMetadata(req.params.id, {
      type: "arrayBuffer",
    });

    if (!result || !result.data) {
      console.error("MEDIA NOT FOUND:", req.params.id);
      return res.status(404).send("Image not found");
    }

    const contentType =
      result.metadata?.contentType || "image/jpeg";

    console.log("MEDIA SERVED:", {
      id: req.params.id,
      contentType,
      size: result.data.byteLength
    });

    res.status(200).set({
  "Content-Type": contentType,
  "Cache-Control": "public, max-age=31536000, immutable"
});

return res.end(Buffer.from(result.data));

  } catch (error) {
    console.error("MEDIA ERROR:", error);
    res.status(500).send("Failed to load image");
  }
});
app.get("/admin/settings", auth, async (req,res)=>res.json(await getCmsJson(SETTINGS_KEY, defaultSettings())));
app.put("/admin/settings", auth, async (req,res)=>{
  const current=await getCmsJson(SETTINGS_KEY, defaultSettings());
  const body=req.body||{};
  let testimonialsSheetUrl;
  try { testimonialsSheetUrl=sheetUrl(body.testimonialsSheetUrl ?? current.testimonialsSheetUrl ?? ''); }
  catch(error) { return res.status(400).json({error:error.message}); }
  const settings={...current,testimonialsSheetUrl,testimonialsFeedVersion:1,name:String(body.name||current.name).slice(0,100),contactPhoneVersion:1,whatsapp:String(body.whatsapp||"60199881304").replace(/\D/g,"").slice(0,20),email:String(body.email||"").slice(0,200),tagline:String(body.tagline||current.tagline).slice(0,200)};
  await setCmsJson(SETTINGS_KEY,settings); res.json(settings);
});
app.post("/admin/media", auth, async (req,res)=>{
  const {data,contentType}=req.body||{};
  if(!data || !contentType || !/^image\/(jpeg|png|webp|gif)$/.test(contentType)) return res.status(400).json({error:"Valid image required"});
  const raw=String(data).replace(/^data:[^;]+;base64,/i,"");
  if(raw.length>2500000) return res.status(413).json({error:"Image is too large. Use a smaller image."});
  const url=await saveMedia(contentType,raw); res.status(201).json({url});
});
app.get("/admin/products", auth, async (req,res)=>res.json(await getCmsJson(PRODUCTS_KEY, defaultProducts())));
app.post("/admin/products", auth, async (req,res)=>{
  const body=req.body||{}; if(!body.name) return res.status(400).json({error:"Product name is required"});
  const items=await getCmsJson(PRODUCTS_KEY, defaultProducts());
  const p={id:crypto.randomUUID(),name:String(body.name),code:String(body.code||""),cat:String(body.cat||"home"),type:String(body.type||"Product"),price:String(body.price||""),old:String(body.old||""),image:String(body.image||""),tags:productTags(body.tags),description:String(body.description||"").slice(0,30000)};
  items.push(p); await setCmsJson(PRODUCTS_KEY,items); res.status(201).json(p);
});
app.put("/admin/products/:id", auth, async (req,res)=>{
  const items=await getCmsJson(PRODUCTS_KEY, defaultProducts()); const i=items.findIndex(x=>x.id===req.params.id); if(i<0)return res.status(404).json({error:"Not found"});
  items[i]={...items[i],...(req.body||{}),id:items[i].id,tags:productTags(req.body.tags ?? items[i].tags),description:String(req.body.description ?? items[i].description ?? "").slice(0,30000)}; await setCmsJson(PRODUCTS_KEY,items); res.json(items[i]);
});
app.delete("/admin/products/:id", auth, async (req,res)=>{const items=await getCmsJson(PRODUCTS_KEY,defaultProducts()).then(x=>x.filter(p=>p.id!==req.params.id));await setCmsJson(PRODUCTS_KEY,items);res.json({ok:true});});

app.get("/articles", async (req,res)=>{
  const items=(await readArticles()).filter(a=>a.published).sort((a,b)=>new Date(b.date)-new Date(a.date));
  res.json(items);
});
app.get("/articles/:slug", async (req,res)=>{
  const item=(await readArticles()).find(a=>a.slug===req.params.slug && a.published);
  if(!item) return res.status(404).json({error:"Not found"});
  res.json(item);
});
app.get("/admin/articles", auth, async (req,res)=>{
  res.json((await readArticles()).sort((a,b)=>new Date(b.date)-new Date(a.date)));
});
app.post("/admin/articles", auth, async (req,res)=>{
  const {title,excerpt,content,seoTitle,seoDescription,keywords,published=true,coverImage=""}=req.body||{};
  if(!title || !content) return res.status(400).json({error:"Title and content are required"});
  const items=await readArticles();
  let slug=slugify(req.body.slug||title)||crypto.randomUUID();
  const base=slug; let n=2;
  while(items.some(a=>a.slug===slug)) slug=`${base}-${n++}`;
  const article={id:crypto.randomUUID(),slug,title,excerpt:excerpt||"",content,seoTitle:seoTitle||title,
    seoDescription:seoDescription||excerpt||title,keywords:keywords||"",coverImage:coverImage||"",
    published:!!published,date:new Date().toISOString()};
  items.push(article); await writeArticles(items); res.status(201).json(article);
});
app.put("/admin/articles/:id", auth, async (req,res)=>{
  const items=await readArticles(); const i=items.findIndex(a=>a.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const old=items[i], body=req.body||{};
  const slug=slugify(body.slug||old.slug)||old.slug;
  if(items.some((a,j)=>j!==i && a.slug===slug)) return res.status(400).json({error:"Slug already exists"});
  items[i]={...old,...body,slug,published:!!body.published,updated:new Date().toISOString()};
  await writeArticles(items); res.json(items[i]);
});
app.delete("/admin/articles/:id", auth, async (req,res)=>{
  const items=(await readArticles()).filter(a=>a.id!==req.params.id);
  await writeArticles(items); res.json({ok:true});
});

app.get("/blog/:slug", async (req,res)=>{
  const a=(await readArticles()).find(x=>x.slug===req.params.slug && x.published);
  if(!a) return res.status(404).send("<!doctype html><html><body><h1>404 - Article not found</h1><a href=\"/blog\">Back to Blog</a></body></html>");
  const content=String(a.content||"").replace(/\n/g,"<br>");
  const canonical=`${SITE_URL}/blog/${encodeURIComponent(a.slug)}`;
  res.send(`<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.seoTitle)}</title><meta name="description" content="${esc(a.seoDescription)}"><meta name="keywords" content="${esc(a.keywords)}">
<link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(a.seoTitle)}"><meta property="og:description" content="${esc(a.seoDescription)}">
<link rel="stylesheet" href="/style.css"></head><body><header class="header"><a class="brand" href="/"><span class="brand-mark">C</span><span>Nik Haikal <b>coway</b></span></a><nav><a href="/">Home</a><a href="/blog">Blog</a></nav></header>
<main class="article-page"><div class="article-wrap"><span class="eyebrow">COWAY INSIGHTS</span><h1>${esc(a.title)}</h1><p class="article-date">${new Date(a.date).toLocaleDateString("ms-MY",{day:"numeric",month:"long",year:"numeric"})}</p>${a.coverImage?`<img class="article-cover" src="${esc(a.coverImage)}" alt="${esc(a.title)}">`:""}<article class="article-content">${content}</article><a class="btn primary" href="/">← Kembali ke Nik Haikal coway</a></div></main></body></html>`);
});

app.use((error,req,res,next) => {
  console.error(error);
  res.status(500).json({error:'Perkhidmatan tidak tersedia. Sila cuba lagi.'});
});
const lambdaHandler = serverless(app, {
  binary: ["image/*"]
});

module.exports.handler = async function handler(event, context) {
  connectLambda(event);
  return lambdaHandler(event, context);
};
