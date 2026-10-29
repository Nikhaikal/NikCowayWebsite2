function sheetUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || !/^\/spreadsheets\/d\/e\/[\w-]+\/pub$/.test(url.pathname) || url.searchParams.get('output') !== 'csv') throw new Error('Use the published Google Sheets CSV link (output=csv).');
  return url.href;
}
function parseCsv(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
    else if(c===',' && !quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r') && !quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('Invalid CSV');
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows;
}
function imageUrl(value) {
  const first=String(value||'').split(/,\s*(?=https?:)/)[0].trim();
  if(/^\/assets\/[\w./%-]+$/.test(first)&&!first.includes('..'))return first;
  try {
    const url=new URL(first);
    if(url.protocol!=='https:')return '';
    if(url.hostname==='drive.google.com') {
      const id=url.searchParams.get('id') || url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1];
      return id && /^[\w-]+$/.test(id) ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : '';
    }
    return url.href;
  } catch{return '';}
}
function testimonials(csv) {
  const [headers,...rows]=parseCsv(csv.replace(/^\uFEFF/,''));
  const aliases={'location':'state','nama cust':'name','nama pelanggan':'name','lokasi pemasangan':'state','negeri':'state','nama produk':'product','produk':'product','kapsyen':'caption','gambar hp dengan product dan customer':'photo','diluluskan':'approved'};
  const keys=(headers||[]).map(h=>{const key=h.trim().toLowerCase();return aliases[key]||key;});
  const required=['name','state','product','caption','photo'];
  if(required.some(h=>!keys.includes(h)))throw new Error('Sheet needs Name, Location (or State), Product (or Produk), Caption and Photo columns.');
  return rows.map(row=>Object.fromEntries(keys.map((key,i)=>[key,row[i]||'']))).filter(row=>!keys.includes('approved') || /^(yes|true|ya)$/i.test(row.approved.trim())).map(row=>({name:row.name.trim().slice(0,100),state:row.state.trim().slice(0,100),product:row.product.trim().slice(0,150),caption:row.caption.trim().slice(0,3000),image:imageUrl(row.photo)})).filter(row=>row.name&&row.state&&row.image).slice(0,100);
}
module.exports={sheetUrl,parseCsv,testimonials,imageUrl};
