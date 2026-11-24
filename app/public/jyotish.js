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
function northIndianChart(chart) {
  const houses=new Map(chart.houses.map(house=>[house.number,house]))
  const cells=houseCenters.map(([x,y],index)=>{
    const number=index+1
    const house=houses.get(number)
    const planets=house?.planets||[]
    const sign=house?.rashi??'—'
    const rows=[]
    for(let i=0;i<planets.length;i+=3)rows.push(planets.slice(i,i+3).map(name=>grahaLabels[name]||name.slice(0,2)).join(' '))
    return '<g><title>'+esc('House '+number+', rashi '+sign+(planets.length?' · '+planets.join(', '):''))+'</title>'+
      '<text class="kundli-house" x="'+x+'" y="'+(y-7)+'">H'+number+' · '+esc(sign)+'</text>'+
      rows.map((row,i)=>'<text class="kundli-planets" x="'+x+'" y="'+(y+8+i*12)+'">'+esc(row)+'</text>').join('')+'</g>'
  }).join('')
  return '<figure class="kundli-chart"><svg viewBox="0 0 400 400" role="img" aria-label="North Indian style chart with 12 houses">'+
    '<path class="kundli-lines" d="M1 1H399V399H1Z M1 1L399 399 M399 1L1 399 M200 1L399 200L200 399L1 200Z"/>'+cells+'</svg>'+
    '<figcaption>H1 marks the Lagna. The number after each house is its rashi. Planet names are spelled out in the table.</figcaption></figure>'
}
function planetTable(chart,title) {
  const houseByPlanet=new Map(chart.houses.flatMap(house=>house.planets.map(name=>[name,house.number])))
  return '<section class="card info section"><h3>'+esc(title+' · Lagna '+(chart.ascendant?.rashiName||'—'))+'</h3>'+northIndianChart(chart)+
    tables('Planet positions',['Graha','Rashi','House','Position','Dignity','Flags'],
      Object.entries(chart.planets||{}).map(([name,p])=>[name,p.rashiName,houseByPlanet.get(name),p.degree==null?'—':p.degree+'° '+(p.minute??0)+'′',p.dignity,[p.isRetrograde&&'Retrograde',p.isCombust&&'Combust',p.isVargottama&&'Vargottama'].filter(Boolean).join(', ')||'—']))+'</section>'
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
    '<div class="panchang-controls"><label>Ayanamsa<select name="ayanamsa"><option value="lahiri">Lahiri</option><option value="kp">KP</option><option value="raman">Raman</option></select></label>'+
    '<label>House system<select name="houseSystem"><option value="whole_sign">Whole Sign</option><option value="equal_house">Equal House</option><option value="sripati">Sripati</option><option value="placidus">Placidus</option></select></label>'+
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
      const options={ayanamsa:form.elements.ayanamsa.value,houseSystem:form.elements.houseSystem.value,includeChalit:!matching&&!gochar,includeKp:!matching&&!gochar}
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
        result.innerHTML=planetTable(first,'D1 Rashi')+
          '<details class="festival-entry"><summary>Chandra Kundli</summary>'+planetTable(getChandraKundli(first),'Moon chart')+'</details>'+
          '<details class="festival-entry"><summary>Surya Kundli</summary>'+planetTable(getSuryaKundli(first),'Sun chart')+'</details>'+'<section class="card info section"><h3>Chart details</h3>'+
          [['Houses',first.houses],['Vimshottari Dasha',first.dasha],['Special lagnas',getSpecialLagnas(first)],['Jaimini Arudha',getArudhaPadas(first)],['Graha Drishti',first.drishti],
           ['Ashtakavarga',first.ashtakavarga],['Bhava Chalit',first.chalit],['KP astrology',first.kp]].map(([name,value])=>fold(name,value)).join('')+'</section>'+
          '<section class="card info section"><h3>Divisional charts</h3>'+Object.entries(first.vargas||{}).filter(([key])=>key!=='d1').map(([key,value])=>'<details class="festival-entry"><summary>'+esc(key.toUpperCase())+'</summary>'+planetTable(value,key.toUpperCase())+'</details>').join('')+'</section>'
      }
    }catch(error){result.innerHTML='<p role="alert">'+esc(error instanceof Error?error.message:'Unable to calculate for these birth details.')+'</p>'}
  })
}
