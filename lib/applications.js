const fields = {name:100,ic:30,phone:25,backup:25,email:200,address:2000,product:100,language:10};
function application(body) {
 const result = {};
 for (const [key,max] of Object.entries(fields)) {
  const value=body?.[key];
  if (value != null && typeof value !== 'string') throw new Error('Maklumat permohonan tidak sah.');
  result[key]=(value || '').trim();
  if(result[key].length>max)throw new Error('Maklumat permohonan terlalu panjang.');
 }
 for(const key of ['name','ic','phone','email','address','product'])if(!result[key])throw new Error('Sila lengkapkan semua maklumat permohonan.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new Error('Sila masukkan email yang sah.');
 for(const key of ['phone','backup'])if(result[key] && (!/^\+?[\d\s()-]+$/.test(result[key]) || result[key].replace(/\D/g,'').length<8 || result[key].replace(/\D/g,'').length>15))throw new Error('Sila masukkan nombor telefon yang sah.');
 if(typeof body.id!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.id))throw new Error('ID permohonan tidak sah.');
 return {...result,id:body.id,submittedAt:new Date().toISOString()};
}
async function saveApplication(data, env=process.env, send=fetch) {
 const url=env.APPLICATIONS_WEBHOOK_URL,secret=env.APPLICATIONS_WEBHOOK_SECRET;
 if(!url || !secret)return {status:503,error:'Simpanan Google Sheets belum disediakan. Sila hantar permohonan melalui WhatsApp.'};
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))return {status:503,error:'Sambungan Google Sheets belum tersedia.'};
 try {
  const response=await send(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,application:data}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('save failed');
  const result=await response.json();
  if(result.ok!==true)throw new Error('save failed');
  return {status:201,ok:true};
 }catch{return {status:502,error:'Permohonan belum disahkan tersimpan ke Google Sheets. Sila cuba lagi atau hantar melalui WhatsApp.'};}
}
module.exports={application,saveApplication};
