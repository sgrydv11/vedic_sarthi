const $ = (selector, root = document) => root.querySelector(selector)
const main = $('#main')
const dialog = $('#dialog')
const modal = $('#modal')
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value)
let catalog
const nav = [['home','Home'],['poojas','Poojas'],['panchang','Panchang'],['astrology','Astrology'],['library','Library'],['daan','Daan'],['consult','Consult']]
const symbols = {download:'list',poojas:'diya',panchang:'calendar',astrology:'stars',library:'book',daan:'heart',consult:'chat',jaap:'mala',requests:'list'}
const paths = {
 diya:'M3 14h18c-1.5 5-5 7-9 7s-7.5-2-9-7Z M12 14c-5-3 2-5 0-11 5 4 6 9 0 11Z',
 calendar:'M4 6h16v15H4Z M4 10h16 M8 3v5 M16 3v5 M8 14h2 M13 14h3 M8 18h2',
 stars:'M12 2c0 6 4 10 10 10-6 0-10 4-10 10 0-6-4-10-10-10 6 0 10-4 10-10Z M19 3v4 M17 5h4',
 book:'M12 6c-2-2-4-3-9-2v15c4-1 7 0 9 2 2-2 5-3 9-2V4c-5-1-7 0-9 2v15 M6 8h3 M15 8h3',
 heart:'M12 20 4 12C-1 7 6 2 12 7c6-5 13 0 8 5Z',
 chat:'M3 4h18v13H9l-6 4Z M7 9h10 M7 13h7',
 mala:'M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z M12 20v3 M4 12h2 M18 12h2 M12 4v2 M7 7l1 1 M17 7l-1 1',
 list:'M6 3h12v18H6Z M9 8h6 M9 12h6 M9 16h4',
 pin:'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
 search:'M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z M15 15l5 5',
 check:'m4 12 5 5L20 6',
 sun:'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M19 5l-1 1 M6 18l-1 1'
}
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[name]+'"/></svg>'
const button = (label, attributes = '', cls = 'primary') => /data-(pooja|astrology|daan|consult|support|auth)(=|$)/.test(attributes)
  ? ''
  : '<button class="'+cls+'" '+attributes+'>'+label+'</button>'
const link = (label, path, cls = 'primary') => '<a class="'+cls+'" href="#'+path+'">'+label+'</a>'
function heading(label, title, description) {
  return '<div class="page-heading"><p class="eyebrow">'+label+'</p><h1>'+title+'</h1><p>'+description+'</p></div>'
}
function open(title, html, wiring) {
  modal.innerHTML = '<div class="modal-title"><h2>'+escape(title)+'</h2><button class="icon-button" aria-label="Close dialog">×</button></div>'+html
  $('.icon-button',modal).onclick = () => dialog.close()
  wiring?.()
  if (!dialog.open) dialog.showModal()
}
function select(name,label,options) {
  return '<label>'+escape(label)+'<select name="'+name+'" required>'+options.map(option => {
    const [value,text] = Array.isArray(option)?option:[option,option]
    return '<option value="'+escape(value)+'">'+escape(text)+'</option>'
  }).join('')+'</select></label>'
}
const ritualSummary = item => '<article class="ritual card"><div class="ritual-art '+(['shiva','mangal','river'][catalog.rituals.indexOf(item)%3])+'"><span class="tag">'+escape(item.category)+'</span><span class="ritual-glyph" aria-hidden="true">'+icon(['diya','sun','stars'][catalog.rituals.indexOf(item)%3])+'</span></div><div class="ritual-body"><h3>'+escape(item.name)+'</h3><p class="location">'+icon('pin')+escape(item.place)+'</p>'+(item.description?'<p>'+escape(item.description)+'</p>':'')+'<div class="ritual-action"><span>'+(item.fee===null?'Quote on request':money(item.fee))+'</span>'+button('Request pooja','data-pooja="'+item.id+'"','secondary')+'</div></div></article>'
const pandits = [
  {name:'Param Pujya Vishal Rawal Ji',knownAs:'Bittu Bhaiya',photo:'vishal-rawal',topics:'Vedic pooja · Sankalp',
    intro:'Meet Vishal Rawal Ji, known as Bittu Bhaiya. Devotees can request guidance on preparing their Sankalp and planning a pooja.'},
  {name:'Param Pujya Yashwant Rawal Ji',knownAs:'Lalli Guru',photo:'yashwant-rawal',topics:'Karmkand · Family ceremonies',
    intro:'Meet Yashwant Rawal Ji, known as Lalli Guru. Families can request guidance on preparing for traditional ceremonies and observing their customs.'}
]
function panditProfiles() {
  return '<section class="section pandit-section" aria-labelledby="pandit-heading"><h2 id="pandit-heading">Meet the Pandit Jis</h2><div class="pandit-grid">'+
    pandits.map(pandit => '<article class="card pandit-card"><div class="pandit-portrait '+pandit.photo+'"><img src="/'+pandit.photo+'.jpg" alt="Portrait of '+pandit.name+'"></div>'+
      '<div><h3>'+pandit.name+'</h3><p class="pandit-alias">'+pandit.knownAs+'</p><p class="eyebrow">'+pandit.topics+'</p><p>'+pandit.intro+'</p></div></article>').join('')+'</div></section>'
}
function home() {
  const quick = [['poojas','Book a Pooja'],['panchang','Panchang'],['astrology','Kundli & Milan'],['daan','Gau Seva & Daan'],['jaap','Jaap Mala'],['library','Ritual Guides'],['consult','Meet the Pandit Jis'],['download','Android App']]
  main.innerHTML = '<div class="welcome"><p>'+icon('pin')+' Ujjain, Madhya Pradesh</p><span>'+new Intl.DateTimeFormat('en-IN',{dateStyle:'full',timeZone:'Asia/Kolkata'}).format(new Date())+'</span></div>'+
    '<section class="hero"><div class="hero-copy"><p class="eyebrow">UJJAIN SPIRITUAL SERVICES</p><h1>Bring the sacred<br>closer to home.</h1><p>Explore Ujjain’s poojas, meet the Pandit Jis, and find guides for festivals and home worship.</p><div class="actions">'+link('Explore poojas','poojas','primary gold')+link('Plan a visit','library/pilgrimage','hero-link')+'</div></div><div class="hero-image" role="img" aria-label="Illustration of a sandstone temple at dawn"></div></section>'+
    '<section class="section"><h2>Explore services</h2><div class="quick-grid">'+quick.map(([path,label])=>'<a class="quick card" href="#'+path+'"><span class="feature-icon">'+icon(symbols[path])+'</span>'+label+'</a>').join('')+'</div></section>'+
    '<section class="section"><div class="section-top"><div><p class="eyebrow">UJJAIN RITUALS</p><h2>Featured poojas</h2></div>'+link('View catalog','poojas','secondary')+'</div><div class="grid">'+catalog.rituals.slice(0,3).map(ritualSummary).join('')+'</div></section>'+panditProfiles()
}
function poojas() {
  main.innerHTML = heading('RITUAL CATALOG','Find a pooja','Explore rituals by tradition, venue or occasion.')+
    '<div class="filters"><label class="search">'+icon('search')+'<input id="search" aria-label="Search poojas" placeholder="Search pooja or venue"></label>'+select('category','Category',['All categories',...new Set(catalog.rituals.map(item=>item.category))])+'</div><div id="ritual-grid" class="grid"></div>'
  const filter = () => {
    const category = $('select[name=category]').value
    const query = $('#search').value.toLowerCase().trim()
    const found = catalog.rituals.filter(item=>(category==='All categories'||category===item.category)&&[item.name,item.place,item.category].some(text=>text.toLowerCase().includes(query)))
    $('#ritual-grid').innerHTML = found.map(ritualSummary).join('') || '<p>No poojas match this search.</p>'
  }
  $('#search').oninput = filter
  $('select[name=category]').onchange = filter
  filter()
}
function panchang() {
  main.innerHTML = heading('VEDIC CALENDAR','Panchang & festivals','Explore the Hindu months, festivals and traditional observances.')+
    '<div class="callout"><div><h2>Daily Panchang for Ujjain or your city</h2><p>The festival calendar below lists traditional observances by Hindu month.</p></div>'+button('Request Panchang','data-astrology="Daily Panchang"')+'</div>'+
    '<h2 class="section">Hindu festival calendar</h2><p>Gregorian month ranges are approximate. Observance dates vary by year and location.</p><div class="grid">'+catalog.calendar.map(row=>'<article class="card info"><h3>'+escape(row.name)+'</h3><p>'+escape(row.festival)+'</p><p>'+escape(row.practice)+'</p></article>').join('')+'</div>'
}
function servicePage(kind) {
  const isDaan = kind==='daan'
  const isAstro = kind==='astrology'
  const items = isDaan ? catalog.daan : catalog[isAstro?'astrology':'consult'].map(name=>({name}))
  main.innerHTML = heading(isDaan?'SACRED GIVING':isAstro?'VEDIC ASTROLOGY':'UJJAIN PANDIT JIS',isDaan?'Daan & Gau Seva':isAstro?'Astrology':'Pandit Jis & consultation topics',
    isDaan?'Explore traditional forms of Daan and Gau Seva.':isAstro?'Explore traditional Vedic astrology services and consultation topics.':'Meet the Pandit Jis and browse topics commonly discussed in a consultation.')+
    '<div class="grid">'+items.map(item=>'<article class="card info"><span class="feature-icon">'+icon(symbols[kind])+'</span><h3>'+escape(item.name)+'</h3>'+
    (item.description?'<p>'+escape(item.description)+'</p>':'')+button(isDaan?'Create pledge':'Request '+(isAstro?'review':'consultation'),'data-'+kind+'="'+escape(item.name)+'"','secondary')+'</article>').join('')+'</div>'+(!isDaan&&!isAstro?panditProfiles():'')
}
function library(subpage) {
  const types = [['all','All guides'],['home','Home puja'],['vrat','Vrat'],['karmkand','Karmkand'],['pilgrimage','Pilgrimage']]
  const category = types.find(([id])=>subpage===id)?.[1] || 'All guides'
  main.innerHTML = heading('PRACTICE & TRADITION','Ritual library','Follow a home puja, prepare for a family ceremony or plan a visit to Ujjain.')+
    '<nav class="tabs" aria-label="Guide categories">'+types.map(([id,label])=>'<a class="'+(label===category?'selected':'')+'" href="#library/'+id+'">'+label+'</a>').join('')+'</nav><div class="grid">'+catalog.guides
      .map((guide,i)=>({...guide,i})).filter(g=>category==='All guides'||g.category===category).map(g=>'<article class="card info"><span class="eyebrow">'+g.category+'</span><h3>'+g.name+'</h3><p>'+g.steps[0]+'</p>'+button('Read guide','data-guide="'+g.i+'"','secondary')+'</article>').join('')+'</div>'
}
function localRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem('avantika:'+key)) ?? fallback } catch { return fallback }
}
function localWrite(key,value) {
  try { localStorage.setItem('avantika:'+key,JSON.stringify(value)) } catch {}
}
function readGuide(index) {
  const g = catalog.guides[index]
  const key = 'guide:'+g.name
  const checked = localRead(key,[])
  open(g.name,'<p class="eyebrow">'+g.category+'</p>'+(g.materials.length?'<h3>Samagri checklist</h3><fieldset class="checklist">'+g.materials.map((item,i)=>'<label><input type="checkbox" value="'+i+'" '+(checked.includes(i)?'checked':'')+'>'+escape(item)+'</label>').join('')+'</fieldset>':'')+
    '<h3>Guide</h3><ol class="steps">'+g.steps.map(step=>'<li>'+escape(step)+'</li>').join('')+'</ol>',()=>{
      $('.checklist',modal)?.addEventListener('change',()=>localWrite(key,[...modal.querySelectorAll(':checked')].map(box=>Number(box.value))))
    })
}
const mantras = [
  ['Om Namah Shivaya','ॐ नमः शिवाय','Om Namaḥ Śivāya'],
  ['Mahamrityunjaya','ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् । उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात् ॥','Om Tryambakaṃ Yajāmahe Sugandhiṃ Puṣṭivardhanam · Urvārukam Iva Bandhanān Mṛtyor Mukṣīya Māmṛtāt'],
  ['Gayatri','ॐ भूर्भुवः स्वः । तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि । धियो यो नः प्रचोदयात् ॥','Om Bhūr Bhuvaḥ Svaḥ · Tat Savitur Vareṇyaṃ · Bhargo Devasya Dhīmahi · Dhiyo Yo Naḥ Pracodayāt']
]
function jaap() {
  main.innerHTML = heading('DAILY PRACTICE','Jaap Mala','Count a round of 108 repetitions. Your progress is saved on this device.')+
    '<section class="card jaap">'+select('mantra','Mantra',mantras.map(([name],i)=>[String(i),name]))+'<div id="mantra"></div><div id="jaap-count" aria-live="polite"></div><progress max="108" value="0" aria-label="Current mala progress"></progress><div class="actions">'+button('Count one','id="bead"')+button('Reset count','id="reset"','secondary')+'</div></section>'
  const chooser = $('select[name=mantra]')
  const update = (delta=null) => {
    const [name,sanskrit,translit] = mantras[Number(chooser.value)]
    const total = delta===0 ? 0 : localRead('jaap:'+name,0)+(delta||0)
    const count = total && (total%108||108)
    localWrite('jaap:'+name,total)
    $('#mantra').innerHTML = '<p class="sanskrit" lang="sa">'+sanskrit+'</p><p>'+translit+'</p>'
    $('#jaap-count').innerHTML = '<strong>'+count+' / 108</strong><span>'+Math.floor(total/108)+' completed mala'+(Math.floor(total/108)===1?'':'s')+'</span>'
    $('progress').value = count
  }
  chooser.onchange = () => update()
  $('#bead').onclick = () => update(1)
  $('#reset').onclick = () => open('Reset this mantra’s count?','<p>This clears the saved count for the selected mantra on this device.</p>'+button('Reset count','id="confirmReset"'),()=>{
    $('#confirmReset').onclick=()=>{ update(0); dialog.close() }
  })
  update()
}
function render() {
  const [page,subpage]=(location.hash.slice(1)||'home').split('/')
  $('#nav').innerHTML=nav.map(([path,label])=>'<a href="#'+path+'" '+(page===path?'aria-current="page"':'')+'>'+label+'</a>').join('')

  if (!page||page==='home') home()
  else if (page==='poojas') poojas()
  else if (page==='panchang') panchang()
  else if (['astrology','daan','consult'].includes(page)) servicePage(page)
  else if (page==='library') library(subpage)
  else if (page==='jaap') jaap()
  else if (page==='download') main.innerHTML=heading('ANDROID APP','Download Avantika','The Android app includes the ritual catalog, festival guides, Pandit Ji profiles and Jaap Mala for offline use.')+
    '<a class="primary" href="/download/avantika.apk" download="Avantika.apk">Download APK</a>'
  else main.innerHTML=heading('AVANTIKA','Page unavailable','Return home to find available services.')+link('Home','home')
}
main.addEventListener('click',event=>{
  const target=event.target.closest('button')
  if (!target) return
  const data=target.dataset
  if ('guide' in data) readGuide(Number(data.guide))
})
addEventListener('hashchange',()=>{ render(); window.scrollTo(0,0) })
try {
  const response=await fetch('/catalog.json')
  if (!response.ok) throw new Error('Catalog unavailable')
  catalog=await response.json()
  render()
} catch {
  main.textContent='The catalog could not load. Refresh to try again.'
}
