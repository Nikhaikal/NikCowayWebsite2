function defaultSettings() {
  return { testimonialsSheetUrl:'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxg84ihSKU5uROKTHWlfYUl77yORRrBXByFP-P6gFiiwEtmuogVT4ED0Q1GVdfhkd_0FF55z0oPTDl/pub?gid=764791025&single=true&output=csv',testimonialsFeedVersion:1,name:"Nik Haikal coway", whatsapp:"60199881304",contactPhoneVersion:1, email:"", tagline:"Promosi dan khidmat jualan Coway." };
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
   {id:"massage-chair",name:"MASSAGE CHAIR",code:"MC-ST01B",cat:"home",type:"Massage Chair",price:"RM149",old:"RM199",image:""}
  ].map(attachOptions);
}

const fs = require('node:fs');
const path = require('node:path');
const colours = {
 'pebble-grey': ['Pebble Grey', '#989c9e'], 'peach-pink': ['Peach Pink', '#edb9ae'],
 'ciel-blue': ['Ciel Blue', '#a9c5dd'], 'mint-green': ['Mint Green', '#bdd5c8'],
 'porcelain-white': ['Porcelain White', '#f5f2ea'], 'sand-beige': ['Sand Beige', '#d4c1a5'],
 white: ['White', '#ffffff'], black: ['Black', '#252525']
};
function option(productId, key, label, extra = {}) {
 const roots = [path.join(process.cwd(), 'assets/products'), path.join(__dirname, '../assets/products')];
 const root = roots.find(root => fs.existsSync(root)) || roots[0];
 const directory = path.join(root, productId, key);
 const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(file => /\.(webp|png|jpe?g)$/i.test(file)).sort((a,b) => Number(!/^main\./i.test(a))-Number(!/^main\./i.test(b)) || a.localeCompare(b)) : [];
 return {id: productId + '-' + key, key, label, images: files.map(file => '/assets/products/' + productId + '/' + key + '/' + file), ...extra};
}
function attachOptions(product) {
 let variants = [], groups = [];
 const colourKeys = ['neon','dazzie'].includes(product.id) ? ['pebble-grey','peach-pink','ciel-blue','mint-green','porcelain-white']
  : product.id === 'villaem-iii' ? ['pebble-grey','porcelain-white'] : product.id === 'studio' ? ['sand-beige','porcelain-white'] : [];
 variants = colourKeys.map(key => option(product.id,key,colours[key][0],{colour:colours[key][0],hex:colours[key][1]}));
 if (product.id === 'air-conditioner') {
  groups = [{id:'air-conditioner-f-series', label:'F-Series'}, {id:'air-conditioner-p-series',label:'P-Series'}];
  for (const capacity of ['1.0','1.5']) variants.push(option(product.id,'f-series-'+capacity.replace('.','')+'hp','F-Series · '+capacity+' HP',{series:'F-Series',capacity:capacity+' HP'}));
  for (const capacity of ['1.5','2.0']) for (const key of ['white','black']) variants.push(option(product.id,'p-series-'+capacity.replace('.','')+'hp-'+key,'P-Series · '+capacity+' HP · '+colours[key][0],{series:'P-Series',capacity:capacity+' HP',colour:colours[key][0],hex:colours[key][1]}));
 }
 if (product.id === 'washer-dryer') variants = ['12/9','10/6'].map(size => option(product.id,size.replace('/','-')+'kg',size+' kg',{capacity:size+' kg',modelCode:size==='10/6'?'CWD10-ST01':''}));
 const galleryImages = option(product.id,'gallery','Gallery').images;
 const images = galleryImages.length ? galleryImages : (product.images || []);
 return {...product,images,image:images[0] || variants.find(variant => variant.images.length)?.images[0] || product.image || '',variants,groups};
}
function mergeProducts(saved) {
 const defaults = defaultProducts();
 const savedProducts = Array.isArray(saved) ? saved : [];
 return [...defaults.map(product => attachOptions({...product,...savedProducts.find(item => item.id === product.id)})), ...savedProducts.filter(item => !defaults.some(product => product.id === item.id)).map(attachOptions)];
}
function resolveProduct(products,id) {
 for (const parent of products) {
  if(parent.id === id) return parent;
  const group = (parent.groups || []).find(group => group.id === id);
  if(group) return {...parent,id:group.id,parentId:parent.id,name:parent.name+' — '+group.label,variants:parent.variants.filter(variant => variant.series === group.label),groups:[],image:'',price:'',old:'',code:group.label};
  const selected = (parent.variants || []).find(variant => variant.id === id);
  if(selected) return {...parent,id:selected.id,parentId:parent.id,name:parent.name+' — '+selected.label,selected, image:selected.images[0] || '',code:[['air-conditioner','washer-dryer'].includes(parent.id)?'':parent.code,selected.modelCode,selected.series,selected.capacity].filter(Boolean).join(' · '),price:['air-conditioner','washer-dryer'].includes(parent.id)?'':parent.price,old:['air-conditioner','washer-dryer'].includes(parent.id)?'':parent.old};
 }
 return null;
}
module.exports = { defaultSettings, defaultProducts, mergeProducts, resolveProduct };

