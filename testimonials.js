(async function(){
 const list=document.getElementById('testimonialsList');
 if(!list)return;
 try{
  const response=await fetch('/api/testimonials');
  if(!response.ok)throw new Error();
  const items=await response.json();
  list.replaceChildren();
  if(!items.length){const notice=document.createElement('p');notice.className='product-note';notice.textContent='Belum ada testimoni untuk dipaparkan.';list.append(notice);}
  items.forEach(item=>{
   const card=document.createElement('article');card.className='testimonial-card';
   const frame=document.createElement('div');frame.className='testimonial-photo';
   const photo=document.createElement('img');photo.className='testimonial-image';photo.src=item.image;photo.alt=[item.name,item.product].filter(Boolean).join(' — ');photo.loading='lazy';photo.draggable=false;photo.referrerPolicy='no-referrer';
   const watermark=document.createElement('img');watermark.className='testimonial-watermark';watermark.src='/assets/branding/hypehaus-watermark.png';watermark.alt='';watermark.setAttribute('aria-hidden','true');watermark.draggable=false;
   photo.addEventListener('error',()=>{photo.hidden=true;frame.classList.add('photo-unavailable');});
   frame.addEventListener('contextmenu',event=>event.preventDefault());
   frame.append(photo,watermark);
   const body=document.createElement('div');body.className='testimonial-body';
   const title=document.createElement('h3');title.textContent=[item.name,item.state && `(${item.state})`,item.product && `(${item.product})`].filter(Boolean).join(' ');
   const caption=document.createElement('p');caption.textContent=item.caption;
   body.append(title,caption);card.append(frame,body);list.append(card);
  });
 }catch{
  const notice=document.createElement('p');notice.className='product-note';notice.textContent='Testimoni tidak dapat dimuatkan. Sila cuba lagi kemudian.';list.replaceChildren(notice);
 }
})();
