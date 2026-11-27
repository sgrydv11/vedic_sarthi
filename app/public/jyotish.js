import { getKundli, Observer, matchKundli, getGocharAnalysis, getSpecialLagnas, getArudhaPadas, getChandraKundli, getSuryaKundli } from './jyotish-engine.js'


const esc=value=>String(value??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const dateFormat=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'})
const label=key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase())
const tables=(heading,headers,rows)=>'<section class="card info section"><h3>'+esc(heading)+'</h3><div class="jyotish-table"><table role="table"><thead role="rowgroup"><tr role="row">'+headers.map(h=>'<th role="columnheader" scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody role="rowgroup">'+
  rows.map(row=>'<tr role="row">'+row.map((v,index)=>'<td role="cell"><span class="jyotish-cell-label" aria-hidden="true">'+esc(headers[index])+'</span><span>'+esc(v)+'</span></td>').join('')+'</tr>').join('')+'</tbody></table></div></section>'
function detail(value) {
  if(value instanceof Date)return esc(dateFormat.format(value))
  if(Array.isArray(value))return '<ol>'+value.map(v=>'<li>'+detail(v)+'</li>').join('')+'</ol>'
  if(value&&typeof value==='object')return '<dl class="panchang-values">'+Object.entries(value).filter(([,v])=>v!=null).map(([k,v])=>'<div><dt>'+esc(label(k))+'</dt><dd>'+(typeof v==='object'&&!(v instanceof Date)?'<details><summary>View</summary>'+detail(v)+'</details>':detail(v))+'</dd></div>').join('')+'</dl>'
  return esc(typeof value==='boolean'?(value?'Yes':'No'):value)
}
const fold=(title,value)=>value==null?'':'<details class="festival-entry"><summary>'+esc(title)+'</summary>'+detail(value)+'</details>'
const houseCenters=[
  [200,100],[100,31],[31,100],[100,200],[31,300],[100,369],
  [200,300],[300,369],[369,300],[300,200],[369,100],[300,31]
]
const grahaLabels={Sun:'Su',Moon:'Mo',Mars:'Ma',Mercury:'Me',Jupiter:'Ju',Venus:'Ve',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke',Uranus:'Ur',Neptune:'Ne',Pluto:'Pl'}
const hindiGrahas={
  Sun:['सू','सूर्य'],Moon:['चं','चंद्र'],Mars:['मं','मंगल'],Mercury:['बु','बुध'],
  Jupiter:['गु','बृहस्पति'],Venus:['शु','शुक्र'],Saturn:['श','शनि'],Rahu:['रा','राहु'],Ketu:['के','केतु'],
  Uranus:['यू','यूरेनस'],Neptune:['ने','नेपच्यून'],Pluto:['प्लू','प्लूटो']
}
const hindiRashis=['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन']
const grahaName=(name,hindi)=>hindi?(hindiGrahas[name]?.[1]||name):name
function northIndianChart(chart,hindi,showHouses) {
  const houses=new Map(chart.houses.map(house=>[house.number,house]))
  const cells=houseCenters.map(([x,y],index)=>{
    const number=index+1
    const house=houses.get(number)
    const planets=house?.planets||[]
    const sign=house?.rashi??'—'
    const rows=[]
    for(let i=0;i<planets.length;i+=3)rows.push(planets.slice(i,i+3).map(name=>(hindi?hindiGrahas[name]?.[0]:grahaLabels[name])||name.slice(0,2)).join(' '))
    const houseLabel=hindi?'भाव '+number:'House '+number
    const top=Math.min(y,386-(rows.length-1)*12)
    return '<g><title>'+esc(houseLabel+(hindi?', राशि ':', rashi ')+sign+(planets.length?' · '+planets.map(name=>grahaName(name,hindi)).join(', '):''))+'</title>'+
      '<text class="kundli-house" x="'+x+'" y="'+(top-7)+'">'+(showHouses?(hindi?'भा':'H')+number+' · ':'')+esc(sign)+'</text>'+
      rows.map((row,i)=>'<text class="kundli-planets" x="'+x+'" y="'+(top+8+i*12)+'">'+esc(row)+'</text>').join('')+'</g>'
  }).join('')
  return '<figure class="kundli-chart"><svg viewBox="0 0 400 400" role="img" aria-label="'+(hindi?'बारह भावों वाली उत्तर भारतीय कुंडली':'North Indian style chart with 12 houses')+'">'+
    '<path class="kundli-lines" d="M1 1H399V399H1Z M1 1L399 399 M399 1L1 399 M200 1L399 200L200 399L1 200Z"/>'+cells+'</svg>'+
    '<figcaption>'+(showHouses
      ? (hindi?'भाव 1 लग्न है। भाव के बाद लिखा अंक राशि बताता है।':'H1 marks the Lagna. The number after each house is its rashi.')
      : (hindi?'लग्न ऊपर है। अंक राशियाँ दर्शाते हैं।':'The Lagna is at the top. Numbers indicate rashis.'))+
    (hindi?' ग्रहों के पूरे नाम नीचे की तालिका में हैं।':' Planet names are spelled out in the table.')+'</figcaption></figure>'
}
const hindiDignities={exalted:'उच्च',debilitated:'नीच',moolatrikona:'मूलत्रिकोण',own:'स्वराशि',friendly:'मित्र राशि',enemy:'शत्रु राशि',neutral:'सम राशि'}
function planetTable(chart,title,hindi,showHouses) {
  const houseByPlanet=new Map(chart.houses.flatMap(house=>house.planets.map(name=>[name,house.number])))
  const lagna=hindi?(hindiRashis[chart.ascendant?.rashi-1]||'—'):(chart.ascendant?.rashiName||'—')
  return '<section class="card info section" lang="'+(hindi?'hi':'en')+'"><h3>'+esc(title+(hindi?' · लग्न ':' · Lagna ')+lagna)+'</h3>'+northIndianChart(chart,hindi,showHouses)+
    tables(hindi?'ग्रहों की स्थिति':'Planet positions',hindi?['ग्रह','राशि','भाव','अंश','गरिमा','विशेषताएँ']:['Graha','Rashi','House','Position','Dignity','Flags'],
      Object.entries(chart.planets||{}).map(([name,p])=>[grahaName(name,hindi),hindi?(hindiRashis[p.rashi-1]||p.rashiName):p.rashiName,houseByPlanet.get(name),p.degree==null?'—':p.degree+'° '+(p.minute??0)+'′',hindi?(hindiDignities[p.dignity]||p.dignity):p.dignity,[p.isRetrograde&&(hindi?'वक्री':'Retrograde'),p.isCombust&&(hindi?'अस्त':'Combust'),p.isVargottama&&(hindi?'वर्गोत्तम':'Vargottama')].filter(Boolean).join(', ')||'—']))+'</section>'
}
const vargaNames={
  d1:['Rashi (Birth Chart)','राशि (जन्म कुंडली)'],d2:['Hora','होरा'],d3:['Drekkana','द्रेष्काण'],
  d4:['Chaturthamsha','चतुर्थांश'],d5:['Panchamsha','पंचमांश'],d6:['Shashthamsha','षष्ठांश'],
  d7:['Saptamsha','सप्तांश'],d8:['Ashtamsha','अष्टमांश'],d9:['Navamsha','नवांश'],
  d10:['Dashamsha','दशमांश'],d11:['Rudramsha','रुद्रांश'],d12:['Dwadashamsha','द्वादशांश'],
  d16:['Shodashamsha','षोडशांश'],d20:['Vimshamsha','विंशांश'],d24:['Chaturvimshamsha','चतुर्विंशांश'],
  d27:['Saptavimshamsha','सप्तविंशांश'],d30:['Trimshamsha','त्रिंशांश'],d40:['Khavedamsha','खवेदांश'],
  d45:['Akshavedamsha','अक्षवेदांश'],d60:['Shashtyamsha','षष्ट्यंश']
}
const chartName=(key,hindi)=>key.toUpperCase()+' · '+vargaNames[key][hindi?1:0]
const dashaDateFormat=new Intl.DateTimeFormat('hi-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'})
function dashaTimeline(kundli,hindi) {
  const format=hindi?dashaDateFormat:dateFormat
  const birth=kundli.birthDetails.rawDate
  const limit=new Date(birth)
  limit.setUTCFullYear(birth.getUTCFullYear()+100)
  if(limit.getUTCMonth()!==birth.getUTCMonth())limit.setUTCDate(0)
  const title=hindi?'विंशोत्तरी दशा · जन्म से 100 वर्ष':'Vimshottari Dasha · First 100 years from birth'
  const levels=hindi?['महादशा','अंतर्दशा','प्रत्यंतर्दशा']:['Mahadasha','Antardasha','Pratyantardasha']
  const overlaps=period=>+period.startTime<+limit&&+period.endTime>+birth
  const range=period=>format.format(Math.max(+birth,+period.startTime))+' – '+format.format(Math.min(+limit,+period.endTime))
  const name=period=>grahaName(period.planet,hindi)
  const summary=(period,level)=>esc(levels[level]+' · '+name(period))+' <span class="dasha-dates">'+esc(range(period))+'</span>'
  const mahadashas=kundli.dasha.mahadashas.filter(overlaps)
  return '<h3>'+title+'</h3><p>'+esc(format.format(birth)+' – '+format.format(limit)+' · '+(hindi?'भारतीय मानक समय':'India Standard Time'))+'</p>'+
    mahadashas.map(maha=>'<details class="festival-entry"><summary>'+summary(maha,0)+'</summary>'+
      (maha.antars||[]).filter(overlaps).map(antar=>'<details class="festival-entry dasha-antar"><summary>'+summary(antar,1)+'</summary>'+
        tables(levels[2],hindi?['ग्रह','आरंभ','समाप्ति']:['Planet','Start','End'],(antar.pratyantars||[]).filter(overlaps).map(period=>
          [name(period),format.format(Math.max(+birth,+period.startTime)),format.format(Math.min(+limit,+period.endTime))]))+
        '</details>').join('')+'</details>').join('')
}
function birthFields(prefix,name) {
  return '<fieldset><legend>'+name+'</legend><div class="panchang-controls">'+
    '<label>Date of birth<input name="'+prefix+'Date" type="date" min="1906-01-01" required></label>'+
    '<label>Local birth time<input name="'+prefix+'Time" type="time" required></label>'+
    '</div><div class="panchang-controls">'+
    '<label>Country<select name="'+prefix+'Country" required></select></label>'+
    '<label>State or territory<select name="'+prefix+'State" required></select></label>'+
    '<label>City<select name="'+prefix+'Place" required></select></label></div>'+
    '<p data-place-note="'+prefix+'" role="status"></p>'+
    '<div class="panchang-controls" hidden data-coords="'+prefix+'"><label>Latitude<input type="number" step="any" min="-89" max="89" name="'+prefix+'Lat"></label>'+
    '<label>Longitude<input type="number" step="any" min="-180" max="180" name="'+prefix+'Lon"></label>'+
    '<label>UTC offset in minutes<input type="number" min="-720" max="840" name="'+prefix+'Offset" value="330"></label></div></fieldset>'
}
function chart(form,prefix,options,places) {
  const get=key=>form.elements[prefix+key].value
  const city=places.regions[get('Country')]?.[get('State')]?.[get('Place')]
  const manual=!city||city[1]===null
  const offset=manual?Number(get('Offset')):330
  const when=new Date(Date.parse(get('Date')+'T'+get('Time')+':00Z')-offset*60000)
  if(!Number.isFinite(+when)||when>new Date())throw new Error('Enter a valid birth date and time in the past.')
  const coordinates=manual?[Number(get('Lat')),Number(get('Lon'))]:city.slice(1)
  return getKundli(when,new Observer(...coordinates,0),options)
}
export function mountJyotish(root,mode) {
  const matching=mode==='kundli-milan'
  const gochar=mode==='gochar'
  root.innerHTML='<form class="card info" id="jyotish-form">'+birthFields('first',matching?'First profile (groom)':'Birth details')+
    (matching?birthFields('second','Second profile (bride)'):'')+
    '<div class="panchang-controls">'+(gochar?'<label>Transit date<input type="date" name="transit" required value="'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata'}).format(new Date())+'"></label>':'')+
    '<button class="primary" type="submit">Calculate</button></div><p>Calculations run in your browser. Birth details stay on this device. <a class="breadcrumb-link" href="/jyotish-licenses.txt">Calculation sources and licenses</a> · <a class="breadcrumb-link" href="/india-birthplaces-source.txt">Birthplace data</a></p></form><div id="jyotish-result" aria-live="polite"></div>'
  const form=root.querySelector('form')
  const result=root.querySelector('#jyotish-result')
  const places={countries:[],regions:{}}
  const replaceOptions=(select,label,options)=>{
    select.replaceChildren(new Option(label,''),...options.map(([value,name])=>new Option(name,value)))
  }
  const initPickers=[]
  for(const section of form.querySelectorAll('[data-coords]')){
    const prefix=section.dataset.coords
    const field=name=>form.elements[prefix+name]
    const country=field('Country'),state=field('State'),place=field('Place')
    const note=form.querySelector('[data-place-note='+prefix+']')
    const sync=()=>{
      const city=places.regions[country.value]?.[state.value]?.[place.value]
      const manual=Boolean(country.value)&&(place.value==='custom'||Boolean(city&&city[1]===null)||!places.regions[country.value])
      section.hidden=!manual
      for(const control of section.querySelectorAll('input')){
        control.disabled=!manual
        control.required=manual
      }
      note.textContent=manual
        ? 'Enter coordinates and the UTC offset that applied at the local birth time, including daylight saving if applicable.'
        : ''
    }
    const setCities=(initial='')=>{
      const cities=places.regions[country.value]?.[state.value]||[]
      replaceOptions(place,'Choose a city',cities.map(([name],i)=>[String(i),name+', '+state.value]))
      place.disabled=!state.value
      if(!place.disabled){
        place.add(new Option('Enter coordinates','custom'))
        if(initial){
          const index=cities.findIndex(([name])=>name===initial)
          if(index!==-1)place.value=String(index)
        }
      }
      sync()
    }
    const setStates=(initial='')=>{
      const regions=places.regions[country.value]
      replaceOptions(state,regions?'Choose a state':'No state data available',Object.keys(regions||{}).map(name=>[name,name]))
      state.disabled=!regions
      state.value=initial
      field('Offset').value=country.value==='IN'?'330':''
      setCities(initial?'Ujjain':'')
    }
    country.onchange=()=>setStates()
    state.onchange=()=>setCities()
    place.onchange=sync
    replaceOptions(country,'Loading birthplace directory…',[['manual','Enter coordinates']])
    setStates()
    initPickers.push(()=>{
      const previous=country.value
      replaceOptions(country,'Choose a country',[...places.countries,['manual','Enter coordinates']])
      country.value=previous||'IN'
      if(previous!=='manual')setStates(country.value==='IN'?'Madhya Pradesh':'')
    })
  }
  fetch('/india-birthplaces.json').then(response=>{
    if(!response.ok)throw new Error('Birthplace directory unavailable')
    return response.json()
  }).then(data=>{
    if(!root.isConnected)return
    Object.assign(places,data)
    initPickers.forEach(init=>init())
  }).catch(()=>{
    if(!root.isConnected)return
    for(const control of form.querySelectorAll('select[name$=Country]'))control.options[0].textContent='Directory unavailable'
  })

  form.addEventListener('submit',event=>{
    event.preventDefault()
    try {
      const options={ayanamsa:'lahiri',houseSystem:'whole_sign',includeChalit:!matching&&!gochar,includeKp:!matching&&!gochar}
      const first=chart(form,'first',options,places)
      if(matching){
        const second=chart(form,'second',options,places)
        const match=matchKundli(first,second)
        result.innerHTML=tables('Ashtakoota Milan · '+match.ashtakoot.totalScore+' / 36',['Koota','Score','Maximum'],match.ashtakoot.kootas.map(k=>[k.name,k.score,k.maxScore]))+
          '<section class="card info section"><h3>Mangal Dosha</h3>'+fold('First profile',match.dosha.boy)+fold('Second profile',match.dosha.girl)+'</section>'
      }else if(gochar){
        const transit=getGocharAnalysis(first,new Date(form.elements.transit.value+'T12:00:00+05:30'))
        result.innerHTML=tables('Daily Gochar',['Graha','Rashi','House from Moon','Traditional indication'],
          Object.entries(transit.planets).map(([name,p])=>[name,p.rashiName,p.houseFromMoon,p.netStatus]))+
          '<section class="card info section"><h3>Transit details</h3>'+fold('Sade Sati and other transits',transit.specialTransits)+'</section>'
      }else{
        const moon=getChandraKundli(first),sun=getSuryaKundli(first)
        result.innerHTML='<label>Chart language<select name="chartLanguage"><option value="en">English</option><option value="hi" lang="hi">हिन्दी</option></select></label>'+
          '<label class="tick"><input type="checkbox" name="showHouses" checked> Show house numbers</label>'+
          '<div data-chart="birth"></div>'+
          '<details class="festival-entry"><summary data-chart-label="moon">Chandra Kundli</summary><div data-chart="moon"></div></details>'+
          '<details class="festival-entry"><summary data-chart-label="sun">Surya Kundli</summary><div data-chart="sun"></div></details>'+
          '<section id="divisional-charts" class="card info section"><h3 data-chart-label="vargas">Charts</h3><label><span data-chart-label="select">Divisional chart</span><select name="varga">'+
          '<option value="">Choose a chart</option>'+Object.keys(first.vargas||{}).filter(key=>key!=='d1').map(key=>'<option value="'+esc(key)+'">'+esc(chartName(key,false))+'</option>').join('')+
          '</select></label><div class="selected-chart" aria-live="polite"></div></section>'+
          '<section id="dasha-timeline" class="card info section"></section>'+
          '<section class="card info section"><h3>Chart details</h3>'+
          [['Houses',first.houses],['Special lagnas',getSpecialLagnas(first)],['Jaimini Arudha',getArudhaPadas(first)],['Graha Drishti',first.drishti],
           ['Ashtakavarga',first.ashtakavarga],['Bhava Chalit',first.chalit],['KP astrology',first.kp]].map(([name,value])=>fold(name,value)).join('')+'</section>'
        const selector=result.querySelector('[name=varga]')
        const selected=result.querySelector('.selected-chart')
        const language=result.querySelector('[name=chartLanguage]')
        const houseNumbers=result.querySelector('[name=showHouses]')
        const showSelected=()=>{
          const key=selector.value
          selected.innerHTML=key?planetTable(first.vargas[key],chartName(key,language.value==='hi'),language.value==='hi',houseNumbers.checked):''
        }
        const showCharts=()=>{
          const hindi=language.value==='hi'
          result.querySelector('[data-chart=birth]').innerHTML=planetTable(first,chartName('d1',hindi),hindi,houseNumbers.checked)
          result.querySelector('[data-chart=moon]').innerHTML=planetTable(moon,hindi?'चंद्र कुंडली':'Chandra Kundli (Moon Chart)',hindi,houseNumbers.checked)
          result.querySelector('[data-chart=sun]').innerHTML=planetTable(sun,hindi?'सूर्य कुंडली':'Surya Kundli (Sun Chart)',hindi,houseNumbers.checked)
          showSelected()
        }
        selector.addEventListener('change',showSelected)
        const showLanguage=()=>{
          const hindi=language.value==='hi'
          const labels=hindi?{moon:'चंद्र कुंडली',sun:'सूर्य कुंडली',vargas:'वर्ग कुंडलियाँ',select:'वर्ग कुंडली चुनें'}
            :{moon:'Chandra Kundli',sun:'Surya Kundli',vargas:'Charts',select:'Divisional chart'}
          for(const [key,label] of Object.entries(labels))result.querySelector('[data-chart-label='+key+']').textContent=label
          for(const option of selector.options)option.textContent=option.value?chartName(option.value,hindi):(hindi?'कुंडली चुनें':'Choose a chart')
          const timeline=result.querySelector('#dasha-timeline')
          timeline.lang=hindi?'hi':'en'
          timeline.innerHTML=dashaTimeline(first,hindi)
          showCharts()
        }
        language.addEventListener('change',showLanguage)
        houseNumbers.addEventListener('change',showCharts)
        showLanguage()
      }
    }catch(error){result.innerHTML='<p role="alert">'+esc(error instanceof Error?error.message:'Unable to calculate for these birth details.')+'</p>'}
  })
}
