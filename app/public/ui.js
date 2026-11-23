const $ = (selector, root = document) => root.querySelector(selector)
const main = $('#main')
const dialog = $('#dialog')
const modal = $('#modal')
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value)
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata'}).format(new Date())
const formatDate = date => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(date))
const short = id => id.slice(0,8).toUpperCase()
let user, catalog, googleSignIn
let noticeTimer
const nav = [['home','Home'],['poojas','Poojas'],['temples','Temples'],['chadhava','Chadhava'],['events','Events'],['panchang','Panchang'],['astrology','Astrology'],['library','Library'],['consult','Consult']]
const names = {chadhava:'Chadhava',store:'Shop request',pooja:'Pooja',daan:'Daan',astrology:'Astrology',consultation:'Consultation',support:'Support'}
const symbols = {mandir:'diya',temples:'pin',chadhava:'heart',devotional:'book',community:'chat',store:'list',poojas:'diya',panchang:'calendar',astrology:'stars',library:'book',daan:'heart',consult:'chat',jaap:'mala',requests:'list'}
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
const button = (label, attributes = '', cls = 'primary') => '<button class="'+cls+'" '+attributes+'>'+label+'</button>'
const link = (label, path, cls = 'primary') => '<a class="'+cls+'" href="#'+path+'">'+label+'</a>'
function heading(label, title, description) {
  return '<div class="page-heading"><p class="eyebrow">'+label+'</p><h1>'+title+'</h1><p>'+description+'</p></div>'
}
function inform(text) {
  $('#notice').textContent = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { $('#notice').textContent = '' }, 5000)
}
async function api(path, method='GET', data) {
  const response = await fetch('/api/'+path,{method,headers:data ? {'Content-Type':'application/json'} : {},body:data ? JSON.stringify(data) : undefined})
  const value = await response.json()
  if (!response.ok) throw new Error(value.error)
  return value
}
function open(title, html, wiring) {
  modal.innerHTML = '<div class="modal-title"><h2>'+escape(title)+'</h2><button class="icon-button" aria-label="Close dialog">×</button></div>'+html
  $('.icon-button',modal).onclick = () => dialog.close()
  wiring?.()
  if (!dialog.open) dialog.showModal()
}
function input(name,label,{type='text',required=true,value='',min='',max='',hint=''}={}) {
  return '<label>'+escape(label)+'<input name="'+name+'" type="'+type+'" value="'+escape(value)+'" '+(required?'required ':'')+(min?'min="'+min+'" ':'')+(max?'max="'+max+'" ':'')+(type==='number'?'step="1" ':'')+'>'+ (hint?'<small>'+escape(hint)+'</small>':'')+'</label>'
}
function area(name,label,required=true) {
  return '<label>'+escape(label)+'<textarea name="'+name+'" rows="3" maxlength="1500" '+(required?'required':'')+'></textarea></label>'
}
function select(name,label,options) {
  return '<label>'+escape(label)+'<select name="'+name+'" required>'+options.map(option => {
    const [value,text] = Array.isArray(option)?option:[option,option]
    return '<option value="'+escape(value)+'">'+escape(text)+'</option>'
  }).join('')+'</select></label>'
}
function submitForm(task, complete, root=modal) {
  const form = $('form',root)
  form.onsubmit = async event => {
    event.preventDefault()
    const submit = $('button[type=submit]',form)
    const error = $('.form-error',form)
    submit.disabled = true
    error.textContent = ''
    try {
      await task(Object.fromEntries(new FormData(form)))
      complete()
    } catch (problem) {
      error.textContent = problem.message
    } finally { submit.disabled = false }
  }
}
function formBody(fields, label) { return '<form>'+fields+'<p class="form-error" role="alert"></p>'+button(label,'type="submit"')+'</form>' }
function auth(mode='login', continuation) {
  const creating = mode === 'register'
  const fields = (creating ? input('name','Name') : '')+input('email','Email',{type:'email'})+input('password','Password',{type:'password',hint:creating?'At least eight characters. Hosted accounts require 12.':''})+
    (creating?select('role','Account type',[['devotee','Devotee'],['pandit','Pandit'],['admin','Operations']])+'<div id="staffCode" hidden>'+input('code','Staff registration code',{required:false})+'</div>':'')
  const googleOption = googleSignIn && !creating
    ? '<a class="secondary google-signin" href="/api/login/google?returnTo='+encodeURIComponent(location.hash.slice(1))+'">Sign in with Google</a>'
    : ''
  open(creating?'Create an account':'Sign in',googleOption+formBody(fields,creating?'Create account':'Sign in')+
    '<p>'+button(creating?'Use an existing account':'Create an account','id="authSwap"','text-button')+'</p>',()=>{
      $('#authSwap').onclick = () => auth(creating?'login':'register',continuation)
      if (creating) $('select[name=role]',modal).onchange = e => { $('#staffCode').hidden = e.target.value === 'devotee' }
      submitForm(async values => { ({user}=await api(mode,'POST',values)) },()=>{
        dialog.close()
        render()
        continuation?.()
      })
    })
}
const ritualSummary = item => '<article class="ritual card"><div class="ritual-art '+(['shiva','mangal','river'][catalog.rituals.indexOf(item)%3])+'"><span class="tag">'+escape(item.category)+'</span><span class="ritual-glyph" aria-hidden="true">'+icon(['diya','sun','stars'][catalog.rituals.indexOf(item)%3])+'</span></div><div class="ritual-body"><h3>'+escape(item.name)+'</h3><p class="location">'+icon('pin')+escape(item.place)+'</p>'+(item.description?'<p>'+escape(item.description)+'</p>':'')+'<div class="ritual-action"><span>'+(item.fee===null?'Quote on request':money(item.fee))+'</span>'+link('View pooja','poojas/'+item.id,'secondary')+'</div></div></article>'
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
  const quick = [['poojas','Book a Pooja'],['panchang','Panchang'],['astrology','Kundli & Milan'],['jaap','Jaap Mala'],['library','Ritual Guides'],['consult','Consult an Acharya'],['requests','My Requests'],['mandir','My Mandir'],['temples','Temple Directory'],['chadhava','Chadhava'],['devotional','Devotional Library'],['community','Community'],['store','Store']]
  main.innerHTML = '<div class="welcome"><p>'+icon('pin')+' Ujjain, Madhya Pradesh</p><span>'+new Intl.DateTimeFormat('en-IN',{dateStyle:'full',timeZone:'Asia/Kolkata'}).format(new Date())+'</span></div>'+
    '<section class="hero"><div class="hero-copy"><p class="eyebrow">POOJA ON YOUR BEHALF</p><h1>Bring the sacred<br>closer to home.</h1><p>Request a pooja in Ujjain, follow your Sankalp from anywhere, and receive a complimentary ritual video.</p><div class="actions">'+link('Explore poojas','poojas','primary gold')+link('Plan a visit','library/pilgrimage','hero-link')+'</div></div><div class="hero-image" role="img" aria-label="Illustration of a sandstone temple at dawn"></div></section>'+
    '<div class="benefits"><span>'+icon('check')+' Complimentary ritual video</span><span>'+icon('check')+' Free Prasad</span><span>'+icon('check')+' Delivery within India</span></div>'+
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
function panchang(version,day,city) {
  main.innerHTML = heading('VEDIC CALENDAR','Panchang & festivals','Explore the Hindu calendar and daily timings for your city.')+
    '<section id="daily-panchang"><p role="status">Loading Panchang…</p></section>'+
    '<div class="callout section"><div><h2>Ask a pandit about a date</h2></div>'+button('Request Panchang','data-astrology="Daily Panchang"')+'</div>'
  const target=$('#daily-panchang')
  import('./panchang.js').then(({mountPanchang})=>{
    if (version===renderNumber && target.isConnected) mountPanchang(target,day,city)
  }).catch(()=>{
    if (target.isConnected) target.textContent='Panchang could not load. Reload the page to try again.'
  })
}
function servicePage(kind,subpage,step) {
  const isDaan = kind==='daan'
  const isAstro = kind==='astrology'
  const items = isDaan ? catalog.daan : catalog[isAstro?'astrology':'consult'].map(name=>({name}))
  if (subpage) {
    const item=items.find(entry=>slug(entry.name)===subpage)
    if (!item||(step&&step!=='book')) return missingPage(isDaan?'chadhava':kind,'All services')
    const label=isDaan?'Daan':isAstro?'Astrology':'Consultations'
    const parent=isDaan?'chadhava':kind
    const route=isDaan?'chadhava/daan-'+subpage:kind+'/'+subpage
    const type=isDaan?'daan':isAstro?'astrology':'consultation'
    const summary=isDaan?'Record a pledge for operations to review. The site collects no online donation.':
      isAstro?'Send your details for a Pandit to review. Results appear in My Requests when staff complete the review.':
      'Send a preferred date and format. Operations can confirm the appointment and share a meeting link.'
    const chain=[[isDaan?'Chadhava':label,parent],[item.name,step?route:null]]
    if (step) return bookingPage(chain,item.name,summary,type,item.name)
    main.innerHTML=breadcrumbs(chain)+heading(label,escape(item.name),escape(item.description||summary))+
      '<section class="card info detail-body"><h2>What happens after you submit</h2><p>'+escape(summary)+'</p>'+
      link(isDaan?'Create pledge':'Continue to request',route+'/book')+'</section>'
    return
  }
  main.innerHTML = heading(isDaan?'SACRED GIVING':isAstro?'VEDIC ASTROLOGY':'ACHARYA CONSULTATIONS',isDaan?'Daan & Gau Seva':isAstro?'Astrology':'Request a consultation',
    isDaan?'Choose a cause and submit a pledge for manual fulfillment. This preview collects no donation funds.':isAstro?'Submit details for manual review by a Pandit. Automated charts, scores and transit calculations are unavailable in this preview.':'Choose a topic, consultation format and preferred date. Staff can schedule your request in the operations portal.')+
    '<div class="grid">'+items.map(item=>'<article class="card info"><span class="feature-icon">'+icon(symbols[kind])+'</span><h3>'+escape(item.name)+'</h3>'+
    (item.description?'<p>'+escape(item.description)+'</p>':'')+link('View details',kind+'/'+slug(item.name),'secondary')+'</article>').join('')+'</div>'+(!isDaan&&!isAstro?panditProfiles():'')
}
const prayerTypes = [['mantra','Mantra'],['aarti','Aarti'],['chalisa','Chalisa']]
function libraryTabs(active) {
  const sections=[['all','Ritual guides'],...prayerTypes]
  return '<nav class="tabs" aria-label="Library sections">'+sections.map(([id,label])=>
    '<a href="#library/'+id+'"'+(id===active?' class="selected" aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav>'
}
function prayerLibrary(category, article) {
  const label=prayerTypes.find(([id])=>category===id)[1]
  const entries=(catalog.prayers||[]).filter(item=>item.category===category)
  const path='library/'+category
  if (article) {
    const entry=entries.find(item=>item.id===article)
    if (!entry) return missingPage(path,'All '+label+' entries')
    const text=entry.verses?.length
      ? '<section class="prayer-text" lang="hi" aria-label="Devotional text in Devanagari">'+entry.verses.map(verse=>'<p>'+escape(verse).replaceAll('\n','<br>')+'</p>').join('')+'</section>'
      : ''
    const source=entry.source?'<p><a class="secondary" href="'+escape(entry.source)+'" target="_blank" rel="noopener noreferrer">Read at Sri Mandir ↗</a></p>':''
    main.innerHTML=breadcrumbs([['Library','library'],[label,path],[entry.title]])+
      heading(label,escape(entry.title),escape(entry.summary||''))+
      '<article class="card info detail-body">'+text+source+'</article>'
    return
  }
  main.innerHTML=heading('DEVOTIONAL LIBRARY',label,'')+libraryTabs(category)+
    '<label class="prayer-search">Search '+label+'<input id="prayer-search" type="search" placeholder="Search by title"></label>'+
    '<p id="prayer-count" role="status"></p><div id="prayer-list" class="grid"></div>'
  const search=$('#prayer-search')
  const show=()=>{
    const query=search.value.normalize('NFKC').toLowerCase().trim()
    const matches=entries.filter(item=>[item.title,item.hindi,item.id].filter(Boolean).some(value=>value.normalize('NFKC').toLowerCase().includes(query)))
    $('#prayer-count').textContent=matches.length+' '+(matches.length===1?'entry':'entries')
    $('#prayer-list').innerHTML=matches.length?matches.map(item=>
      '<article class="card info"><h3>'+escape(item.title)+'</h3>'+
      (item.hindi?'<p lang="hi">'+escape(item.hindi)+'</p>':'')+
      link('Read '+label,path+'/'+item.id,'secondary')+'</article>').join(''):'<p>No entries match your search.</p>'
  }
  search.addEventListener('input',show)
  show()
}
function library(subpage,article) {
  if (prayerTypes.some(([id])=>id===subpage)) return prayerLibrary(subpage,article)
  const types = [['all','All guides'],['home','Home puja'],['vrat','Vrat'],['karmkand','Karmkand'],['pilgrimage','Pilgrimage']]
  const category = types.find(([id])=>subpage===id)?.[1] || 'All guides'
  if (article) {
    const guide=catalog.guides.find(item=>slug(item.name)===article&&(category==='All guides'||item.category===category))
    if (!guide) return missingPage('library','All guides')
    main.innerHTML=breadcrumbs([['Ritual library','library'],[category,'library/'+subpage],[guide.name]])+
      heading(escape(guide.category),escape(guide.name),'')+
      '<article class="card info detail-body">'+guideBody(guide)+'</article>'
    wireChecklist(guide,main)
    return
  }
  main.innerHTML = heading('PRACTICE & TRADITION','Library','Read devotional prayers and guides for home puja, vrat, ceremonies and pilgrimage.')+libraryTabs('all')+
    '<nav class="tabs" aria-label="Guide categories">'+types.map(([id,label])=>'<a class="'+(label===category?'selected':'')+'" href="#library/'+id+'">'+label+'</a>').join('')+'</nav><div class="grid">'+catalog.guides
      .filter(g=>category==='All guides'||g.category===category).map(g=>'<article class="card info"><span class="eyebrow">'+g.category+'</span><h3>'+g.name+'</h3><p>'+g.steps[0]+'</p>'+link('Read guide','library/'+(subpage||'all')+'/'+slug(g.name),'secondary')+'</article>').join('')+'</div>'
}
function localRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem('avantika:'+key)) ?? fallback } catch { return fallback }
}
function localWrite(key,value) {
  try { localStorage.setItem('avantika:'+key,JSON.stringify(value)) } catch {}
}
function guideBody(guide) {
  const checked=localRead('guide:'+guide.name,[])
  return (guide.materials.length?'<h2>Samagri checklist</h2><fieldset class="checklist">'+guide.materials.map((item,i)=>
    '<label><input type="checkbox" value="'+i+'" '+(checked.includes(i)?'checked':'')+'>'+escape(item)+'</label>').join('')+'</fieldset>':'')+
    '<h2>Guide</h2><ol class="steps">'+guide.steps.map(step=>'<li>'+escape(step)+'</li>').join('')+'</ol>'
}
function wireChecklist(guide,root) {
  $('.checklist',root)?.addEventListener('change',()=>localWrite('guide:'+guide.name,[...root.querySelectorAll('.checklist :checked')].map(box=>Number(box.value))))
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
function requestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Local Wi-Fi uses HTTP, where randomUUID is unavailable but getRandomValues works.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('')
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-')
}
function requestForm(kind, service, event, inline=false,venue) {
  if (!user) {
    if (inline) { $('#booking-form').innerHTML=button('Sign in to continue','data-auth'); return }
    return auth('login',()=>requestForm(kind,service,event))
  }
  if (user.role!=='devotee') {
    const message='Sign in with a devotee account to submit a request.'
    if (inline) $('#booking-form').textContent=message
    else inform(message)
    return
  }
  const id = requestId()
  const ritual = kind==='pooja' ? catalog.rituals.find(item=>item.id===service) : null
  let fields = (event?'<p>'+escape(event.title+' · '+event.day)+'</p>':'')+input('name','Full name',{value:user.name})
  if (['pooja','chadhava'].includes(kind)) fields+='<div class="pair">'+
    select('participants','Participation',['Individual','Family'])+
    '<div id="family-fields" hidden>'+input('family','Additional family names',{required:false})+'</div></div>'
  if (ritual) fields += select('mode','Booking mode',[['proxy','Pooja on your behalf'],['visit','In-person visit']])+
    '<div class="pair">'+input('date','Preferred date',{type:'date',value:event?.day||today(),min:today()})+select('language','Priest language',['Hindi','English','Sanskrit'])+'</div>'+
    '<div class="pair">'+input('gotra','Gotra',{required:false})+input('nakshatra','Nakshatra',{required:false})+input('rashi','Rashi',{required:false})+'</div>'+
    area('sankalp','Sankalp or intention')+'<div id="delivery-options"><label class="tick"><input name="deliver" type="checkbox"> Send free Prasad to an address in India</label><div id="shipping" hidden>'+input('pincode','Indian PIN code',{required:false})+area('address','Delivery address',false)+'</div></div><div id="quote" class="quote"></div>'
  if (kind==='chadhava') fields += (event?'':select('temple','Temple',devotion.temples.map(temple=>[temple.id,temple.name])))+
    input('gotra','Gotra',{required:false})+area('sankalp','Sankalp or intention')
  if (kind==='store') fields += input('amount','Quantity',{type:'number',min:'1',max:'20',value:'1'})+area('note','Requirements',false)
  if (kind==='daan') fields += input('amount','Pledge amount in INR',{type:'number',min:'1',max:'100000'})+area('note','Note',false)
  if (kind==='consultation') fields += '<div class="pair">'+input('date','Preferred date',{type:'date',value:today(),min:today()})+select('channel','Preferred format',['Chat','Audio','Video'])+'</div>'+area('note','Topic or question',false)
  if (kind==='astrology') {
    const kundli = ['Janam Kundli','Kundli Milan'].includes(service)
    fields += input('city',kundli?'Birth city':'City',{value:kundli?'':'Ujjain'})
    if (kundli) fields += '<div class="pair">'+input('birthDate','Birth date',{type:'date',max:today()})+input('birthTime','Exact local birth time',{type:'time'})+'</div>'
    else fields += input('date','Date',{type:'date',value:today(),min:service==='Shubh Muhurat'?today():''})
    if (service==='Kundli Milan') fields += '<h3>Second birth profile</h3>'+input('secondName','Second person’s name')+input('secondCity','Second birth city')+'<div class="pair">'+input('secondDate','Second birth date',{type:'date',max:today()})+input('secondTime','Second local birth time',{type:'time'})+'</div>'
    fields+=area('note','Context for the Pandit',false)
  }
  if (kind==='support') fields+=input('subject','Subject')+area('note','How can we help?')
  const body=formBody(fields,'Submit request')
  const wire=root=>{
    const participation=$('select[name=participants]',root)
    if (participation) {
      const family=$('#family-fields',root)
      const field=$('input',family)
      participation.onchange=()=>{
        field.required=participation.value==='Family'
        family.hidden=!field.required
        field.disabled=!field.required
      }
      participation.onchange()
    }
    if (event&&ritual) $('input[name=date]',root).readOnly=true
    if (ritual) {
      const mode = $('select[name=mode]',root)
      const delivery = $('input[name=deliver]',root)
      const updateQuote = () => {
        const proxy = mode.value==='proxy'
        const ship = proxy && delivery.checked
        $('#delivery-options',root).hidden = !proxy
        $('#shipping',root).hidden = !ship
        $('input[name=pincode]',root).required = ship
        $('textarea[name=address]',root).required = ship
        const fee = ritual.fee
        const line = (label,value)=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>'
        $('#quote',root).innerHTML = line('Ritual fee',fee===null?'Quote on request':money(fee))+
          (proxy?line('Ritual video','Free')+line('Prasad',ship?'Free':'Not requested'):'')+line('Delivery estimate',money(ship?99:0))+
          line('Estimated total',fee===null?'Quote on request':money(fee+(ship?99:0)))+'<p>Prices are preview estimates. No payment is collected. Staff confirm the venue, availability and delivery.</p>'
      }
      mode.onchange = delivery.onchange = updateQuote
      updateQuote()
    }
    submitForm(values=>api('requests','POST',{id,kind,service,...values,campaign:event?.id,venue:venue?.id,deliver:values.deliver==='on',amount:Number(values.amount)}),()=>{
      if (!inline) dialog.close()
      inform('Request submitted. Reference '+short(id)+'.')
      location.hash='requests/'+id
    },root)
  }
  if (inline) { const root=$('#booking-form'); root.innerHTML=body; wire(root) }
  else open(ritual?.name || service || 'Contact support',body,()=>wire(modal))
}
const detailLabels = {event:'Temple event',temple:'Temple',quantity:'Quantity',name:'Devotee',mode:'Mode',date:'Requested date',gotra:'Gotra',family:'Family members',participants:'Participation',nakshatra:'Nakshatra',rashi:'Rashi',sankalp:'Sankalp',language:'Priest language',pincode:'PIN code',address:'Address',fee:'Ritual estimate',delivery:'Delivery estimate',total:'Total estimate',amount:'Pledged amount',note:'Note',channel:'Format',city:'City',birthDate:'Birth date',birthTime:'Birth time',secondName:'Second name',secondCity:'Second city',secondDate:'Second birth date',secondTime:'Second birth time',confirmedDate:'Confirmed date',confirmedTime:'Confirmed time (IST)',awb:'Courier AWB',result:'Staff response'}
const isClosed = row => ['Cancelled','Delivered','Completed','Resolved'].includes(row.status) || row.status==='Video ready'&&!row.details.deliver
const actions = {
  pooja:{Requested:'Assign',Assigned:'Confirm Muhurat','Muhurat confirmed':'Start ritual','Ritual in progress':'Record ritual completion','Video ready':'Mark Prasad packed','Prasad packed':'Record dispatch',Dispatched:'Mark delivered'},
  chadhava:{Requested:'Assign',Assigned:'Record offering and proof'},
  store:{Requested:'Assign',Assigned:'Record availability or quote'},
  daan:{Requested:'Assign',Assigned:'Record fulfillment'},
  consultation:{Requested:'Assign',Assigned:'Schedule session',Scheduled:'Record session outcome'},
  astrology:{Requested:'Assign',Assigned:'Share reviewed result'},
  support:{Requested:'Resolve ticket'}
}
function requestCard(row,expanded=false) {
  const {details} = row
  const entries = Object.entries(detailLabels).filter(([key])=>typeof details[key]==='number'||details[key])
  const staff = user.role!=='devotee'
  const actionable = !isClosed(row)&&staff&&(user.role==='admin'||!['Video ready','Prasad packed','Dispatched'].includes(row.status))
  const cancellable = !isClosed(row)&&(user.role==='admin'||user.role==='devotee'&&row.status==='Requested')
  const action = row.status==='Requested'&&user.role==='pandit'?'Claim request':actions[row.kind][row.status]
  const formatValue = (key,value) => ['fee','delivery','total','amount'].includes(key)?money(value):key==='mode'?(value==='proxy'?'Pooja on your behalf':'In-person visit'):value
  return '<article class="card request"><div class="section-top"><div><p class="eyebrow">'+names[row.kind]+' · '+short(row.id)+'</p><h3>'+escape(row.title)+'</h3></div><span class="pill">'+row.status+'</span></div>'+
    '<p>Submitted '+formatDate(row.created)+'</p><details '+(expanded?'open':'')+'><summary>Request details and timeline</summary><dl>'+entries.map(([key,label])=>'<dt>'+label+'</dt><dd>'+escape(formatValue(key,details[key]))+'</dd>').join('')+'</dl><ol class="steps">'+row.history.map(event=>'<li>'+escape(event.status)+' <small>'+formatDate(event.date)+'</small></li>').join('')+'</ol></details>'+
    '<div class="actions">'+(expanded?'':link('Open request','requests/'+row.id,'secondary'))+[['video','Watch ritual video'],['tracking','Track Prasad'],['proof','Open supporting material'],['meeting','Join consultation']].filter(([key])=>details[key]).map(([key,label])=>'<a class="secondary" href="'+escape(details[key])+'" target="_blank" rel="noopener noreferrer">'+label+'</a>').join('')+
    (actionable?button(action,'data-transition="'+row.id+'"'):'')+(cancellable?button('Cancel request','data-cancel="'+row.id+'"','secondary'):'')+'</div></article>'
}
let queue = []
let staff = []
let renderNumber = 0
async function requests(version,id) {
  if (!user) {
    main.innerHTML=heading('YOUR ACCOUNT','My requests','Sign in to track poojas, pledges, consultations and support requests.')+button('Sign in','data-auth')
    return
  }
  const isStaff = user.role!=='devotee'
  main.innerHTML = heading('REQUEST TRACKING',isStaff?(user.role==='admin'?'Operations dashboard':'Pandit dashboard'):'My requests',
    isStaff?'Review the queue and record each step of fulfillment.':'Follow the status of your requests and open results when they are available.')+'<p>Loading requests…</p>'
  try {
    const data=await api('requests')
    if (renderNumber!==version) return
    queue=data.requests
    staff=data.staff
    if (id) {
      const row=queue.find(item=>item.id===id)
      if (!row) return missingPage('requests','All requests')
      main.innerHTML=breadcrumbs([['My requests','requests'],[short(row.id)]])+heading('REQUEST TRACKING',escape(row.title),'Reference '+short(row.id))+
        '<div class="detail-body">'+requestCard(row,true)+'</div>'
      return
    }
    main.lastElementChild.outerHTML = queue.length ? '<div class="request-grid">'+queue.map(row=>requestCard(row)).join('')+'</div>' : '<div class="card info"><p>No requests yet.</p>'+(isStaff?'':link('Explore poojas','poojas'))+'</div>'
  } catch (e) { if (renderNumber===version) main.lastElementChild.textContent=e.message }
}
function changeRequest(id,cancel) {
  const row=queue.find(item=>item.id===id)
  let fields=''
  if (cancel) fields='<p>Cancel this request? Its status and history will remain visible.</p>'
  else if (row.status==='Requested'&&row.kind!=='support'&&user.role==='admin') {
    if (!staff.length) return inform('Create a Pandit account before assigning requests.')
    fields=select('assignee','Assign to Pandit',staff.map(item=>[item.id,item.name]))
  } else if (row.status==='Assigned'&&['pooja','consultation'].includes(row.kind)) {
    fields='<div class="pair">'+input('confirmedDate','Confirmed date',{type:'date',value:row.details.date>=today()?row.details.date:today(),min:today()})+input('confirmedTime','Confirmed time (IST)',{type:'time'})+'</div>'+(row.kind==='consultation'?input('meeting','HTTPS meeting link',{type:'url',required:false}):'')
  } else if (row.status==='Ritual in progress'&&row.details.mode==='proxy') {
    fields=input('video','Private HTTPS link to complimentary video',{type:'url'})
  } else if (row.status==='Prasad packed') {
    fields=input('AWB','Courier AWB number')+input('tracking','HTTPS courier tracking link',{type:'url'})
  } else if (row.kind!=='pooja'&&!(row.status==='Requested'&&row.kind!=='support')) {
    fields=area('result','Outcome or response')+input('proof','HTTPS evidence or report link',{type:'url',required:false})
  } else fields='<p>Record this step for '+escape(row.title)+'.</p>'
  open(cancel?'Cancel request':row.title,formBody(fields,cancel?'Confirm cancellation':'Save update'),()=>{
    submitForm(values=>api('requests/'+id,'PATCH',{expected:row.status,action:cancel?'cancel':'advance',...values}),()=>{
      dialog.close()
      inform('Request updated.')
      render()
    })
  })
}
function support() {
  main.innerHTML=heading('HELP DESK','Help and support','Send a question about a ritual, video, delivery or booking. Include your request reference when available.')+button('Create support request','data-support')
}
function account() {
  if (!user) return auth()
  open(user.name,'<p>'+escape(user.email)+'</p><div class="actions">'+link(user.role==='devotee'?'My requests':'Open dashboard','requests')+button('Sign out','id="signout"','secondary')+'</div>',()=>{
    $('a',modal).onclick=()=>{dialog.close()}
    $('#signout').onclick=async()=>{try{await api('logout','POST');user=null;dialog.close();render()}catch(e){inform(e.message)}}
  })
}
let devotion
const devotionTitles = {darshan:'Darshan',audio:'Devotional audio',reading:'Readings',panchang:'Panchang notes',horoscope:'Horoscope',event:'Upcoming observances'}
const devotionPages = {
  mandir:['My Mandir','Choose a deity and keep a private record of your virtual offerings.'],
  temples:['Explore temples across India','Find temples by state, city or deity. Read their stories and see related poojas.'],
  chadhava:['Chadhava','Request an offering in your name. Operations confirms availability and records fulfillment.'],
  devotional:['Devotional library','Read guides and explore darshan, devotional audio and dated updates published by operations.'],
  community:['Community','Share a devotional reflection. Operations reviews each post before it is public.'],
  store:['Devotional store','Request availability and a quote for devotional essentials. Payment is handled outside this service.']
}
function contentCard(item) {
  const mediaPath=item.url?new URL(item.url).pathname:''
  const audio=item.category==='audio'&&/\.(mp3|m4a|ogg|wav)$/i.test(mediaPath)
  const video=item.category==='darshan'&&/\.(mp4|webm)$/i.test(mediaPath)
  const player=audio?'audio':video?'video':''
  const temple=devotion.temples.find(entry=>entry.id===item.temple)
  return '<article class="card info"><h3>'+escape(item.title)+'</h3>'+
    (item.day||temple?'<p class="eyebrow">'+escape([item.day,temple?.name].filter(Boolean).join(' · '))+'</p>':'')+
    '<p class="preserve-text">'+escape(item.text)+'</p>'+
    (player?'<'+player+' class="devotional-player" controls preload="none" src="'+escape(item.url)+'"></'+player+'>':'')+
    (item.url?'<a class="secondary" href="'+escape(item.url)+'" target="_blank" rel="noopener noreferrer">Open '+escape(devotionTitles[item.category].toLowerCase())+'</a>':'')+'</article>'
}
function chooseMandir(model) {
  const choices = devotion.deities.includes(model.deity)
    ? [model.deity,...devotion.deities.filter(item=>item!==model.deity)] : devotion.deities
  open('Choose a deity',formBody(select('deity','Deity',choices),'Save mandir'),()=>{
    submitForm(values=>api('mandir','PUT',values),()=>{dialog.close();render()})
  })
}
function mandirPanel(model) {
  return '<section class="card info"><h2>'+escape(model.deity||'Set up your mandir')+'</h2>'+
    button(model.deity?'Change deity':'Choose a deity','id="chooseMandir"','secondary')+
    (model.deity?'<div class="actions">'+devotion.offerings.map((item,i)=>button('Offer '+item,'data-offering="'+i+'"')).join('')+'</div>':'')+'</section>'+
    (model.activity.length?'<section class="section"><h2>Offering history</h2><ul>'+model.activity.map(item=>'<li>'+escape(item.day)+' · '+escape(item.offering)+' × '+escape(item.total)+'</li>').join('')+'</ul></section>':'')
}
function publishContent() {
  open('Publish devotional content',formBody(select('category','Category',devotion.sections.map(item=>[item,devotionTitles[item]]))+
    input('title','Title')+area('text','Description or entry')+input('url','HTTPS media or source link',{type:'url',required:false})+
    input('day','Date',{type:'date',required:false})+select('temple','Temple',[['','General'],...devotion.temples.map(item=>[item.id,item.name])]).replace(' required',''),
    'Publish'),()=>submitForm(values=>api('devotional/content','POST',values),()=>{dialog.close();inform('Entry published.');render()}))
}
function submitCommunity() {
  if (!user) return auth('login',submitCommunity)
  open('Write a reflection',formBody(input('title','Title')+area('text','Reflection'),'Submit for review'),
    ()=>submitForm(values=>api('community','POST',values),()=>{dialog.close();inform('Submitted for review.');render()}))
}
async function moderate(id,state,target) {
  target.disabled=true
  try { await api('community/'+id,'PATCH',{state});render() }
  catch(error){ inform(error.message);target.disabled=false }
}
function externalTempleLink(label,url) {
  return '<a class="breadcrumb-link" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+escape(label)+'</a>'
}
function templePhoto(temple,detail=false) {
  if (!temple.photo) return detail?'<p class="card info">A verified photograph is not available for this listing.</p>':''
  const photo=temple.photo
  return '<figure class="temple-photo"><img src="'+escape(photo.url)+'" alt="'+escape(temple.name)+'" loading="lazy" width="480" height="320">'+
    (detail?'<figcaption>'+externalTempleLink('Photo source',photo.source)+(photo.credit?' · '+escape(photo.credit):'')+
      (photo.licenseUrl?' · '+externalTempleLink(photo.license,photo.licenseUrl):' · '+escape(photo.license))+'</figcaption>':'')+'</figure>'
}
async function devotionalPage(page,version,subpage,step) {
  const [title,description]=page==='chadhava'?['Chadhava','Request a temple offering in your name or pledge support for Gau Seva and other causes.']:devotionPages[page]
  main.innerHTML=heading('AVANTIKA',title,description)+'<p id="devotion-content">Loading…</p>'
  try {
    const result=await api('devotional')
    const panel=page==='community'?await api('community'):page==='mandir'&&user?await api('mandir'):null
    if (version!==renderNumber) return
    devotion=result
    const target=$('#devotion-content')
    const grid=html=>'<div class="grid">'+html+'</div>'
    if (page==='mandir') {
      target.outerHTML=panel?mandirPanel(panel):button('Sign in to set up your mandir','data-auth')
      if (!panel) return
      $('#chooseMandir').onclick=()=>chooseMandir(panel)
      for (const control of main.querySelectorAll('[data-offering]')) control.onclick=async()=>{
        control.disabled=true
        try { await api('mandir','POST',{offering:devotion.offerings[Number(control.dataset.offering)]});inform('Offering saved.');render() }
        catch(error){inform(error.message);control.disabled=false}
      }
    } else if (page==='temples') {
      if (subpage) {
        const temple=devotion.temples.find(item=>item.id===subpage)
        const media=temple?devotion.content.filter(item=>item.temple===temple.id):[]
        const ritual=temple?.rituals.includes(step)?catalog.rituals.find(item=>item.id===step):null
        if (!temple||(step&&!ritual&&!['darshan','events','poojas'].includes(step))) return missingPage('temples','All temples')
        const route='temples/'+temple.id
        const chain=[['Temples','temples'],[temple.name,step?route:null]]
        if (ritual) return bookingPage([...chain,['Poojas',route+'/poojas']],ritual.name,'Request '+ritual.name+' at '+temple.name+'. Operations will confirm arrangements.','pooja',ritual.id,null,temple)
        if (step==='events') {
          const {events}=await api('events')
          if (version!==renderNumber) return
          const available=events.filter(event=>event.temple===temple.id&&event.active&&event.day>=today())
          main.innerHTML=breadcrumbs([...chain,['Events']])+heading('TEMPLE EVENTS',escape(temple.name),'Upcoming events at this temple.')+
            (available.length?grid(available.map(event=>'<article class="card info"><h3>'+escape(event.title)+'</h3><p>'+escape(event.day)+'</p>'+
              link('View event','events/'+event.id,'secondary')+'</article>').join('')):'<p>No events are scheduled here yet.</p>')
          return
        }
        if (step==='poojas') {
          const rituals=catalog.rituals.filter(item=>temple.rituals.includes(item.id))
          main.innerHTML=breadcrumbs([...chain,['Poojas']])+heading('TEMPLE POOJAS',escape(temple.name),'Request a listed pooja for this temple. Operations confirms availability.')+
            (rituals.length?grid(rituals.map(item=>'<article class="card info"><h3>'+escape(item.name)+'</h3><p>'+escape(item.description)+'</p>'+
              link('Request pooja',route+'/'+item.id,'secondary')+'</article>').join('')):'<p>No poojas are listed for this temple yet.</p>')
          return
        }
        main.innerHTML=breadcrumbs(step?[...chain,['Darshan']]:chain)+heading(escape(temple.city+' · '+temple.state),
          escape(step?'Darshan at '+temple.name:temple.name),'')+
          (step?'<section class="section"><h2>Darshan and readings</h2>'+
            (media.length?grid(media.map(contentCard).join('')):'<p>Temple media will appear here when operations publishes it.</p>')+'</section>':
            '<div class="temple-detail">'+templePhoto(temple,true)+'<section class="card info"><p class="eyebrow">'+escape(temple.deity)+'</p><h2>Story and significance</h2>'+
            '<p>'+escape(temple.description)+'</p>'+(temple.practices.length?'<h3>Traditions and observances</h3><ul>'+
            temple.practices.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>':'')+(temple.address?'<h3>Address</h3><p>'+escape(temple.address)+'</p>':'')+
            '<div class="actions">'+(temple.rituals.length?link('Temple poojas',route+'/poojas'):'')+link('Darshan and readings',route+'/darshan','secondary')+
            link('Temple events',route+'/events','secondary')+'</div>'+
            '<div class="actions">'+(temple.guide?'<span>Source: Madhya Pradesh temple guide</span>':'')+
            (temple.directorySource?externalTempleLink('Sri Mandir listing',temple.directorySource):'')+
            (temple.reference?externalTempleLink('Official reference',temple.reference):temple.wiki?externalTempleLink('Temple reference','https://en.wikipedia.org/wiki/'+encodeURIComponent(temple.wiki.replaceAll(' ','_'))):'')+'</div></section></div>')
      } else {
        const states=[...new Set(devotion.temples.map(item=>item.state))].sort()
        target.outerHTML='<div class="filters"><label>Search temples<input id="temple-search" placeholder="Name, city or deity"></label>'+
          select('templeState','State or territory',[['','All states'],...states])+'</div><p id="temple-count" role="status"></p><div class="grid" id="temple-grid"></div>'
        const filter=()=>{
          const query=$('#temple-search').value.trim().toLowerCase()
          const state=$('select[name=templeState]').value
          const shown=devotion.temples.filter(item=>(!state||item.state===state)&&[item.name,item.city,item.deity,item.state].some(value=>value.toLowerCase().includes(query)))
          $('#temple-count').textContent=shown.length+' '+(shown.length===1?'place':'places')
          $('#temple-grid').innerHTML=shown.map(item=>
            '<article class="card temple-card">'+templePhoto(item)+'<div class="info"><h3>'+escape(item.name)+'</h3><p class="eyebrow">'+escape(item.city+' · '+item.state)+'</p>'+
            '<p>'+escape(item.description)+'</p><div class="actions">'+link('View temple','temples/'+item.id,'secondary')+
            (item.rituals.length?link('Temple poojas','temples/'+item.id+'/poojas','secondary'):'')+'</div></div></article>').join('')||'<p>No temples match.</p>'
        }
        $('#temple-search').oninput=$('select[name=templeState]').onchange=filter
        filter()
      }
    } else if (page==='chadhava') {
      if (subpage?.startsWith('daan-')) return servicePage('daan',subpage.slice(5),step)
      if (subpage) return offeringDetail(subpage,step)
      const {events}=await api('events')
      if (version!==renderNumber) return
      const scheduled=events.filter(event=>event.kind==='chadhava'&&event.active&&event.day>=today())
      const headingLinks='<nav class="tabs" aria-label="Giving sections">'+
        [['offerings','Temple offerings'],['daan','Daan & Gau Seva'],['how','How it works']].map(([id,label])=>button(label,'data-giving-section="'+id+'"','secondary')).join('')+'</nav>'
      const card=(item,path,label)=>'<article class="card info"><h3>'+escape(item.name)+'</h3><p>'+escape(item.description)+'</p>'+link(label,path,'secondary')+'</article>'
      target.outerHTML=headingLinks+
        '<section id="giving-offerings" class="section"><h2>Upcoming temple offerings</h2>'+
        (scheduled.length?grid(scheduled.map(event=>{
          const temple=devotion.temples.find(item=>item.id===event.temple)
          return card({name:event.title,description:[event.day,temple?.name,event.description].filter(Boolean).join(' · ')},'events/'+event.id,'View event')
        }).join('')):'<p>No dated offerings are scheduled. You can still request an offering below.</p>')+
        '<h2 class="section">Request a temple offering</h2>'+grid(devotion.chadhava.map(item=>card(item,'chadhava/'+item.id,'View offering')).join(''))+'</section>'+
        '<section id="giving-daan" class="section"><h2>Daan & Gau Seva</h2><p>Choose a cause and record a pledge for Operations to review.</p>'+
        grid(catalog.daan.map(item=>card(item,'chadhava/daan-'+slug(item.name),'View cause')).join(''))+'</section>'+
        '<section id="giving-how" class="section detail-body"><h2>How it works</h2><ol class="steps"><li>Choose an offering, event, or cause.</li>'+
        '<li>Add the participant names and Sankalp for a temple offering, or enter a pledge amount for Daan.</li>'+
        '<li>Follow staff review, fulfillment updates and any evidence in My Requests.</li></ol>'+
        '<div class="actions">'+link('My requests','requests')+link('Get help','support','secondary')+'</div>'+
        '<h2 class="section">Common questions</h2><details><summary>Can I include my family?</summary><p>Yes. Choose Family on a temple offering and add the additional names.</p></details>'+
        '<details><summary>Where will I see fulfillment evidence?</summary><p>Open the request in your account. Staff can attach a supporting link after fulfillment.</p></details>'+
        '<details><summary>Can I pay or donate online?</summary><p>This page records offering requests and Daan pledges. Operations handles payment separately.</p></details></section>'
      for (const control of main.querySelectorAll('[data-giving-section]')) control.onclick=()=>document.getElementById('giving-'+control.dataset.givingSection)?.scrollIntoView()
    } else if (page==='community') {
      target.outerHTML=button('Share a reflection','data-community-post')+'<div class="grid section">'+(panel.posts.map(post=>
        '<article class="card info"><h3>'+escape(post.title)+'</h3><p class="eyebrow">'+escape(post.author+' · '+post.state)+'</p><p class="preserve-text">'+escape(post.text)+'</p>'+
        (user?.role==='admin'?'<div class="actions">'+(post.state!=='Published'?button('Publish','data-moderate="'+post.id+'" data-state="Published"'):'')+
        (post.state!=='Hidden'?button('Hide','data-moderate="'+post.id+'" data-state="Hidden"','secondary'):'')+'</div>':'')+'</article>').join('')||'<p>No reflections have been published yet.</p>')+'</div>'
    } else {
      target.outerHTML=(user?.role==='admin'?button('Publish content','data-publish-content'):'')+
        devotion.sections.map(section=>{
          const entries=devotion.content.filter(item=>item.category===section)
          return '<section class="section"><h2>'+devotionTitles[section]+'</h2>'+
            (entries.length?grid(entries.map(contentCard).join('')):'<p>No entries published yet.</p>')+'</section>'
        }).join('')
    }
  } catch(error) {
    if (version===renderNumber) $('#devotion-content').textContent=error.message
  }
}
function productForm(product={}) {
  open(product.id?'Edit product':'Add product',formBody(
    input('id','Product ID',{value:product.id||'',hint:'Lowercase letters, numbers and hyphens.'})+
    input('name','Name',{value:product.name||''})+input('description','Description',{value:product.description||''})+
    input('price','Price in INR',{type:'number',min:'1',max:'100000',value:product.price||''})+
    input('stock','Quantity in stock',{type:'number',min:'0',max:'100000',value:product.stock??''})+
    '<label class="tick"><input type="checkbox" name="active" '+(product.active?'checked':'')+'> Publish listing</label>',
    'Save product'),()=> {
      if (product.id) $('input[name=id]',modal).readOnly=true
      submitForm(values=>api('shop/products','PUT',{...values,price:Number(values.price),stock:Number(values.stock),active:values.active==='on'}),
        ()=>{dialog.close();render()})
    })
}
function quantityForm(product) {
  open(product.name,formBody(input('quantity','Quantity',{type:'number',min:'0',max:String(Math.min(20,product.stock)),value:product.quantity??1,hint:'Use 0 to remove this product.'}),'Save to cart'),()=>{
    submitForm(values=>api('shop/cart','PUT',{product:product.id,quantity:Number(values.quantity)}),()=>{
      dialog.close();inform('Cart updated.');render()
    })
  })
}
function checkout(total,root) {
  const id=requestId()
  root.innerHTML=formBody(input('name','Recipient name',{value:user.name})+
    area('address','Indian delivery address')+input('pin','PIN code')+
    '<div class="quote"><strong>Items '+money(total)+'</strong><p>Operations confirms delivery and any charges. Payment is arranged separately.</p></div>','Submit order')
  submitForm(values=>api('shop/orders','POST',{id,total,...values}),()=>{
    inform('Order submitted.');location.hash='orders/'+id
  },root)
}
function orderAction(order,action) {
  const dispatch=order.status==='Confirmed'&&action==='advance'
  open(action==='cancel'?'Cancel order':'Update order',
    formBody(dispatch?input('tracking','HTTPS courier tracking link',{type:'url'}):'<p>Confirm this order update.</p>','Confirm'),
    ()=>submitForm(values=>api('shop/orders/'+order.id,'PATCH',{expected:order.status,action,...values}),()=>{dialog.close();render()}))
}
async function shop(page,version,subpage) {
  const labels={store:['Devotional store','Browse available products or ask about devotional essentials.'],
    cart:['Cart','Review quantities and submit an Indian delivery address.'],orders:['Store orders','Follow confirmation, dispatch and delivery.']}
  main.innerHTML=heading('AVANTIKA STORE',...labels[page])+'<p id="shop-panel">Loading…</p>'
  try {
    const path=page==='store'?'products':page
    if (!user&&page!=='store') {
      $('#shop-panel').outerHTML=button('Sign in','data-auth')
      return
    }
    const result=await api('shop/'+path)
    if (page==='store') devotion=await api('devotional')
    if (version!==renderNumber) return
    const panel=$('#shop-panel')
    if (page==='store') {
      if (subpage) return productDetail(result.products.find(item=>item.id===subpage))
      const amount=item=>item.stock>0?money(item.price)+' · '+item.stock+' in stock':money(item.price)+' · Out of stock'
      panel.outerHTML='<div class="actions">'+
        (user?.role==='admin'?button('Add product','id="add-product"')+link('Orders','orders','secondary'):
          link('View cart','cart','secondary')+link('My orders','orders','secondary'))+'</div>'+
        (result.products.length?'<div class="filters section">'+input('productQuery','Search products')+
          select('productSort','Sort by',[['name','Name'],['low','Price low to high'],['high','Price high to low']])+
          '<label class="tick"><input type="checkbox" id="only-stock"> In stock</label></div>':'<p>No products are listed for direct order yet.</p>')+
        '<div class="grid section" id="product-grid">'+result.products.map((item,index)=>'<article class="card info" data-listing="'+index+'"><h3>'+escape(item.name)+'</h3><p>'+escape(item.description)+'</p><p>'+
          escape(amount(item)+(item.active?'':' · Unpublished'))+'</p>'+
          (user?.role==='admin'?button('Edit product','data-product="'+index+'"','secondary'):
            link('View product','store/'+item.id,'secondary'))+'</article>').join('')+'</div>'+
        '<section class="section"><h2>Request a quote</h2><div class="grid">'+devotion.store.map(item=>
          '<article class="card info"><h3>'+escape(item.name)+'</h3><p>'+escape(item.description)+'</p>'+
          button('Request quote','data-store="'+escape(item.id)+'"','secondary')+'</article>').join('')+'</div></section>'
      if (result.products.length) {
        const filter=$('input[name=productQuery]')
        const sort=$('select[name=productSort]')
        const inStock=$('#only-stock')
        const grid=$('#product-grid')
        const cards=[...grid.children]
        const update=()=>{
          const query=filter.value.trim().toLowerCase()
          const order=[...cards].sort((left,right)=>{
            const a=result.products[Number(left.dataset.listing)], b=result.products[Number(right.dataset.listing)]
            return sort.value==='low'?a.price-b.price:sort.value==='high'?b.price-a.price:a.name.localeCompare(b.name)
          })
          for (const card of order) {
            const item=result.products[Number(card.dataset.listing)]
            card.hidden=!([item.name,item.description].some(value=>value.toLowerCase().includes(query))&&(!inStock.checked||item.stock>0))
            grid.append(card)
          }
        }
        filter.oninput=sort.onchange=inStock.onchange=update
      }
      if (user?.role==='admin') $('#add-product').onclick=()=>productForm()
      for (const control of main.querySelectorAll('[data-product]')) control.onclick=()=>{
        const product=result.products[Number(control.dataset.product)]
        if (user?.role==='admin') productForm(product)
        else if (user) quantityForm(product)
        else auth('login',()=>quantityForm(product))
      }
    } else if (page==='cart') {
      const total=result.items.reduce((sum,row)=>sum+row.price*row.quantity,0)
      const ready=result.items.length>0&&result.items.every(row=>row.active&&row.stock>=row.quantity)
      if (subpage==='checkout') {
        main.innerHTML=breadcrumbs([['Store','store'],['Cart','cart'],['Checkout']])+heading('AVANTIKA STORE','Checkout','Review your cart and provide an Indian delivery address.')+
          '<section class="card info detail-body"><ul>'+result.items.map(item=>'<li>'+escape(item.name)+' × '+item.quantity+'</li>').join('')+'</ul>'+
          (ready?'<div id="checkout-form"></div>':'<p>Update your cart before submitting an order.</p>'+link('Back to cart','cart','secondary'))+'</section>'
        if (ready) checkout(total,$('#checkout-form'))
        return
      }
      panel.outerHTML='<div class="grid">'+result.items.map((item,i)=>
        '<article class="info card"><h3>'+escape(item.name)+'</h3><p>'+item.quantity+' × '+money(item.price)+'</p>'+
        (!item.active||item.stock<item.quantity?'<p>Requested quantity unavailable.</p>':'')+
        button('Edit quantity','data-cart-item="'+i+'"','secondary')+'</article>').join('')+'</div>'+
        (!result.items.length?'<p>Your cart is empty.</p>':'<p>Items total '+money(total)+'</p>')+
        (ready?link('Checkout','cart/checkout'):link('Browse store','store','secondary'))
      for (const control of main.querySelectorAll('[data-cart-item]')) control.onclick=()=>quantityForm(result.items[Number(control.dataset.cartItem)])
    } else {
      const orders=subpage?result.orders.filter(order=>order.id===subpage):result.orders
      if (subpage&&!orders.length) return missingPage('orders','All store orders')
      panel.outerHTML=(subpage?breadcrumbs([['Store','store'],['Orders','orders'],[short(subpage)]]):'')+
        '<div class="grid section">'+orders.map((order,i)=>{
        const cancel=['Submitted','Confirmed'].includes(order.status)
        const advance=user.role==='admin'&&['Submitted','Confirmed','Dispatched'].includes(order.status)
        return '<article class="info card"><h3>'+short(order.id)+' · '+escape(order.status)+'</h3><p>'+escape(order.name)+' · '+money(order.total)+'</p><p>'+escape(order.address)+' · '+escape(order.pin)+'</p><ul>'+
          order.items.map(item=>'<li>'+escape(item.name)+' × '+item.quantity+'</li>').join('')+'</ul><div class="actions">'+
          (subpage?'':link('Open order','orders/'+order.id,'secondary'))+(advance?button({Submitted:'Confirm order',Confirmed:'Record dispatch',Dispatched:'Mark delivered'}[order.status],'data-order="'+i+'" data-action="advance"'):'')+
          (cancel?button('Cancel order','data-order="'+i+'" data-action="cancel"','secondary'):'')+
          (order.tracking?'<a class="secondary" href="'+escape(order.tracking)+'" target="_blank" rel="noopener noreferrer">Track delivery</a>':'')+'</div></article>'
      }).join('')+'</div>'+(result.orders.length?'':'<p>No store orders yet.</p>')
      for (const control of main.querySelectorAll('[data-order]')) control.onclick=()=>orderAction(orders[Number(control.dataset.order)],control.dataset.action)
    }
  } catch(error) {
    if (version===renderNumber) $('#shop-panel').textContent=error.message
  }
}

function publishEvent() {
  const choices=kind=>kind==='pooja'?catalog.rituals:devotion.chadhava
  const options=kind=>select('service','Ritual',choices(kind).map(x=>[x.id,x.name]))
  open('Publish a temple event',formBody(input('title','Event name')+area('description','Description')+
    select('kind','Service',[['pooja','Pooja'],['chadhava','Chadhava']])+'<div id="ritual-option">'+options('pooja')+'</div>'+
    select('temple','Temple',devotion.temples.map(x=>[x.id,x.name]))+input('day','Event date',{type:'date',value:today(),min:today()}),'Publish'),()=>{
      $('select[name=kind]',modal).onchange=event=>{$('#ritual-option',modal).innerHTML=options(event.target.value)}
      submitForm(values=>api('events','POST',values),()=>{dialog.close();render()})
    })
}
async function ritualEvents(version,subpage,step) {
  main.innerHTML=heading('TEMPLE SERVICES','Upcoming temple events','Find dated pujas and Chadhava published by operations.')+'<p id="events-panel">Loading…</p>'
  try {
    const [data,details]=await Promise.all([api('events'),api('devotional')])
    if (version!==renderNumber) return
    devotion=details
    if (subpage) return eventDetail(data.events.find(event=>event.id===subpage),step)
    $('#events-panel').outerHTML=(user?.role==='admin'?button('Publish event','id="publish-event"'):'')+
      '<div class="grid section">'+data.events.map((event,i)=>{
        const temple=devotion.temples.find(x=>x.id===event.temple)
        return '<article class="info card"><h3>'+escape(event.title)+'</h3><p class="eyebrow">'+escape(event.day+' · '+(temple?.name||''))+'</p>'+
          '<p>'+escape(event.description)+'</p>'+
          (user?.role==='admin'?button(event.active?'Unpublish':'Republish','data-event="'+i+'"','secondary'):
            link('View event','events/'+event.id,'secondary'))+'</article>'
      }).join('')+'</div>'+(data.events.length?'':'<p>No temple events are scheduled yet.</p>')
    if (user?.role==='admin') $('#publish-event').onclick=publishEvent
    for (const control of main.querySelectorAll('[data-event]')) control.onclick=async()=>{
      const event=data.events[Number(control.dataset.event)]
      if (user?.role!=='admin') return requestForm(event.kind,event.service,event)
      control.disabled=true
      try {await api('events/'+event.id,'PATCH',{active:!event.active});render()}
      catch(error){inform(error.message);control.disabled=false}
    }
  } catch(error) {
    if (version===renderNumber) $('#events-panel').textContent=error.message
  }
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}
function breadcrumbs(items) {
  return '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>'+items.map(([label,path])=>
    '<li>'+(path?link(escape(label),path,'breadcrumb-link'):'<span aria-current="page">'+escape(label)+'</span>')+'</li>').join('')+'</ol></nav>'
}
function missingPage(path,label) {
  main.innerHTML=heading('AVANTIKA','Page unavailable','This item may have moved or been taken off the listing.')+link(label,path,'secondary')
}
function bookingPage(crumbs,title,summary,kind,service,event,venue) {
  main.innerHTML=breadcrumbs([...crumbs,['Request']])+heading('SERVICE REQUEST',escape(title),escape(summary))+
    '<section id="booking-form" class="card info detail-body"></section>'
  requestForm(kind,service,event,true,venue)
}
function ritualDetail(id,step) {
  const ritual=catalog.rituals.find(item=>item.id===id)
  if (!ritual||(step&&step!=='book')) return missingPage('poojas','All poojas')
  const route='poojas/'+ritual.id
  const chain=[['Poojas','poojas'],[ritual.name,step?route:null]]
  if (step) return bookingPage(chain,'Request '+ritual.name,'Choose a preferred date and tell the Pandit Ji whose name and intention to include.','pooja',ritual.id)
  const fee=ritual.fee===null?'Quote on request':money(ritual.fee)+' estimated ritual fee'
  main.innerHTML=breadcrumbs(chain)+heading(escape(ritual.category),escape(ritual.name),escape(ritual.description||'Discuss preparations for this ritual with an Avantika Pandit Ji.'))+
    '<section class="card info detail-body"><h2>Where it is performed</h2><p>'+escape(ritual.place)+'</p><p><strong>'+escape(fee)+'</strong></p>'+
    '<h2>What you can request</h2><p>Choose an in-person visit or ask for a ritual on your behalf. For a remote request, operations can share a ritual video and arrange optional Prasad delivery within India.</p>'+
    '<div class="actions">'+link('Request pooja',route+'/book')+link('See dated events','events','secondary')+'</div></section>'+
    '<section class="section detail-body"><h2>Before you submit</h2><ul><li>Have the devotee name and Sankalp ready. Add Gotra or family names where applicable.</li>'+
    '<li>Operations confirms the date, location and any delivery charges. Follow updates in My Requests.</li></ul>'+link('Get help','support','secondary')+'</section>'
}
function offeringDetail(id,step) {
  const offering=devotion.chadhava.find(item=>item.id===id)
  if (!offering||(step&&step!=='book')) return missingPage('chadhava','All offerings')
  const route='chadhava/'+offering.id
  const chain=[['Chadhava','chadhava'],[offering.name,step?route:null]]
  if (step) return bookingPage(chain,'Request '+offering.name,'Choose a temple and share the name, Gotra if applicable, and Sankalp.','chadhava',offering.id)
  main.innerHTML=breadcrumbs(chain)+heading('TEMPLE OFFERING',escape(offering.name),escape(offering.description))+
    '<section class="card info detail-body"><h2>How it works</h2><ol class="steps"><li>Select a temple and submit your intention.</li><li>Operations reviews availability with the Pandit Ji.</li>'+
    '<li>Check My Requests for fulfillment updates and any evidence shared by staff.</li></ol>'+
    '<div class="actions">'+link('Request offering',route+'/book')+link('Explore temples','temples','secondary')+'</div></section>'
}
function eventDetail(event,step) {
  if (!event||(step&&step!=='book')) return missingPage('events','All events')
  const route='events/'+event.id
  const temple=devotion.temples.find(item=>item.id===event.temple)
  const chain=[['Temple events','events'],[event.title,step?route:null]]
  const summary=event.day+(temple?' · '+temple.name:'')
  if (step) {
    if (!event.active||event.day<today()) return missingPage('events','All events')
    return bookingPage(chain,event.title,summary,event.kind,event.service,event)
  }
  main.innerHTML=breadcrumbs(chain)+heading(escape(summary),escape(event.title),escape(event.description))+
    '<section class="card info detail-body"><h2>Participation</h2><p>The event fixes the temple and date for your request. Operations reviews participation and records updates in your account.</p><div class="actions">'+
    (event.active&&event.day>=today()?link('Request participation',route+'/book'):'<p>Participation has closed.</p>')+
    (temple?link('Visit temple profile','temples/'+temple.id,'secondary'):'')+'</div></section>'
}
function productDetail(item) {
  if (!item) return missingPage('store','Back to store')
  main.innerHTML=breadcrumbs([['Store','store'],[item.name]])+heading('DEVOTIONAL STORE',escape(item.name),escape(item.description))+
    '<section class="card info detail-body"><h2>'+money(item.price)+'</h2><p>'+
    (item.active&&item.stock>0?item.stock+' in stock':'Unavailable')+'</p><p>Operations confirms delivery and any charges after you submit your order.</p><div class="actions">'+
    (user?.role==='admin'?button('Edit product','id="product-action"'):item.active&&item.stock>0?button('Add to cart','id="product-action"'):'')+
    link('View cart','cart','secondary')+'</div></section>'
  const action=$('#product-action')
  if (action) action.onclick=()=>user?.role==='admin'?productForm(item):user?quantityForm(item):auth('login',()=>quantityForm(item))
}

function render() {
  const version=++renderNumber
  let [page,subpage,step,extra]=(location.hash.slice(1)||'home').split('/')
  if (page==='daan'&&!extra) {
    subpage=subpage?'daan-'+subpage:undefined
    page='chadhava'
    history.replaceState(history.state,'','#'+[page,subpage,step].filter(Boolean).join('/'))
  }
  if (extra) return missingPage('home','Home')
  const items=user&&user.role!=='devotee'?[...nav,['requests','Dashboard']]:nav
  $('#nav').innerHTML=items.map(([path,label])=>'<a href="#'+path+'" '+(page===path?'aria-current="page"':'')+'>'+label+'</a>').join('')
  $('#account').textContent=user?'Account':'Sign in'
  if (!page||page==='home') home()
  else if (page==='poojas') subpage?ritualDetail(subpage,step):poojas()
  else if (page==='panchang') panchang(version,subpage,step)
  else if (['astrology','consult'].includes(page)) servicePage(page,subpage,step)
  else if (page==='library') library(subpage,step)
  else if (page==='jaap') jaap()
  else if (page==='requests') requests(version,subpage)
  else if (page==='support') support()
  else if (page==='events') ritualEvents(version,subpage,step)
  else if (['store','cart','orders'].includes(page)) shop(page,version,subpage)
  else if (['mandir','temples','chadhava','devotional','community'].includes(page)) devotionalPage(page,version,subpage,step)
  else main.innerHTML=heading('AVANTIKA','Page unavailable','Return home to find available services.')+link('Home','home')
}
main.addEventListener('click',event=>{
  const target=event.target.closest('button')
  if (!target) return
  const data=target.dataset
  if (data.pooja) requestForm('pooja',data.pooja)
  else if (data.daan) requestForm('daan',data.daan)
  else if (data.consult) requestForm('consultation',data.consult)
  else if (data.astrology) requestForm('astrology',data.astrology)
  else if ('support' in data) requestForm('support')
  else if ('auth' in data) auth()
  else if (data.chadhava || data.store) requestForm(data.chadhava?'chadhava':'store',data.chadhava||data.store)
  else if ('publishContent' in data) publishContent()
  else if ('communityPost' in data) submitCommunity()
  else if (data.moderate) moderate(data.moderate,data.state,target)
  else if (data.transition||data.cancel) changeRequest(data.transition||data.cancel,Boolean(data.cancel))
})
$('#account').onclick = account
addEventListener('hashchange',()=>{ if (dialog.open) dialog.close(); render(); window.scrollTo(0,0) })
try {
  const [data,session]=await Promise.all([fetch('/catalog.json').then(response=>response.json()),api('session')])
  catalog=data
  user=session.user
  googleSignIn=session.googleSignIn
  const authError = new URLSearchParams(location.search).get('auth')
  if (authError) {
    history.replaceState(null,'','/'+location.hash)
    inform(authError === 'existing' ? 'An account already uses this email. Sign in with its password.' : 'Google sign-in could not be completed. Try again.')
  }
  render()
} catch (error) {
  main.textContent='The app could not load. Refresh to try again.'
  console.error(error)
}
