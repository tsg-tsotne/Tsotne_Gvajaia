document.querySelectorAll('.lesson-play').forEach(button=>button.addEventListener('click',()=>{
  const frame=document.createElement('iframe');
  frame.src=`https://www.youtube-nocookie.com/embed/${button.dataset.youtube}?autoplay=1`;
  frame.title=button.closest('.lesson-card').querySelector('h3').textContent;
  frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  button.replaceWith(frame);frame.focus();
}));
document.querySelectorAll('[data-lesson-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-lesson-filter]').forEach(other=>{const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active))});
  let count=0;
  document.querySelectorAll('[data-lesson-category]').forEach(card=>{card.hidden=button.dataset.lessonFilter!=='all'&&card.dataset.lessonCategory!==button.dataset.lessonFilter;if(!card.hidden)count++;else {const frame=card.querySelector('iframe');if(frame)frame.src=frame.src.replace('?autoplay=1','?autoplay=0')}});
  document.querySelector('.lesson-count').textContent=`${count} ვიდეო გაკვეთილი`;
}));

// Deep links reveal the requested lesson even when a category filter is active.
function revealLinkedLesson(){
  if(!location.hash.startsWith('#lesson-'))return;
  const card=document.getElementById(location.hash.slice(1));if(!card)return;
  if(card.hidden)document.querySelector('[data-lesson-filter="all"]')?.click();
  card.classList.add('scroll-revealed');
  requestAnimationFrame(()=>card.scrollIntoView({block:'start',behavior:'instant'}));
}
addEventListener('hashchange',revealLinkedLesson);
addEventListener('load',revealLinkedLesson);
revealLinkedLesson();
