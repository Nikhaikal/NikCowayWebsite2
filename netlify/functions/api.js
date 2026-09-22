const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getStore } = require("@netlify/blobs");
const serverless = require("serverless-http");

const app = express();
app.use(express.json({ limit: "5mb" }));

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHANGE-ME-NOW";
const SESSION_SECRET = process.env.SESSION_SECRET || "CHANGE-ME-SESSION-SECRET";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "") || "http://localhost:8888";
const COOKIE = "aliff_admin";
const STORE = "aliff-coway-blog";
const KEY = "articles.json";
const CMS_STORE = "aliff-coway-cms";
const SETTINGS_KEY = "settings.json";
const PRODUCTS_KEY = "products.json";
const MEDIA_STORE = "aliff-coway-media";

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
    return data == null ? fallback : data;
  } catch { return fallback; }
}
async function setCmsJson(key, value) {
  await getStore(CMS_STORE).setJSON(key, value);
}
async function saveMedia(contentType, data) {
  const id = crypto.randomUUID();
  await getStore(MEDIA_STORE).setJSON(id, { contentType, data });
  return `/api/media/${id}`;
}
function defaultSettings() {
  return { name:"ALIFF COWAY", whatsapp:"", email:"", tagline:"Promosi dan khidmat jualan Coway." };
}
function defaultProducts() {
  return [
   {id:"neon",name:"NEON",code:"CHP-6210N",cat:"water",type:"Penapis Air",price:"RM59",old:"RM106.92",image:""},
   {id:"neo-plus",name:"NEO PLUS",code:"CHP-264L",cat:"water",type:"Penapis Air",price:"RM59",old:"RM117.72",image:""},
   {id:"villaem-iii",name:"VILLAEM III",code:"CHP-7320L",cat:"water",type:"Penapis Air",price:"RM74",old:"RM133.92",image:""},
   {id:"dazzie",name:"DAZZIE",code:"CHP-1201N",cat:"water",type:"Penapis Air",price:"RM79",old:"RM128.52",image:""},
   {id:"lombok-iii",name:"LOMBOK III",code:"AP-1520C",cat:"air",type:"Penapis Udara",price:"RM60",old:"RM129.60",image:""},
   {id:"noble-ii",name:"NOBLE II",code:"AP-2023K",cat:"air",type:"Penapis Udara",price:"RM95",old:"RM145.80",image:""},
   {id:"studio",name:"STUDIO",code:"AP-1924A",cat:"air",type:"Penapis Udara",price:"RM49",old:"RM101.52",image:""},
   {id:"storm-ii",name:"STORM II",code:"AP-1523D",cat:"air",type:"Penapis Udara",price:"RM60",old:"RM118.80",image:""},
   {id:"outdoor-filter",name:"OUTDOOR FILTER",code:"POE-23A",cat:"home",type:"Outdoor Filter",price:"RM60",old:"RM108",image:""},
   {id:"washer-dryer",name:"WASHER DRYER",code:"12KG",cat:"home",type:"Washer Dryer",price:"RM99",old:"RM159",image:""},
   {id:"air-conditioner",name:"AIR CONDITIONER",code:"INVERTER",cat:"home",type:"Air Conditioner",price:"RM89",old:"RM129",image:""},
   {id:"massage-chair",name:"MASSAGE CHAIR",code:"BEREX",cat:"home",type:"Massage Chair",price:"RM149",old:"RM199",image:""}
  ];
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

app.get("/settings", async (req,res)=>{
  res.json(await getCmsJson(SETTINGS_KEY, defaultSettings()));
});
app.get("/products", async (req,res)=>{
  res.json(await getCmsJson(PRODUCTS_KEY, defaultProducts()));
});
app.get("/media/:id", async (req,res)=>{
  try {
    const item = await getStore(MEDIA_STORE).get(req.params.id, { type:"json" });
    if (!item || !item.data) return res.status(404).send("Not found");
    res.setHeader("Content-Type", item.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(item.data, "base64"));
  } catch { res.status(404).send("Not found"); }
});
app.get("/admin/settings", auth, async (req,res)=>res.json(await getCmsJson(SETTINGS_KEY, defaultSettings())));
app.put("/admin/settings", auth, async (req,res)=>{
  const current=await getCmsJson(SETTINGS_KEY, defaultSettings());
  const body=req.body||{};
  const settings={...current,name:String(body.name||current.name).slice(0,100),whatsapp:String(body.whatsapp||"").replace(/\D/g,"").slice(0,20),email:String(body.email||"").slice(0,200),tagline:String(body.tagline||current.tagline).slice(0,200)};
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
  const p={id:crypto.randomUUID(),name:String(body.name),code:String(body.code||""),cat:String(body.cat||"home"),type:String(body.type||"Product"),price:String(body.price||""),old:String(body.old||""),image:String(body.image||"")};
  items.push(p); await setCmsJson(PRODUCTS_KEY,items); res.status(201).json(p);
});
app.put("/admin/products/:id", auth, async (req,res)=>{
  const items=await getCmsJson(PRODUCTS_KEY, defaultProducts()); const i=items.findIndex(x=>x.id===req.params.id); if(i<0)return res.status(404).json({error:"Not found"});
  items[i]={...items[i],...(req.body||{}),id:items[i].id}; await setCmsJson(PRODUCTS_KEY,items); res.json(items[i]);
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
<link rel="stylesheet" href="/style.css"></head><body><header class="header"><a class="brand" href="/"><span class="brand-mark">C</span><span>ALIFF <b>COWAY</b></span></a><nav><a href="/">Home</a><a href="/blog">Blog</a></nav></header>
<main class="article-page"><div class="article-wrap"><span class="eyebrow">COWAY INSIGHTS</span><h1>${esc(a.title)}</h1><p class="article-date">${new Date(a.date).toLocaleDateString("ms-MY",{day:"numeric",month:"long",year:"numeric"})}</p>${a.coverImage?`<img class="article-cover" src="${esc(a.coverImage)}" alt="${esc(a.title)}">`:""}<article class="article-content">${content}</article><a class="btn primary" href="/">← Kembali ke Aliff Coway</a></div></main></body></html>`);
});

module.exports.handler = serverless(app);
