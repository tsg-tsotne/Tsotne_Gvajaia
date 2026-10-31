const menuButton = document.querySelector('.menu-toggle');
// Shared viewer for all project photos, including future project pages.
const photoViewer = document.createElement('dialog');
photoViewer.className = 'photo-viewer';
photoViewer.setAttribute('aria-label', 'ფოტოს გაფართოებული ხედი');
photoViewer.innerHTML = `<div class="photo-viewer-toolbar"><span class="photo-counter" aria-live="polite"></span><button class="photo-close" aria-label="ფოტოს დახურვა" autofocus>×</button></div><div class="photo-viewer-stage"><button class="photo-prev" aria-label="წინა ფოტო">‹</button><img class="photo-enlarged" alt=""><button class="photo-next" aria-label="შემდეგი ფოტო">›</button></div><p class="photo-viewer-caption" aria-live="polite"></p>`;
document.body.append(photoViewer);
let viewerPhotos = [], viewerIndex = 0;
const enlargedPhoto = photoViewer.querySelector('.photo-enlarged');
let photoTransitionVersion = 0;
let photoTransition = null;
async function showViewerPhoto(index) {
  const version = ++photoTransitionVersion;
  photoTransition?.cancel();
  viewerIndex = (index + viewerPhotos.length) % viewerPhotos.length;
  const photo = viewerPhotos[viewerIndex];
  const position = viewerIndex;
  const switching = photoViewer.open && enlargedPhoto.src !== photo.src;
  if (switching) {
    // Keep the existing photo visible until the next image is ready.
    const preload = new Image();
    preload.src = photo.src;
    try { await preload.decode(); } catch { return; }
    if (version !== photoTransitionVersion || !photoViewer.open) return;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      photoTransition = enlargedPhoto.animate([{opacity:1},{opacity:0}], {duration:150,fill:'forwards',easing:'ease-out'});
      await photoTransition.finished.catch(() => {});
      if (version !== photoTransitionVersion || !photoViewer.open) return;
    }
  }
  enlargedPhoto.src = photo.src;
  enlargedPhoto.alt = photo.alt;
  photoViewer.querySelector('.photo-viewer-caption').textContent = photo.alt;
  photoViewer.querySelector('.photo-counter').textContent = `${position + 1} / ${viewerPhotos.length}`;
  photoViewer.querySelectorAll('.photo-prev,.photo-next').forEach(button => {button.hidden = viewerPhotos.length < 2;});
  photoTransition?.cancel();
  if (switching && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    photoTransition = enlargedPhoto.animate([{opacity:0},{opacity:1}], {duration:240,easing:'ease-in-out'});
  }
}
function openPhotoViewer(image) {
  const origin=image.getBoundingClientRect();
  viewerPhotos = [...new Map([...(image.closest('.news-card') || document).querySelectorAll(image.closest('.news-card') ? '.photo-zoom-trigger img' : '.real-project-photo img,.project-gallery img')].map(photo => [photo.src, {src: photo.src, alt: photo.alt}])).values()];
  showViewerPhoto(viewerPhotos.findIndex(photo => photo.src === image.src));
  photoViewer.showModal();
  document.body.classList.add('photo-viewer-open');
  const version=photoTransitionVersion;
  enlargedPhoto.decode().catch(()=>{}).then(()=>{
    if(!photoViewer.open || version!==photoTransitionVersion || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const target=enlargedPhoto.getBoundingClientRect();
    if(!target.width||!target.height)return;
    photoTransition=enlargedPhoto.animate([
      {transform:'translate('+(origin.x+origin.width/2-target.x-target.width/2)+'px,'+(origin.y+origin.height/2-target.y-target.height/2)+'px) scale('+origin.width/target.width+','+origin.height/target.height+')',opacity:.55},
      {transform:'translate(0,0) scale(1)',opacity:1}
    ],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});
  });
}
document.querySelectorAll('.real-project-photo').forEach(frame => {
  const image = frame.querySelector('img');
  if (!image || frame.closest('a,button')) return;
  const button = document.createElement('button');
  button.className = 'photo-zoom-trigger';
  button.setAttribute('aria-label', `${image.alt || 'ფოტო'} — გადიდება`);
  button.setAttribute('aria-haspopup', 'dialog');
  image.replaceWith(button); button.append(image);
});
document.querySelectorAll('.project-gallery a').forEach(link => {
  link.removeAttribute('target');
  link.setAttribute('aria-haspopup', 'dialog');
  link.setAttribute('aria-label', `${link.querySelector('img')?.alt || 'ფოტო'} — გადიდება`);
});
document.addEventListener('click', event => {
  const trigger = event.target.closest('.photo-zoom-trigger,.project-gallery a');
  const image = trigger?.querySelector('img');
  if (image) {event.preventDefault(); openPhotoViewer(image);}
});
// Horizontal single-finger swipes; vertical scrolling and pinch zoom stay native.
const photoStage = photoViewer.querySelector('.photo-viewer-stage');
let photoTouch = null, suppressPhotoClickUntil = 0;
photoStage.addEventListener('touchstart', event => {
  photoTouch = event.touches.length === 1 && !event.target.closest('button') && photoViewer.open && viewerPhotos.length > 1
    ? {x:event.touches[0].clientX,y:event.touches[0].clientY,id:event.touches[0].identifier} : null;
}, {passive:true});
photoStage.addEventListener('touchmove', event => {if(event.touches.length !== 1) photoTouch=null;}, {passive:true});
photoStage.addEventListener('touchcancel', () => {photoTouch=null;}, {passive:true});
photoStage.addEventListener('touchend', event => {
  const start=photoTouch; photoTouch=null;
  if(!start || event.touches.length || !photoViewer.open) return;
  const end=[...event.changedTouches].find(touch=>touch.identifier===start.id);
  if(!end) return;
  const dx=end.clientX-start.x,dy=end.clientY-start.y;
  if(Math.abs(dx)<50 || Math.abs(dx)<Math.abs(dy)*1.5) return;
  suppressPhotoClickUntil=performance.now()+500;
  showViewerPhoto(viewerIndex+(dx<0?1:-1));
}, {passive:true});
photoStage.addEventListener('click', event=>{
  if(performance.now()<suppressPhotoClickUntil){event.preventDefault();event.stopPropagation();}
},true);
photoViewer.addEventListener('close',()=>{photoTouch=null;suppressPhotoClickUntil=0;});
// Bring news search results into view, including repeated searches on this page.
function revealNewsResult(){
  const card=document.getElementById(location.hash.slice(1));
  if(!card?.matches('.news-list .news-card'))return;
  if(card.hidden) document.querySelector('.news-list')?.dispatchEvent(new Event('news-reset'));
  card.classList.add('scroll-revealed');
  requestAnimationFrame(()=>card.scrollIntoView({block:'start',behavior:'instant'}));
}
addEventListener('hashchange',revealNewsResult);
revealNewsResult();
photoViewer.querySelector('.photo-close').addEventListener('click', () => photoViewer.close());
photoViewer.querySelector('.photo-prev').addEventListener('click', () => showViewerPhoto(viewerIndex - 1));
photoViewer.querySelector('.photo-next').addEventListener('click', () => showViewerPhoto(viewerIndex + 1));
photoViewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); showViewerPhoto(viewerIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
photoViewer.addEventListener('click', event => {
  if (event.target === photoViewer || event.target.classList.contains('photo-viewer-stage')) photoViewer.close();
});
photoViewer.addEventListener('close', () => {
  ++photoTransitionVersion;
  photoTransition?.cancel();
  document.body.classList.remove('photo-viewer-open');
});
const navigation = document.querySelector('#navigation');
// A normalized SVG path traces each link's rounded outline at any width.
navigation.querySelectorAll('a').forEach(link => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('nav-outline');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '1'); rect.setAttribute('y', '1');
  rect.setAttribute('rx', '8'); rect.setAttribute('pathLength', '100');
  svg.append(rect); link.append(svg);
  new ResizeObserver(() => {
    rect.setAttribute('width', Math.max(0, link.clientWidth - 2));
    rect.setAttribute('height', Math.max(0, link.clientHeight - 2));
  }).observe(link);
});
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navigation.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false');
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    navigation.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus();
  }
});
const cards = [...document.querySelectorAll('.project-card')];
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(item => {
    const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
  });
  cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.club !== button.dataset.filter; });
  const emptyState = document.querySelector('#empty-projects');
  if (emptyState) emptyState.hidden = cards.some(card => !card.hidden);
  document.querySelector('#filter-status').textContent = `ნაჩვენებია ${cards.filter(card => !card.hidden).length} აქტივობა`;
}));
const stories = {
  parking: {tag:'ჭკვიანი სისტემები / პროექტი მუშავდება',title:'ჭკვიანი პარკინგი',paragraphs:[
    'მოსწავლეების პროექტის იდეა მიწისქვეშა პარკინგზე თავისუფალი ადგილების შესახებ ინფორმაციის წინასწარ მიწოდებაა. როდესაც პარკინგი სავსეა, მძღოლს აღარ მოუწევს ტყუილად ჩასვლა და უკან ამოსვლა.',
    'დაგეგმილ მოდელში ულტრაბგერითი სენსორები გაზომავს მანძილს და დაადგენს, დაკავებულია თუ თავისუფალი თითოეული საპარკინგე ადგილი. შენობის გარეთ განთავსებული LCD ეკრანი თავისუფალი ადგილების რაოდენობას აჩვენებს.',
    'პროექტი ამ ეტაპზე იდეისა და დაგეგმვის პროცესშია. მიზანია დროისა და საწვავის ზედმეტი ხარჯვის შემცირება. პრაქტიკული განხორციელების შემდეგ დაემატება მაკეტის ფოტოები, ვიდეო და გამოცდის შედეგები.'
  ]},
  egg: {tag:'RoboSpark / ჩატარებული აქტივობა',title:'კვერცხის დაცვის გამოწვევა',paragraphs:[
    'ამოცანა მარტივი იყო: მოსწავლეებს უნდა მოეფიქრებინათ, როგორ დაეცვათ კვერცხი მეორე სართულიდან ჩამოგდებისას. დამცავი კონსტრუქციისა და მასალების არჩევა თავად მონაწილეებს ევალებოდათ.',
    'აქტივობის შედეგად ყველა კვერცხი უვნებლად გადარჩა. თუმცა მთავარი მხოლოდ წარმატებული დაშვება არ ყოფილა — მოსწავლეებმა იდეის შექმნისა და გამოცდის პროცესი გაიარეს.',
    'შემდეგი ნაბიჯი რეფლექსიაა: რატომ იმუშავა კონსტრუქციამ? რა როლი ჰქონდა მასალებსა და გუნდურ მუშაობას? რას შეცვლიდნენ ახალ ცდაზე?'
  ]},
  bell: {tag:'ელექტრონიკა / პროექტი მუშავდება',title:'სკოლის ზარის სისტემა',paragraphs:[
    'პროექტის იდეაა სკოლის ზარისთვის ელექტრონული სისტემის აწყობა. მუშაობა მოიცავს ESP8266-ის, DFPlayer აუდიომოდულისა და OLED ეკრანის დაკავშირებას.',
    'ამ ეტაპზე მიმდინარეობს კომპონენტების შეერთებების, აუდიოს დაკვრისა და ეკრანის მუშაობის შემოწმება. პროექტი ჯერ დამუშავების პროცესშია.',
    'დასრულების შემდეგ აქ დაემატება რეალური მოწყობილობის ფოტოები, მუშაობის ვიდეო და მიღებული შედეგის აღწერა.'
  ]},
  plane: {tag:'RoboSpark / დასრულებული აქტივობა',title:'ქაღალდის ფრთები',paragraphs:[
    'მოსწავლეებმა შეისწავლეს თვითმფრინავის მუშაობის პრინციპი და შექმნეს არასტანდარტული კონსტრუქციის ქაღალდის თვითმფრინავები.',
    'პრაქტიკული გამოცდებით დააკვირდნენ, როგორ მოქმედებს ფორმისა და წონის გადანაწილება ფრენის მანძილზე, სიმაღლესა და სტაბილურობაზე. წარუმატებელი ფრენების გაანალიზებით გააუმჯობესეს საკუთარი მოდელები.',
    'გამარჯვებულ გუნდს გადაეცა 3D პრინტერით დაბეჭდილი ასაწყობი თვითმფრინავი. აქტივობა დასრულებულია; მისი ფოტოები სიახლეების განყოფილებაშია.'
  ]}
};
const dialog = document.querySelector('#project-dialog');
dialog.setAttribute('aria-labelledby','dialog-title');
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
  const story = stories[button.dataset.project];
  document.querySelector('#dialog-tag').textContent = story.tag;
  document.querySelector('#dialog-title').textContent = story.title;
  const body = document.querySelector('#dialog-body'); body.replaceChildren();
  story.paragraphs.forEach(text => {const paragraph = document.createElement('p'); paragraph.textContent = text; body.append(paragraph);});
  dialog.showModal();
}));
document.querySelectorAll('.dialog-close,.dialog-back').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
document.querySelector('#copy-email')?.addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('tsotne.gvajaia@gmail.com'); status.textContent = 'ელფოსტა დაკოპირებულია'; }
  catch { status.textContent = 'მონიშნე და დააკოპირე ზემოთ მოცემული ელფოსტა.'; }
});

// Gentle, one-time reveals on every page; native scrolling stays unchanged.
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window)) return;
  let observer;
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  let scheduled = false;
  function updateProgress() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
    scheduled = false;
  }
  function queueProgress() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  }
  function configure() {
    observer?.disconnect();
    document.querySelectorAll('.scroll-reveal').forEach(element => element.classList.remove('scroll-reveal', 'scroll-revealed'));
    if (preference.matches) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('scroll-revealed');
        observer.unobserve(entry.target);
      });
    }, {threshold: 0.04, rootMargin: '0px 0px -20px 0px'});
    const selector = 'main > section > .section-top, main > section > .eyebrow, main > section > h2, main > section > p, .club-card, .project-card, .lesson-card, .news-card, .steps article, .gallery-slot, .project-gallery figure, .project-video, .contact';
    document.querySelectorAll(selector).forEach(element => {
      if (element.getBoundingClientRect().top < innerHeight || element.closest('.contact') && !element.matches('.contact')) return;
      element.classList.add('scroll-reveal');
      observer.observe(element);
    });
  }
  addEventListener('scroll', queueProgress, {passive: true});
  addEventListener('resize', queueProgress, {passive: true});
  preference.addEventListener('change', configure);
  configure(); updateProgress();
})();

// Track the visible home section while keeping navigation destinations intact.
(() => {
  const nav = document.querySelector('#navigation');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  const sections = links.map(link => {
    const url = new URL(link.href);
    const home = document.querySelector('#home');
    const id = home && url.pathname.endsWith('/tutorials.html') ? 'lessons' : url.hash.slice(1);
    const section = id && document.getElementById(id);
    return section ? {link, section} : null;
  }).filter(Boolean);
  if (!sections.length) return;
  let pending = false;
  function update() {
    pending = false;
    const marker = document.querySelector('.header').getBoundingClientRect().height + Math.min(150, innerHeight * .18);
    let active = null;
    sections.forEach(item => {if (item.section.getBoundingClientRect().top <= marker) active = item.link;});
    if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 3) active = sections[sections.length - 1].link;
    links.forEach(link => {
      link.classList.toggle('nav-active', link === active);
      if (link === active) link.setAttribute('aria-current', 'location');
      else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
    });
  }
  function schedule() {if (!pending) {pending = true;requestAnimationFrame(update);}}
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  addEventListener('hashchange', schedule);
  addEventListener('load', schedule);
  new ResizeObserver(schedule).observe(document.body);
  update();
})();

// Back to top, shared across all pages.
(() => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.setAttribute('aria-label', 'გვერდის დასაწყისში დაბრუნება');
  button.title = 'ზემოთ დაბრუნება';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  button.hidden = true;
  document.body.append(button);
  let scheduled = false;
  function update() {
    scheduled = false;
    button.hidden = scrollY < 450 || !!document.querySelector('dialog[open]');
  }
  function schedule() {if (!scheduled) {scheduled = true;requestAnimationFrame(update);}}
  button.addEventListener('click', () => {
    // Transfer keyboard focus before the control disappears.
    const destination = document.querySelector('.header .brand');
    destination?.focus({preventScroll:true});
    scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  document.querySelectorAll('dialog').forEach(dialog => new MutationObserver(schedule).observe(dialog, {attributes:true, attributeFilter:['open']}));
  update();
})();

// Ambient network in the home hero, paused offscreen and in background tabs.
(() => {
  const hero = document.querySelector('#home.hero');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-network';
  canvas.setAttribute('aria-hidden','true');
  hero.prepend(canvas);
  const context = canvas.getContext('2d');
  if (!context) {canvas.remove();return;}
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,points=[],frame=0,last=0,visible=true;
  function resize() {
    width=hero.clientWidth;height=hero.clientHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    points=Array.from({length:width<600?22:42},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9}));
    draw(0);
  }
  function draw(delta) {
    context.clearRect(0,0,width,height);
    for(const point of points){
      point.x+=point.vx*delta;point.y+=point.vy*delta;
      if(point.x<0||point.x>width){point.vx*=-1;point.x=Math.max(0,Math.min(width,point.x));}
      if(point.y<0||point.y>height){point.vy*=-1;point.y=Math.max(0,Math.min(height,point.y));}
    }
    for(let i=0;i<points.length;i++){
      const a=points[i];
      for(let j=i+1;j<points.length;j++){
        const b=points[j],distance=Math.hypot(a.x-b.x,a.y-b.y);
        if(distance>140)continue;
        context.strokeStyle=`rgba(101,233,237,${.13*(1-distance/140)})`;
        context.lineWidth=.7;context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
      }
      context.fillStyle=i%4===0?'rgba(161,145,255,.45)':'rgba(101,233,237,.4)';
      context.beginPath();context.arc(a.x,a.y,1.5,0,Math.PI*2);context.fill();
    }
  }
  function tick(now){frame=0;draw(last?Math.min((now-last)/1000,.05):0);last=now;frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!document.hidden&&!preference.matches)frame=requestAnimationFrame(tick);else if(preference.matches)draw(0);}
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(hero);
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',sync);
  resize();sync();
})();

// Status badges retain their text; icons provide an additional visual cue.
document.querySelectorAll('.project-meta > span').forEach(status => {
  const label = status.textContent.trim();
  const working = label === 'მუშავდება';
  const complete = ['განხორციელებულია', 'ჩატარებულია', 'დასრულებულია'].includes(label);
  if (!working && !complete) return;
  status.classList.add('project-status', working ? 'status-working' : 'status-complete');
  const icon = document.createElement('span');
  icon.className = 'status-icon';
  icon.setAttribute('aria-hidden', 'true');
  if (complete) icon.textContent = '✓';
  status.prepend(icon);
});

// A light travels around card edges without intercepting clicks.
(() => {
  const ns='http://www.w3.org/2000/svg';
  const observer=new ResizeObserver(entries=>entries.forEach(({target})=>{
    const rect=target.querySelector(':scope > .card-edge-light rect');
    if (!rect) return;
    rect.setAttribute('width',Math.max(0,target.clientWidth-4));
    rect.setAttribute('height',Math.max(0,target.clientHeight-4));
  }));
  document.querySelectorAll('.project-card,.club-card,.lesson-card,.news-card').forEach(card=>{
    card.classList.add('has-edge-light');
    const svg=document.createElementNS(ns,'svg');svg.classList.add('card-edge-light');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const rect=document.createElementNS(ns,'rect');rect.setAttribute('x','2');rect.setAttribute('y','2');rect.setAttribute('rx','12');rect.setAttribute('pathLength','100');
    svg.append(rect);card.append(svg);observer.observe(card);
  });
})();

// Clip each click wave to its control without changing the control's layout.
(() => {
  const selector='button,a.button,a.nav-contact,.footer-socials a';
  function ripple(event){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const control=event.target.closest(selector);
    if(!control||control.disabled)return;
    const bounds=control.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const keyboard=event.type==='click';
    const x=keyboard?bounds.width/2:event.clientX-bounds.left;
    const y=keyboard?bounds.height/2:event.clientY-bounds.top;
    const radius=Math.hypot(Math.max(x,bounds.width-x),Math.max(y,bounds.height-y));
    const layer=document.createElement('span');layer.className='click-wave-layer';layer.setAttribute('aria-hidden','true');
    Object.assign(layer.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px',borderRadius:getComputedStyle(control).borderRadius});
    const wave=document.createElement('span');wave.className='click-wave';
    Object.assign(wave.style,{left:x-radius+'px',top:y-radius+'px',width:radius*2+'px',height:radius*2+'px'});
    layer.append(wave);document.body.append(layer);
    wave.addEventListener('animationend',()=>layer.remove(),{once:true});setTimeout(()=>layer.remove(),800);
  }
  document.addEventListener('pointerdown',event=>{if(event.button===0)ripple(event)},{passive:true});
  document.addEventListener('click',event=>{if(event.detail===0)ripple(event)});
  addEventListener('scroll',()=>document.querySelectorAll('.click-wave-layer').forEach(layer=>layer.remove()),{passive:true});
})();

// Search the current project catalogue from every page.
(() => {
  const nav=document.querySelector('#navigation');
  if(!nav)return;
  const trigger=document.createElement('button');trigger.className='nav-search';trigger.type='button';trigger.setAttribute('aria-label','პროექტების, სიახლეებისა და ვიდეოგაკვეთილების ძიება');trigger.setAttribute('aria-haspopup','dialog');
  trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  nav.append(trigger);
  const modal=document.createElement('dialog');modal.className='project-search';modal.setAttribute('aria-labelledby','project-search-title');
  modal.innerHTML='<button class="search-close" aria-label="ძიების დახურვა">×</button><h2 id="project-search-title">მოძებნე საიტზე</h2><label class="sr-only" for="project-search-input">პროექტი, სიახლე ან ვიდეოგაკვეთილი</label><input id="project-search-input" type="search" placeholder="მაგალითად: პირველი შეხვედრა, კონკურსი, Teams" autocomplete="off"><p class="search-status" role="status" aria-live="polite"></p><div class="search-results"></div>';
  document.body.append(modal);
  const input=modal.querySelector('input'),results=modal.querySelector('.search-results'),status=modal.querySelector('.search-status');
  let catalogue=null,loading=null;
  const normalize=value=>value.normalize('NFKC').toLocaleLowerCase('ka').replace(/\s+/g,' ').trim();
  function parse(doc){return [...doc.querySelectorAll('.project-card')].map(card=>{
    const action=card.querySelector('.project-body .text-link'),title=card.querySelector('h3')?.textContent,description=card.querySelector('.project-body p')?.textContent||'';
    return {kind:'პროექტი',title,description,keywords:card.textContent,href:action?.getAttribute('href'),story:action?.dataset.project};
  }).filter(item=>item.title&&(item.href||item.story));}
  async function load(){
    if(catalogue)return;
    if(!loading)loading=(async()=>{
      async function getDoc(file){const response=await fetch(file);if(!response.ok)throw Error('Catalogue unavailable');return new DOMParser().parseFromString(await response.text(),'text/html');}
      const [projectsDoc,lessonsDoc,newsDoc]=await Promise.all([document.querySelector('#projects .project-card')?document:getDoc('index.html'),document.querySelector('.lesson-library')?document:getDoc('tutorials.html'),document.querySelector('.news-list')?document:getDoc('news.html')]);
      const aliases={access:'Teams Office 365 თიმსი თიმსში მშობლებისთვის',design:'გრაფიკული დიზაინი',coding:'Scratch სკრეჩი პროგრამირება',office:'საოფისე ციფრული უნარები',webinars:'ვებინარი მასწავლებლებისთვის'};
      const lessons=[...lessonsDoc.querySelectorAll('.lesson-library .lesson-card')].map(card=>{
        const link=card.querySelector('.lesson-youtube');const id=new URL(link.href,location.href).searchParams.get('v');
        return {kind:'ვიდეო გაკვეთილი',title:card.querySelector('h3').textContent,description:card.querySelector('.lesson-category').textContent,keywords:card.textContent+' '+(aliases[card.dataset.lessonCategory]||''),href:'tutorials.html#lesson-'+id};
      });
      const news=[...newsDoc.querySelectorAll('.news-list .news-card[id]')].map(card=>({
        kind:'სიახლე',title:card.querySelector('h3').textContent,description:card.querySelector('.news-copy > p')?.textContent||'',
        keywords:card.querySelector('.news-copy').textContent + (card.textContent.includes('კონკურს') ? ' კონკურსი კონკურსები' : ''),href:'news.html#'+card.id
      }));
      catalogue=[...parse(projectsDoc),...lessons,...news];
    })().finally(()=>{loading=null});
    return loading;
  }
  function render(){
    if(!catalogue)return;
    const words=normalize(input.value).split(' ').filter(Boolean);
    const matches=catalogue.filter(item=>words.every(word=>normalize(item.keywords).includes(word)));
    results.replaceChildren();status.textContent=matches.length?`${matches.length} შედეგი`:'ვერაფერი მოიძებნა. სცადე სხვა სიტყვა.';
    matches.forEach(item=>{
      const result=document.createElement(item.href?'a':'button');result.className='search-result';
      if(item.href){result.href=item.href;result.addEventListener('click',event=>{modal.close();const target=new URL(item.href,location.href);if(target.pathname===location.pathname&&target.hash){event.preventDefault();if(location.hash===target.hash)dispatchEvent(new Event('hashchange'));else location.hash=target.hash;}});}
      else {result.type='button';result.addEventListener('click',()=>{
        modal.close();const story=stories[item.story];if(!story)return;
        document.querySelector('#dialog-tag').textContent=story.tag;document.querySelector('#dialog-title').textContent=story.title;
        const body=document.querySelector('#dialog-body');body.replaceChildren();story.paragraphs.forEach(text=>{const paragraph=document.createElement('p');paragraph.textContent=text;body.append(paragraph)});dialog.showModal();
      });}
      const title=document.createElement('strong');title.textContent=item.title;
      const description=document.createElement('span');description.textContent=item.description;
      const kind=document.createElement('small');kind.className='search-kind';kind.textContent=item.kind;result.append(kind,title,description);results.append(result);
    });
  }
  trigger.addEventListener('click',async()=>{
    nav.classList.remove('open');menuButton.setAttribute('aria-expanded','false');modal.showModal();document.body.classList.add('search-open');input.focus();status.textContent='შედეგები იტვირთება…';
    try{await load();render()}catch{status.textContent='შედეგების ჩატვირთვა ვერ მოხერხდა. დახურე ძიება და სცადე ხელახლა.'}
  });
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();results.firstElementChild?.focus()}if(event.key==='Enter'&&results.childElementCount===1){event.preventDefault();results.firstElementChild.click()}});
  modal.querySelector('.search-close').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close()});
  modal.addEventListener('close',()=>{document.body.classList.remove('search-open');trigger.focus({preventScroll:true})});
})();

// Share direct project pages and deep links to project stories.
(() => {
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path style="fill:currentColor;stroke:none" d="M14 21v-8h3l.5-4H14V7c0-1.1.4-2 2-2h2V1.5C17.2 1.2 16.1 1 15 1c-3.2 0-5 2-5 5v3H7v4h3v8z"/></svg>';
  function addButton(container,title,description,href){
    const button=document.createElement('a');button.className='project-share';
    const projectURL=new URL(href,'https://tsg-tsotne.github.io/Tsotne_Gvajaia/').href;
    button.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(projectURL);
    button.target='_blank';button.rel='noopener noreferrer';
    button.innerHTML=icon+'<span>Facebook-ზე გაზიარება</span>';
    button.setAttribute('aria-label',title+' — Facebook-ზე გაზიარება (ახალ ჩანართში)');
    container.append(button);
  }
  document.querySelectorAll('.project-card').forEach(card=>{
    const body=card.querySelector('.project-body'),action=body?.querySelector('.text-link');if(!action)return;
    const href=action.getAttribute('href')||(action.dataset.project?'project-'+encodeURIComponent(action.dataset.project)+'.html':null);if(!href)return;
    addButton(body,card.querySelector('h3').textContent,body.querySelector('p')?.textContent||'',href);
  });
  document.querySelectorAll('.news-card').forEach(card=>{
    const body=card.querySelector('.news-copy');if(!body||!card.id)return;
    addButton(body,card.querySelector('h3').textContent,body.querySelector('p')?.textContent||'',card.dataset.shareUrl||'news.html#'+card.id);
  });
  const intro=document.querySelector('.traffic-intro .club-intro-grid > div');
  if(intro){const url=new URL(location.pathname.split('/').pop(),'https://tsg-tsotne.github.io/Tsotne_Gvajaia/');addButton(intro,document.querySelector('h1').textContent,document.querySelector('.club-description')?.textContent||'',url.href);}
  function openSharedStory(){
    const match=location.hash.match(/^#project=([a-z-]+)$/);if(!match||!stories[match[1]])return;
    const trigger=document.querySelector(`[data-project="${match[1]}"]`);if(!trigger)return;
    if(dialog.open)dialog.close();trigger.click();
  }
  addEventListener('hashchange',openSharedStory);openSharedStory();
})();



// Club filters are independent of the project filters.
(() => {
  const list=document.querySelector('.news-list');
  if(!list)return;
  const cards=[...list.querySelectorAll('.news-card')];
  const buttons=[...document.querySelectorAll('[data-news-filter]')];
  if(!buttons.length)return;
  let filterVersion=0;
  let filterAnimations=[];
  async function filter(value,animate=true){
    const version=++filterVersion;
    filterAnimations.forEach(animation=>animation.cancel());
    filterAnimations=[];
    const motion=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(motion){
      filterAnimations=cards.filter(card=>!card.hidden).map(card=>card.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'}));
      await Promise.all(filterAnimations.map(animation=>animation.finished.catch(()=>{})));
      if(version!==filterVersion)return;
      filterAnimations.forEach(animation=>animation.cancel());
    }
    buttons.forEach(button=>{const active=button.dataset.newsFilter===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    cards.forEach(card=>{card.hidden=value!=='all'&&card.dataset.newsClub!==value;});
    if(motion)filterAnimations=cards.filter(card=>!card.hidden).map((card,i)=>card.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:Math.min(i*35,140),fill:'backwards',easing:'ease-out'}));
    document.querySelector('#news-filter-status').textContent='ნაჩვენებია '+cards.filter(card=>!card.hidden).length+' სიახლე';
  }
  buttons.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.newsFilter)));
  list.addEventListener('news-reset',()=>filter('all',false));
  filter('all',false);
})();

// Pointer-following light is decorative and never captures clicks.
document.querySelectorAll('.project-card,.club-card,.lesson-card,.news-card,.related-card').forEach(card=>{
  card.classList.add('spotlight-card');
  const glow=document.createElement('span');glow.className='card-spotlight';glow.setAttribute('aria-hidden','true');card.append(glow);
  let frame=0,x=0,y=0;
  card.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const rect=card.getBoundingClientRect();x=event.clientX-rect.left;y=event.clientY-rect.top;
    if(!frame)frame=requestAnimationFrame(()=>{glow.style.setProperty('--spot-x',x+'px');glow.style.setProperty('--spot-y',y+'px');frame=0;});
  });
});
// A precisely positioned light accents the existing raster antenna.
document.querySelectorAll('.robo-card-logo,.robo-hero-logo').forEach(logo=>{
  const wrapper=document.createElement('span');wrapper.className=logo.classList.contains('robo-card-logo')?'robo-logo-motion robo-logo-small':'robo-logo-motion robo-logo-large';
  wrapper.tabIndex=0;wrapper.setAttribute('aria-label',logo.alt);
  logo.replaceWith(wrapper);wrapper.append(logo);
  const light=document.createElement('span');light.className='robo-antenna-light';light.setAttribute('aria-hidden','true');wrapper.append(light);
});
