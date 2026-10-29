const galleryMain = document.getElementById('galleryMain');
const galleryThumbnails = [...document.querySelectorAll('.gallery-thumbnail')];
function selectGalleryImage(index) {
  const selected = galleryThumbnails[index];
  if (!galleryMain || !selected) return;
  galleryMain.src = selected.dataset.gallerySrc;
  galleryMain.alt = selected.dataset.galleryAlt;
  galleryThumbnails.forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
  document.getElementById('galleryCounter').textContent = `${index + 1} / ${galleryThumbnails.length}`;
}
galleryThumbnails.forEach((button, index) => {
  button.addEventListener('click', () => selectGalleryImage(index));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? galleryThumbnails.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + galleryThumbnails.length) % galleryThumbnails.length;
    selectGalleryImage(next);
    galleryThumbnails[next].focus();
  });
});

const productId = document.querySelector('[data-product-id]').dataset.productId;
const endpoint = `/api/products/${encodeURIComponent(productId)}/reviews`;
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.classList.toggle('active', active);
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    selectTab(next); next.focus();
  });
});
async function loadReviews() {
  const list = document.getElementById('reviewList');
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error();
    const reviews = await response.json();
    list.replaceChildren();
    const ratings = reviews.map(review => review.rating).filter(rating => Number.isInteger(rating) && rating >= 1 && rating <= 5);
    document.getElementById('ratingSummary').textContent = ratings.length
      ? `${(ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)} / 5 ★ · ${ratings.length} penilaian`
      : 'Belum ada penilaian bintang.';
    if (!reviews.length) list.textContent = 'Belum ada ulasan. Jadilah yang pertama berkongsi pengalaman anda.';
    reviews.forEach(review => {
      const article = document.createElement('article'); article.className = 'customer-review';
      const name = document.createElement('h3'); name.textContent = review.name;
      const date = document.createElement('small'); date.textContent = new Date(review.date).toLocaleDateString('ms-MY');
      const message = document.createElement('p'); message.textContent = review.message;
      const stars = document.createElement('p'); stars.className = 'review-stars';
      if (Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) {
        stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        stars.setAttribute('aria-label', `${review.rating} daripada 5 bintang`);
      } else { stars.textContent = 'Ulasan tanpa penilaian bintang'; }
      article.append(name, date, stars, message); list.append(article);
    });
  } catch { document.getElementById('ratingSummary').textContent = 'Penilaian tidak dapat dimuatkan.'; list.textContent = 'Ulasan tidak dapat dimuatkan. Sila muat semula halaman.'; }
}
document.getElementById('reviewForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, button = form.querySelector('button'), status = document.getElementById('reviewStatus');
  button.disabled = true; status.textContent = 'Menghantar…';
  try {
    const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...Object.fromEntries(new FormData(form)), rating:Number(new FormData(form).get("rating"))})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Ulasan tidak dapat dihantar. Sila cuba lagi.');
    form.reset(); status.textContent = 'Terima kasih! Ulasan anda telah disimpan.';
    await loadReviews();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
loadReviews();
