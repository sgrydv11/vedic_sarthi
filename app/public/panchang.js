import { getPanchangam, Observer, tithiNames, nakshatraNames, yogaNames } from './panchang-engine.js'

const cities = {
  'Ujjain':[23.1765,75.7885], 'Indore':[22.7196,75.8577], 'Bhopal':[23.2599,77.4126], 'Varanasi':[25.3176,82.9739],
  'Ayodhya':[26.7922,82.1998], 'Mathura':[27.4924,77.6737], 'Prayagraj':[25.4358,81.8463], 'Lucknow':[26.8467,80.9462],
  'Delhi':[28.6139,77.2090], 'Haridwar':[29.9457,78.1642], 'Dehradun':[30.3165,78.0322], 'Jaipur':[26.9124,75.7873],
  'Amritsar':[31.6340,74.8723], 'Jammu':[32.7266,74.8570], 'Mumbai':[19.0760,72.8777], 'Pune':[18.5204,73.8567],
  'Ahmedabad':[23.0225,72.5714], 'Dwarka':[22.2442,68.9685], 'Puri':[19.8135,85.8312], 'Kolkata':[22.5726,88.3639],
  'Guwahati':[26.1445,91.7362], 'Patna':[25.5941,85.1376], 'Deoghar':[24.4763,86.6920], 'Raipur':[21.2514,81.6296],
  'Hyderabad':[17.3850,78.4867], 'Bengaluru':[12.9716,77.5946], 'Chennai':[13.0827,80.2707], 'Madurai':[9.9252,78.1198],
  'Tirupati':[13.6288,79.4192], 'Kochi':[9.9312,76.2673], 'Thiruvananthapuram':[8.5241,76.9366], 'Panaji':[15.4909,73.8278],
  'Imphal':[24.8170,93.9368], 'Agartala':[23.8315,91.2868], 'Shillong':[25.5788,91.8933]
}
const options={timeZone:'Asia/Kolkata'}
const dayFormatter=new Intl.DateTimeFormat('sv-SE',options)
const longFormatter=new Intl.DateTimeFormat('en-IN',{...options,weekday:'long',year:'numeric',month:'long',day:'numeric'})
const monthFormatter=new Intl.DateTimeFormat('en-IN',{...options,year:'numeric',month:'long'})
const timeFormatter=new Intl.DateTimeFormat('en-IN',{...options,hour:'numeric',minute:'2-digit'})
const shortDate=new Intl.DateTimeFormat('en-IN',{...options,month:'short',day:'numeric'})
const minDay='1906-01-01',maxDay='2100-12-31'
const citySlug=name=>name.toLowerCase().replaceAll(' ','-')
const e=value=>String(value??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]))
const list=(values,render)=>values.map(render).join('')
const today=()=>dayFormatter.format(new Date())
const validDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&day>=minDay&&day<=maxDay&&Number.isFinite(+new Date(day))&&new Date(day).toISOString().slice(0,10)===day
const atNoon=day=>new Date(day+'T12:00:00+05:30')
const shift=(day,days)=>dayFormatter.format(new Date(+atNoon(day)+days*86400000))
function time(at,day) {
  if (!(at instanceof Date)||!Number.isFinite(+at)) return '—'
  return (dayFormatter.format(at)!==day?shortDate.format(at)+' · ':'')+timeFormatter.format(at)
}
const range=(start,end,day)=>time(start,day)+' – '+time(end,day)
const tithi=result=>tithiNames[result.tithi]||result.tithis[0]?.name||'—'
const monthName=masa=>(masa.isAdhika?'Adhika ':'')+masa.name
const cell=(label,value)=>'<div><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>'
const table=(label,body)=>'<section class="card info panchang-panel"><h2>'+e(label)+'</h2><dl class="panchang-values">'+body+'</dl></section>'
const badge=(text)=>'<span class="pill">'+e(text)+'</span>'
const slotTable=(slots,day)=>slots?.length?'<ul class="panchang-slots">'+list(slots,slot=>'<li><strong>'+e(slot.name)+'</strong><span>'+e(range(slot.startTime,slot.endTime,day))+'</span>'+
 (slot.rating?'<span class="panchang-rating">'+e(({good:'Favorable',bad:'Unfavorable',neutral:'Neutral'})[slot.rating]||slot.rating)+'</span>':'')+'</li>')+'</ul>':'<p>No timings available.</p>'
function windows(label,entries,day) {
  return '<section class="card info panchang-panel"><h2>'+label+'</h2><dl class="panchang-values">'+entries.map(([name,value])=>{
    const times=(Array.isArray(value)?value:[value]).filter(slot=>slot?.start&&slot?.end&&dayFormatter.format(slot.start)<=day&&dayFormatter.format(slot.end)>=day)
    return cell(name,times.length?times.map(slot=>range(slot.start,slot.end,day)).join(' / '):'—')
  }).join('')+'</dl></section>'
}
function festivalEntries(items,day) {
  return list(items,festival=>'<details class="festival-entry"><summary>'+e(festival.name)+
    (festival.tradition?' · '+e(festival.tradition):'')+'</summary>'+
    (festival.description?'<p>'+e(festival.description)+'</p>':'')+
    (festival.regional?.length?'<p>Traditions: '+e(festival.regional.join(', '))+'</p>':'')+
    (festival.observances?.length?'<ul>'+list(festival.observances,item=>'<li>'+e(item)+'</li>')+'</ul>':'')+
    (festival.timings?.length?'<dl class="panchang-values">'+list(festival.timings,slot=>cell(slot.name,range(slot.start,slot.end,day)))+'</dl>':'')+
    '</details>')
}
function festivals(result,day) {
  return '<section class="card info panchang-panel"><h2>Festivals &amp; Observances</h2>'+
    (festivalEntries(result.festivals,day)||'<p>No observances are listed by this calendar for the selected date.</p>')+'</section>'
}
const defaultCalendar='purnimanta'
function calculatePanchang(day,city,calendar=defaultCalendar) {
  return getPanchangam(atNoon(day),new Observer(...cities[city],0),{timezoneOffset:330,calendarType:calendar})
}
export function renderUpcomingObservances(root,start=today()) {
  const city='Ujjain'
  const days=Array.from({length:7},(_,index)=>shift(start,index))
  const cards=days.map(day=>{
    const items=calculatePanchang(day,city).festivals
    if(!items.length)return ''
    return '<section class="card info"><h3>'+e(longFormatter.format(atNoon(day)))+'</h3>'+
      festivalEntries(items,day)+'<p><a class="secondary" href="#panchang/'+day+'/'+citySlug(city)+'">View daily Panchang</a></p></section>'
  }).join('')
  root.innerHTML='<h2>Festivals &amp; Observances</h2><p>'+city+' · '+e(shortDate.format(atNoon(start)))+' – '+
    e(shortDate.format(atNoon(days.at(-1))))+' · Purnimanta Panchang</p>'+
    (cards?'<div class="grid">'+cards+'</div>':'<p>No observances are listed for these seven days.</p>')
}
function dayView(day,city,calendar,result,alternate) {
  const amanta=calendar==='amanta'?result.masa:alternate.masa
  const purnimanta=calendar==='purnimanta'?result.masa:alternate.masa
  const transitions=[['Tithi',result.tithis],['Nakshatra',result.nakshatras],['Yoga',result.yogas],['Karana',result.karanas],['Moon Rashi',result.rashis]]
  const phase=result.tithi===14?'Purnima tithi':result.tithi===29?'Amavasya tithi':result.tithi<14?'Waxing moon':'Waning moon'
  return '<section class="card info panchang-panel"><p class="eyebrow">'+e(city)+' · IST</p><h2>'+e(longFormatter.format(atNoon(day)))+'</h2>'+
    '<div class="panchang-badges">'+badge(result.paksha+' Paksha')+badge(monthName(result.masa))+badge(phase)+'</div></section>'+
    '<div class="panchang-columns">'+table('Five limbs at sunrise',[
      cell('Tithi',tithi(result)),cell('Nakshatra',nakshatraNames[result.nakshatra]),cell('Yoga',yogaNames[result.yoga]),
      cell('Karana',result.karana),cell('Vara',result.dishaShoola.varaName)
    ].join(''))+table('Sun and moon',[
      cell('Sunrise',time(result.sunrise,day)),cell('Sunset',time(result.sunset,day)),cell('Moonrise',time(result.moonrise,day)),cell('Moonset',time(result.moonset,day)),
      cell('Sun sign',result.sunRashi?.name),cell('Moon sign',result.moonRashi?.name),cell('Moon nakshatra pada',result.nakshatraPada)
    ].join(''))+table('Hindu calendar',[
      cell('Amanta month',monthName(amanta)),cell('Purnimanta month',monthName(purnimanta)),
      cell('Vikram Samvat',result.samvat.vikram+' · '+result.samvat.samvatsara),cell('Shaka Samvat',result.samvat.shaka),
      cell('Season',result.ritu),cell('Ayana',result.ayana),cell('Disha Shoola',result.dishaShoola.inauspiciousDirection)
    ].join(''))+
    windows('Auspicious timings',[['Abhijit Muhurta',result.abhijitMuhurta],['Brahma Muhurta',result.brahmaMuhurta],['Amrit Kalam',result.amritKalam]],day)+
    windows('Timings traditionally avoided',[['Rahu Kaal',{start:result.rahuKalamStart,end:result.rahuKalamEnd}],['Yamaganda',result.yamagandaKalam],['Gulika Kaal',result.gulikaKalam],
      ['Dur Muhurta',result.durMuhurta],['Varjyam',result.varjyam]],day)+festivals(result,day)+'</div>'+
    '<section class="card info panchang-panel"><h2>Transitions and muhurta charts</h2>'+
    list(transitions,([label,rows])=>'<details class="festival-entry"><summary>'+label+' transitions</summary>'+slotTable(rows,day)+'</details>')+
    list([['Choghadiya',result.choghadiya],['Gowri Panchang',result.gowri]],([label,rows])=>
      '<details class="festival-entry"><summary>'+label+'</summary><h3>Day</h3>'+slotTable(rows.day,day)+'<h3>Night</h3>'+slotTable(rows.night,day)+'</details>')+'</section>'
}
export function mountPanchang(root,initialDay,initialCity) {
  if (!root.isConnected) return
  const qs=selector=>root.querySelector(selector)
  let day=validDay(initialDay)?initialDay:today()
  let city=Object.keys(cities).find(name=>citySlug(name)===initialCity)||'Ujjain'
  let calendar=new URLSearchParams(location.search).get('calendar')==='amanta'?'amanta':'purnimanta'
  let generation=0
  const cache=new Map()
  function calculate(date,scheme=calendar) {
    const key=[city,date,scheme].join('|')
    if (!cache.has(key)) {
      if(cache.size>96)cache.clear()
      cache.set(key,calculatePanchang(date,city,scheme))
    }
    return cache.get(key)
  }
  root.innerHTML='<section class="card info"><form id="panchang-controls" class="panchang-controls">'+
    '<label>City<select name="city">'+list(Object.keys(cities).sort(),name=>'<option>'+e(name)+'</option>')+'</select></label>'+
    '<label>Date<input name="day" type="date" required min="'+minDay+'" max="'+maxDay+'"></label>'+
    '<label>Calendar tradition<select name="calendar"><option value="purnimanta">Purnimanta</option><option value="amanta">Amanta</option></select></label>'+
    '<button class="primary" type="submit">Show Panchang</button></form>'+
    '<div class="actions"><button class="secondary" data-day="prev">Previous day</button><button class="secondary" data-day="today">Today</button>'+
    '<button class="secondary" data-day="tomorrow">Tomorrow</button><button class="secondary" data-day="next">Next day</button></div></section>'+
    '<p id="panchang-error" role="alert"></p><div id="panchang-results" aria-live="polite"></div>'+
    '<section class="card info panchang-panel"><div class="section-top"><h2>Monthly festival calendar</h2><button class="secondary" id="load-month">Show month</button></div>'+
    '<div id="panchang-month" aria-live="polite"></div></section>'+
    '<p>Times shown in IST for the selected city center. Panchang follows the sunrise convention. Festival dates can vary by tradition. '+
    '<a class="breadcrumb-link" href="/panchang-licenses.txt">Calculation sources and licenses</a></p>'
  const form=qs('#panchang-controls')
  const show=()=>{
    generation++
    form.elements.city.value=city
    form.elements.day.value=day
    form.elements.calendar.value=calendar
    qs('#panchang-error').textContent=''
    qs('#panchang-month').innerHTML=''
    qs('#load-month').disabled=false
    qs('[data-day=prev]').disabled=day===minDay
    qs('[data-day=next]').disabled=day===maxDay
    try {
      const result=calculate(day),alternate=calculate(day,calendar==='amanta'?'purnimanta':'amanta')
      qs('#panchang-results').innerHTML=dayView(day,city,calendar,result,alternate)
      const url=new URL(location.href)
      if(calendar==='amanta')url.searchParams.set('calendar','amanta')
      else url.searchParams.delete('calendar')
      url.hash='panchang/'+day+'/'+citySlug(city)
      history.replaceState(history.state,'',url)
    } catch {
      qs('#panchang-results').innerHTML=''
      qs('#panchang-error').textContent='Timings could not be calculated for this selection.'
    }
  }
  form.onsubmit=event=>{
    event.preventDefault()
    if(!validDay(form.elements.day.value))return
    day=form.elements.day.value;city=form.elements.city.value;calendar=form.elements.calendar.value
    show()
  }
  for(const control of root.querySelectorAll('[data-day]'))control.onclick=()=>{
    const action=control.dataset.day
    day=action==='today'?today():action==='tomorrow'?shift(today(),1):shift(day,action==='prev'?-1:1)
    show()
  }
  qs('#load-month').onclick=async()=>{
    const token=++generation
    const month=day.slice(0,7)
    const start=month+'-01'
    const pane=qs('#panchang-month')
    const load=qs('#load-month')
    load.disabled=true
    pane.textContent='Calculating observances…'
    const rows=[]
    try {
      for(let i=0;i<31;i++){
        const date=shift(start,i)
        if(!date.startsWith(month)||!validDay(date))break
        const result=calculate(date)
        rows.push({date,tithi:tithi(result),festivals:result.festivals.map(item=>item.name)})
        if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0))
        if(token!==generation||!root.isConnected)return
      }
      pane.innerHTML='<h3>'+e(monthFormatter.format(atNoon(start)))+'</h3><div class="panchang-month-days">'+list(rows,row=>
        '<button class="secondary panchang-day" data-month-day="'+row.date+'" '+(row.date===day?'aria-pressed="true"':'')+
        '><strong>'+row.date.slice(-2)+'</strong><span>'+e(row.tithi)+'</span>'+
        (row.festivals.length?'<small>'+e(row.festivals.join(' · '))+'</small>':'')+'</button>')+'</div>'
      for(const control of pane.querySelectorAll('[data-month-day]'))control.onclick=()=>{day=control.dataset.monthDay;show();qs('#panchang-results').scrollIntoView()}
    } catch (error) {
      if(token===generation)pane.textContent='The monthly calendar could not be calculated.'
    } finally {if(token===generation)load.disabled=false}
  }
  show()
}
