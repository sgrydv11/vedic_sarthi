import { getKundli, Observer, matchKundli, getGocharAnalysis, getSpecialLagnas, getArudhaPadas, getChandraKundli, getSuryaKundli } from './jyotish-engine.js'

const places={Ujjain:[23.1765,75.7885],Delhi:[28.6139,77.209],Mumbai:[19.076,72.8777],Kolkata:[22.5726,88.3639],Chennai:[13.0827,80.2707],Bengaluru:[12.9716,77.5946],Hyderabad:[17.385,78.4867],Varanasi:[25.3176,82.9739],Jaipur:[26.9124,75.7873],Lucknow:[26.8467,80.9462],Indore:[22.7196,75.8577],Bhopal:[23.2599,77.4126]}
const esc=value=>String(value??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const dateFormat=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'})
const label=key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase())
const tables=(heading,headers,rows)=>'<section class="card info section"><h3>'+esc(heading)+'</h3><div class="jyotish-table"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>'
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
function planetTable(chart,title,hindi,showHouses) {
  const houseByPlanet=new Map(chart.houses.flatMap(house=>house.planets.map(name=>[name,house.number])))
  const lagna=hindi?(hindiRashis[chart.ascendant?.rashi-1]||'—'):(chart.ascendant?.rashiName||'—')
  return '<section class="card info section" lang="'+(hindi?'hi':'en')+'"><h3>'+esc(title+(hindi?' · लग्न ':' · Lagna ')+lagna)+'</h3>'+northIndianChart(chart,hindi,showHouses)+
    tables(hindi?'ग्रहों की स्थिति':'Planet positions',hindi?['ग्रह','राशि','भाव','अंश','गरिमा','विशेषताएँ']:['Graha','Rashi','House','Position','Dignity','Flags'],
      Object.entries(chart.planets||{}).map(([name,p])=>[grahaName(name,hindi),hindi?(hindiRashis[p.rashi-1]||p.rashiName):p.rashiName,houseByPlanet.get(name),p.degree==null?'—':p.degree+'° '+(p.minute??0)+'′',p.dignity,[p.isRetrograde&&'Retrograde',p.isCombust&&'Combust',p.isVargottama&&'Vargottama'].filter(Boolean).join(', ')||'—']))+'</section>'
}
function birthFields(prefix,name) {
  return '<fieldset><legend>'+name+'</legend><div class="panchang-controls">'+
    '<label>Date of birth<input name="'+prefix+'Date" type="date" min="1906-01-01" required></label>'+
    '<label>Local birth time<input name="'+prefix+'Time" type="time" required></label>'+
    '<label>Birthplace<select name="'+prefix+'Place">'+Object.keys(places).map(p=>'<option>'+p+'</option>').join('')+'<option value="custom">Enter coordinates</option></select></label></div>'+
    '<div class="panchang-controls" hidden data-coords="'+prefix+'"><label>Latitude<input type="number" step="any" min="-89" max="89" name="'+prefix+'Lat"></label>'+
    '<label>Longitude<input type="number" step="any" min="-180" max="180" name="'+prefix+'Lon"></label>'+
    '<label>UTC offset in minutes<input type="number" min="-720" max="840" name="'+prefix+'Offset" value="330"></label></div></fieldset>'
}
function chart(form,prefix,options) {
  const get=key=>form.elements[prefix+key].value
  const custom=get('Place')==='custom'
  const offset=custom?Number(get('Offset')):330
  const when=new Date(Date.parse(get('Date')+'T'+get('Time')+':00Z')-offset*60000)
  if(!Number.isFinite(+when)||when>new Date())throw new Error('Enter a valid birth date and time in the past.')
  const coordinates=custom?[Number(get('Lat')),Number(get('Lon'))]:places[get('Place')]
  return getKundli(when,new Observer(...coordinates,0),options)
}
export function mountJyotish(root,mode) {
  const matching=mode==='kundli-milan'
  const gochar=mode==='gochar'
  root.innerHTML='<form class="card info" id="jyotish-form">'+birthFields('first',matching?'First profile (groom)':'Birth details')+
    (matching?birthFields('second','Second profile (bride)'):'')+
    (gochar?'<label>Transit date<input type="date" name="transit" required value="'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata'}).format(new Date())+'"></label>':'')+
    '<button class="primary" type="submit">Calculate</button></div><p>Calculations run in your browser. Birth details stay on this device. <a class="breadcrumb-link" href="/jyotish-licenses.txt">Calculation sources and licenses</a></p></form><div id="jyotish-result" aria-live="polite"></div>'
  const form=root.querySelector('form')
  const result=root.querySelector('#jyotish-result')
  for(const section of form.querySelectorAll('[data-coords]')){
    const place=form.elements[section.dataset.coords+'Place']
    const sync=()=>{section.hidden=place.value!=='custom';for(const control of section.querySelectorAll('input')){control.disabled=section.hidden;control.required=!section.hidden}}
    place.addEventListener('change',sync)
    sync()
  }
  form.addEventListener('submit',event=>{
    event.preventDefault()
    try {
      const options={ayanamsa:'lahiri',houseSystem:'whole_sign',includeChalit:!matching&&!gochar,includeKp:!matching&&!gochar}
      const first=chart(form,'first',options)
      if(matching){
        const second=chart(form,'second',options)
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
          '<details class="festival-entry"><summary>Chandra Kundli</summary><div data-chart="moon"></div></details>'+
          '<details class="festival-entry"><summary>Surya Kundli</summary><div data-chart="sun"></div></details>'+
          '<section id="divisional-charts" class="card info section"><h3>Charts</h3><label>Divisional chart<select name="varga">'+
          '<option value="">Choose a chart</option>'+Object.keys(first.vargas||{}).filter(key=>key!=='d1').map(key=>'<option value="'+esc(key)+'">'+esc(key.toUpperCase())+'</option>').join('')+
          '</select></label><div class="selected-chart" aria-live="polite"></div></section>'+
          '<section class="card info section"><h3>Chart details</h3>'+
          [['Houses',first.houses],['Vimshottari Dasha',first.dasha],['Special lagnas',getSpecialLagnas(first)],['Jaimini Arudha',getArudhaPadas(first)],['Graha Drishti',first.drishti],
           ['Ashtakavarga',first.ashtakavarga],['Bhava Chalit',first.chalit],['KP astrology',first.kp]].map(([name,value])=>fold(name,value)).join('')+'</section>'
        const selector=result.querySelector('[name=varga]')
        const selected=result.querySelector('.selected-chart')
        const language=result.querySelector('[name=chartLanguage]')
        const houseNumbers=result.querySelector('[name=showHouses]')
        const showSelected=()=>{
          const key=selector.value
          selected.innerHTML=key?planetTable(first.vargas[key],key.toUpperCase(),language.value==='hi',houseNumbers.checked):''
        }
        const showCharts=()=>{
          const hindi=language.value==='hi'
          result.querySelector('[data-chart=birth]').innerHTML=planetTable(first,hindi?'D1 राशि':'D1 Rashi',hindi,houseNumbers.checked)
          result.querySelector('[data-chart=moon]').innerHTML=planetTable(moon,hindi?'चंद्र कुंडली':'Moon chart',hindi,houseNumbers.checked)
          result.querySelector('[data-chart=sun]').innerHTML=planetTable(sun,hindi?'सूर्य कुंडली':'Sun chart',hindi,houseNumbers.checked)
          showSelected()
        }
        selector.addEventListener('change',showSelected)
        language.addEventListener('change',showCharts)
        houseNumbers.addEventListener('change',showCharts)
        showCharts()
      }
    }catch(error){result.innerHTML='<p role="alert">'+esc(error instanceof Error?error.message:'Unable to calculate for these birth details.')+'</p>'}
  })
}
