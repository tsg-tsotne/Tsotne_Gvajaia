// Apply saved choice before styles paint; dark is always the first-visit default.
try{document.documentElement.dataset.theme=localStorage.getItem('club-theme')==='light'?'light':'dark';}catch{document.documentElement.dataset.theme='dark';}
