let products = [
 {id:"neon",name:"NEON",code:"CHP-6210N",cat:"water",type:"Penapis Air",price:"RM59",old:"RM106.92",image:""},
 {id:"neo-plus",name:"NEO PLUS",code:"CHP-264L",cat:"water",type:"Penapis Air",price:"RM59",old:"RM117.72",image:""}
];
let siteSettings={name:"Nik Haikal COWAY",whatsapp:"",email:"",tagline:"Promosi dan khidmat jualan Coway."};
const grid=document.getElementById("productGrid");
function waUrl(message="Hi, saya nak tahu promosi Coway terkini."){
 const n=(siteSettings.whatsapp||"").replace(/\D/g,"");
 return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}
function applySettings(){
 document.querySelectorAll("[data-site-name]").forEach(el=>el.innerHTML=(siteSettings.name||"ALIFF COWAY").replace(/\b(COWAY)\b/i,"<b>$1</b>"));
 document.querySelectorAll("[data-site-tagline]").forEach(el=>el.textContent=siteSettings.tagline||"");
 document.querySelectorAll(".wa-link").forEach(a=>a.href=waUrl(a.textContent.includes("Cadangan")?"Hi, boleh cadangkan produk Coway untuk rumah saya?":"Hi, saya nak tahu promosi Coway terkini."));
}
function render(cat="all"){
 if(!grid)return;
 grid.innerHTML=products.filter(p=>cat==="all"||p.cat===cat).map(p=>`
 <article class="card">
   <div class="product-image ${p.cat}" style="${p.image?`background-image:url('${p.image}');background-size:cover;background-position:center;`:''}">${p.image?'':`<span class="tag">${String(p.type||'PRODUCT').toUpperCase()}</span>`}</div>
   <div class="card-body">
    <small>${p.code||''}</small><h3>${p.name||''}</h3>
    <div class="price"><strong>${p.price||''}<small>/bulan</small></strong><span class="old">${p.old||''}</span></div>
    <a class="btn" target="_blank" href="${waUrl(`Hi Nik Haikal, saya berminat dengan ${p.name} (${p.code}). Boleh saya dapatkan promosi terkini?`)}">Semak Promosi</a>
   </div>
 </article>`).join("");
}
async function loadCms(){
 try{const [s,p]=await Promise.all([fetch('/api/settings').then(r=>r.json()),fetch('/api/products').then(r=>r.json())]);siteSettings=s||siteSettings;if(Array.isArray(p)&&p.length)products=p;}catch(e){}
 applySettings(); render();
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");render(btn.dataset.cat)}));
loadCms();

const translations = {
ms:{emailLabel:"Email",emailPlaceholder:"contoh@email.com",nameLabel:"Nama seperti di dalam IC",icLabel:"No. IC",telLabel:"No. Telefon",backupLabel:"No. Telefon Backup",addressLabel:"Alamat Pemasangan",productLabel:"Produk Diminati",submit:"Hantar Permohonan"},
en:{emailLabel:"Email",emailPlaceholder:"example@email.com",nameLabel:"Name as per IC",icLabel:"IC Number",telLabel:"Telephone Number",backupLabel:"Backup Telephone Number",addressLabel:"Installation Address",productLabel:"Product Interested In",submit:"Submit Application"},
zh:{emailLabel:"电子邮箱",emailPlaceholder:"例如：email@example.com",nameLabel:"身份证上的姓名",icLabel:"身份证号码",telLabel:"电话号码",backupLabel:"备用电话号码",addressLabel:"安装地址",productLabel:"感兴趣的产品",submit:"提交申请"}
};
let currentLang="ms";
function setLanguage(lang){
 currentLang=lang;
 document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(translations[lang][k])el.textContent=translations[lang][k]});
 document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{const k=el.dataset.i18nPlaceholder;if(translations[lang][k])el.placeholder=translations[lang][k]});
 document.querySelectorAll(".lang").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
 document.documentElement.lang=lang==="zh"?"zh-CN":lang;
}
document.querySelectorAll(".lang").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.lang)));

document.getElementById("leadForm").addEventListener("submit",e=>{
 e.preventDefault();
 const f=new FormData(e.target);
 const labels={ms:["Nama","No. IC","No. Telefon","No. Telefon Backup","Email","Alamat Pemasangan","Produk Diminati"],en:["Name","IC Number","Telephone Number","Backup Telephone Number","Email","Installation Address","Product Interested In"],zh:["姓名","身份证号码","电话号码","备用电话号码","电子邮箱","安装地址","感兴趣的产品"]}[currentLang];
 const intro={ms:"Hi Nik Haikal, saya ingin membuat permohonan Coway.",en:"Hi Nik Haikal, I would like to make a Coway application.",zh:"您好 Nik Haikal，我想申请 Coway。"}[currentLang];
 const product=e.target.querySelector('select[name="product"] option:checked').textContent;
 const msg=`${intro}%0A%0A${labels[0]}: ${encodeURIComponent(f.get("name"))}%0A${labels[1]}: ${encodeURIComponent(f.get("ic"))}%0A${labels[2]}: ${encodeURIComponent(f.get("phone"))}%0A${labels[3]}: ${encodeURIComponent(f.get("backup")||"-")}%0A${labels[4]}: ${encodeURIComponent(f.get("email"))}%0A${labels[5]}: ${encodeURIComponent(f.get("address"))}%0A${labels[6]}: ${encodeURIComponent(product)}`;
 window.open(waUrl(msg),"_blank");
});
setLanguage("ms");

const menuBtn=document.getElementById("menuBtn");
const mobileNav=document.getElementById("mobileNav");
if(menuBtn && mobileNav){
  menuBtn.addEventListener("click",()=>{
    const open=mobileNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded",open?"true":"false");
    menuBtn.textContent=open?"✕":"☰";
  });
  mobileNav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
    mobileNav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded","false");
    menuBtn.textContent="☰";
  }));
}
