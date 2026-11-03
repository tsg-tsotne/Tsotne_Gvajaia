const copyLesson=document.querySelector('#copy-lesson-link');
copyLesson?.addEventListener('click',async()=>{
 const status=document.querySelector('#lesson-copy-status');
 try{await navigator.clipboard.writeText(copyLesson.dataset.url);status.textContent='ბმული დაკოპირებულია';}
 catch{const fallback=document.querySelector('.lesson-copy-fallback');fallback.hidden=false;fallback.querySelector('input').focus();fallback.querySelector('input').select();status.textContent='მონიშნული ბმული დააკოპირე';}
});
