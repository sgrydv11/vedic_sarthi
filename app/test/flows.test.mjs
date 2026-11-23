import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

test('devotee, Pandit and operations complete a proxy pooja', async t => {
  const data = await mkdtemp(join(tmpdir(),'avantika-'))
  const child = spawn(process.execPath,['server.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,PORT:'0',AVANTIKA_DATA:data,PANDIT_CODE:'test-pandit-invite',ADMIN_CODE:'test-admin-invite'},
    stdio:['ignore','pipe','inherit']
  })
  t.after(async()=>{
    if (child.exitCode === null) {
      child.kill()
      await once(child,'exit')
    }
    await rm(data,{recursive:true,force:true})
  })
  const url = await new Promise((resolve,reject)=>{
    let output = ''
    const timer = setTimeout(()=>reject(new Error('Server did not start.')),10000)
    child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited: '+code))})
    child.stdout.on('data',chunk=>{
      output += chunk
      const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
      if (address) {clearTimeout(timer);resolve(address)}
    })
  })

  async function call(path,method='GET',body,cookie,expected=200) {
    const headers = {...(body&&{'Content-Type':'application/json'}),...(cookie&&{Cookie:cookie})}
    const response=await fetch(url+'/api/'+path,{method,headers,body:body?JSON.stringify(body):undefined})
    const json=await response.json()
    if (Array.isArray(expected)) assert.ok(expected.includes(response.status),JSON.stringify(json))
    else assert.equal(response.status,expected,JSON.stringify(json))
    return {...json,httpStatus:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]}
  }
  const register=(role,code)=>call('register','POST',{name:role,email:role+'@example.test',password:'test-password',role,code})
  const devotee=await register('devotee')
  const pandit=await register('pandit','test-pandit-invite')
  const operations=await register('admin','test-admin-invite')
  await call('register','POST',{name:'Unauthorized',email:'blocked@example.test',password:'test-password',role:'admin',code:'wrong'},null,403)
  assert.equal((await fetch(url+'/')).status,200)
  assert.equal((await fetch(url+'/hero.webp')).status,200)
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata'}).format(new Date())
  const id=randomUUID()
  const draft={id,kind:'pooja',service:'rudrabhishek',name:'Devotee',mode:'proxy',date,language:'Hindi',sankalp:'Family prayer',deliver:true,pincode:'456001',address:'Example address'}
  await call('requests','POST',{...draft,pincode:'45600'},devotee.cookie,400)
  await call('requests','POST',draft,devotee.cookie,201)
  await call('requests','POST',draft,devotee.cookie)
  const other=await call('register','POST',{name:'Other',email:'other@example.test',password:'test-password'})
  assert.equal((await call('requests','GET',null,other.cookie)).requests.length,0)
  assert.equal((await call('requests','GET',null,pandit.cookie)).requests[0].details.sankalp,undefined)
  const action=(expected,values,account,status)=>call('requests/'+id,'PATCH',{expected,action:'advance',...values},account.cookie,status)
  await action('Requested',{},devotee,403)
  await action('Requested',{assignee:pandit.user.id},operations)
  await action('Requested',{},pandit,409)
  assert.equal((await call('requests','GET',null,pandit.cookie)).requests[0].details.sankalp,'Family prayer')
  await action('Assigned',{confirmedDate:date,confirmedTime:'10:00'},pandit)
  await action('Muhurat confirmed',{},pandit)
  await action('Ritual in progress',{video:'javascript:alert(1)'},pandit,400)
  await action('Ritual in progress',{video:'https://example.test/video'},pandit)
  await action('Video ready',{},pandit,403)
  await action('Video ready',{},operations)
  await action('Prasad packed',{AWB:'DEMO123',tracking:'https://example.test/track'},operations)
  await action('Dispatched',{},operations)
  const {requests:[order]}=await call('requests','GET',null,devotee.cookie)
  assert.equal(order.status,'Delivered')
  assert.equal(order.details.total,2199)
  assert.equal(order.details.awb,'DEMO123')
  assert.equal(order.history.length,8)

  const support=randomUUID()
  await call('requests','POST',{id:support,kind:'support',name:'Devotee',subject:'Video question',note:'Where is my video?'},devotee.cookie,201)
  assert.ok(!(await call('requests','GET',null,pandit.cookie)).requests.some(row=>row.id===support))
  assert.equal((await call('requests/'+support,'PATCH',{expected:'Requested',result:'Open your tracking page.'},operations.cookie)).status,'Resolved')

  const pledge=randomUUID()
  await call('requests','POST',{id:pledge,kind:'daan',name:'Devotee',service:'Gau Seva',amount:101},devotee.cookie,201)
  const cancelled=await call('requests/'+pledge,'PATCH',{expected:'Requested',action:'cancel'},devotee.cookie)
  assert.equal(cancelled.status,'Cancelled')

  const videoOnly=randomUUID()
  await call('requests','POST',{...draft,id:videoOnly,deliver:false},devotee.cookie,201)
  for (const [expected,fields] of [
    ['Requested',{}],['Assigned',{confirmedDate:date,confirmedTime:'10:00'}],['Muhurat confirmed',{}],
    ['Ritual in progress',{video:'https://example.test/video'}]
  ]) await call('requests/'+videoOnly,'PATCH',{expected,...fields},pandit.cookie)
  await call('requests/'+videoOnly,'PATCH',{expected:'Video ready'},operations.cookie,409)
  const devotional=await call('devotional')
  const mangal=devotional.temples.find(temple=>temple.id==='mangalnath')
  assert.equal(mangal.state,'Madhya Pradesh')
  assert.ok(mangal.rituals.includes('mangal-bhaat-puja'))
  assert.ok(devotional.temples.some(temple=>temple.id==='mahakal'))
  assert.ok(devotional.temples.some(temple=>temple.id==='prem-mandir'))
  const venueRequest={...draft,id:randomUUID(),service:'mangal-bhaat-puja',venue:'mangalnath',deliver:false}
  await call('requests','POST',{...venueRequest,venue:'prem-mandir'},devotee.cookie,400)
  await call('requests','POST',venueRequest,devotee.cookie,201)
  assert.equal((await call('requests','GET',null,devotee.cookie)).requests.find(row=>row.id===venueRequest.id).details.temple,'Mangalnath Temple')
  await call('mandir','GET',null,null,401)
  await call('mandir','PUT',{deity:'Shiva'},devotee.cookie)
  await call('mandir','POST',{offering:'Diya'},devotee.cookie)
  await call('mandir','POST',{offering:'Diya'},devotee.cookie)
  assert.equal((await call('mandir','GET',null,devotee.cookie)).activity[0].total,2)
  assert.equal((await call('mandir','GET',null,other.cookie)).deity,null)
  const reflection=await call('community','POST',{title:'Reflection',text:'A quiet moment.'},devotee.cookie,201)
  assert.equal((await call('community')).posts.length,0)
  await call('community/'+reflection.id,'PATCH',{state:'Published'},devotee.cookie,403)
  await call('community/'+reflection.id,'PATCH',{state:'Published'},operations.cookie)
  assert.equal((await call('community')).posts[0].title,'Reflection')
  await call('devotional/content','POST',{category:'darshan',title:'Temple darshan',text:'A published recording.',
    temple:'mahakal',url:'https://example.test/darshan'},operations.cookie,201)
  assert.ok((await call('devotional')).content.some(item=>item.title==='Temple darshan'))
  const offering=randomUUID()
  await call('requests','POST',{id:offering,kind:'chadhava',service:'flower',temple:'mahakal',sankalp:'Family prayer',name:'Devotee'},devotee.cookie,201)
  await call('requests/'+offering,'PATCH',{expected:'Requested'},pandit.cookie)
  await call('requests/'+offering,'PATCH',{expected:'Assigned',result:'Flowers offered.'},pandit.cookie)
  assert.equal((await call('requests','GET',null,devotee.cookie)).requests.find(item=>item.id===offering).status,'Completed')
  const shop=randomUUID()
  await call('requests','POST',{id:shop,kind:'store',service:'mala',amount:2,name:'Devotee'},devotee.cookie,201)
  const solar=await call('solar?city=Varanasi&date=2026-11-22')
  assert.equal(solar.city,'Varanasi')
  assert.ok(solar.sunrise>='06:10'&&solar.sunrise<='06:30')
  assert.ok(solar.sunset>='17:00'&&solar.sunset<='17:20')
  await call('solar?city=Invalid&date=2026-11-22','GET',null,null,400)

  const product={id:'test-mala',name:'Test mala',description:'QA only',price:100,stock:2,active:true}
  await call('shop/products','PUT',product,devotee.cookie,403)
  await call('shop/products','PUT',product,operations.cookie)
  await call('shop/cart','PUT',{product:product.id,quantity:2},devotee.cookie)
  await call('shop/cart','PUT',{product:product.id,quantity:2},other.cookie)
  const retail={id:randomUUID(),name:'QA Devotee',address:'Sample test address',pin:'456001',total:200}
  const attempts=[{body:retail,owner:devotee},{body:{...retail,id:randomUUID()},owner:other}]
  const results=await Promise.all(attempts.map(({body,owner})=>call('shop/orders','POST',body,owner.cookie,[201,409])))
  assert.deepEqual(results.map(row=>row.httpStatus).sort(),[201,409])
  const winnerIndex=results.findIndex(row=>row.httpStatus===201)
  const {body:won,owner:winner}=attempts[winnerIndex]
  const loser=attempts[1-winnerIndex].owner
  assert.match(results[1-winnerIndex].error,/prices or stock changed/)
  await call('shop/orders','POST',won,winner.cookie)
  assert.equal((await call('shop/cart','GET',null,winner.cookie)).items.length,0)
  assert.equal((await call('shop/orders','GET',null,loser.cookie)).orders.length,0)
  await call('shop/orders/'+won.id,'PATCH',{expected:'Submitted',action:'advance'},operations.cookie)
  await call('shop/orders/'+won.id,'PATCH',{expected:'Confirmed',action:'cancel'},winner.cookie)
  assert.equal((await call('shop/products')).products[0].stock,2)
  assert.equal((await call('shop/orders','GET',null,winner.cookie)).orders[0].status,'Cancelled')

  const event=await call('events','POST',{kind:'chadhava',service:'flower',temple:'mahakal',day:date,title:'QA Temple Event',description:'QA only'},operations.cookie,201)
  const linked=randomUUID()
  await call('requests','POST',{id:linked,kind:'chadhava',service:'flower',campaign:event.id,name:'Devotee',sankalp:'QA test'},devotee.cookie,201)
  assert.equal((await call('requests','GET',null,devotee.cookie)).requests.find(r=>r.id===linked).details.event,'QA Temple Event')
  await call('events/'+event.id,'PATCH',{active:false},operations.cookie)
  assert.equal((await call('events')).events.length,0)
  await call('requests','POST',{id:randomUUID(),kind:'chadhava',service:'flower',campaign:event.id,name:'Devotee',sankalp:'QA test'},devotee.cookie,409)
  await call('logout','POST',null,devotee.cookie)
  await call('requests','GET',null,devotee.cookie,401)
})
