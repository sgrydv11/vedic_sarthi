import { devotionalApi, topics } from './devotional.mjs'
const hex = bytes => Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')
const random = bytes => hex(crypto.getRandomValues(new Uint8Array(bytes)))
const randomUUID = () => crypto.randomUUID()
const encoder = new TextEncoder()
async function passwordDigest(password,salt,iterations) {
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits'])
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations,hash:'SHA-256'},key,256)))
}
async function hash(password,rounds) {
  const salt=random(16)
  return 'pbkdf2:'+rounds+':'+salt+':'+await passwordDigest(password,salt,rounds)
}
async function verify(password,stored,verifyLegacy) {
  const parts=stored.split(':')
  const [format,rounds,salt,digest]=parts.length===3?[parts[0],600000,...parts.slice(1)]:parts
  if (format!=='pbkdf2') return verifyLegacy?.(password,stored)||false
  const iterations=Number(rounds)
  if (![100000,600000].includes(iterations)) return false
  const actual=await passwordDigest(password,salt,iterations)
  if (!digest || digest.length!==actual.length) return false
  let difference=0
  for (let i=0;i<actual.length;i++) difference|=actual.charCodeAt(i)^digest.charCodeAt(i)
  return difference===0
}
const tokenHash = async token => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(token))))
const timeZone = 'Asia/Kolkata'
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date())
const statuses = {
  pooja: ['Requested', 'Assigned', 'Muhurat confirmed', 'Ritual in progress', 'Video ready', 'Prasad packed', 'Dispatched', 'Delivered'],
  daan: ['Requested', 'Assigned', 'Completed'],
  chadhava: ['Requested', 'Assigned', 'Completed'],
  store: ['Requested', 'Assigned', 'Completed'],
  consultation: ['Requested', 'Assigned', 'Scheduled', 'Completed'],
  astrology: ['Requested', 'Assigned', 'Completed'],
  support: ['Requested', 'Resolved']
}
function fail(status, message) { throw Object.assign(new Error(message), { status }) }
function send(res, value, status = 200) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'})
  res.end(JSON.stringify(value))
}
async function read(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Use application/json.')
  const parts = []
  let length = 0
  for await (const chunk of req) {
    length += chunk.length
    if (length > 24000) fail(413, 'Request is too large.')
    parts.push(chunk)
  }
  try {
    const parsed = JSON.parse(await new Blob(parts).text())
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {}
  fail(400, 'Provide a valid request.')
}
function field(data, key, max, required = false) {
  const value = typeof data[key] === 'string' ? data[key].trim() : ''
  if (value.length > max || (required && !value)) fail(400, 'Check the ' + key + ' field.')
  return value
}
function date(data, key, future = false) {
  const value = field(data, key, 10, true)
  const parsed = new Date(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(+parsed) ||
      parsed.toISOString().slice(0,10) !== value || (future && value < today())) fail(400, 'Enter a valid ' + key + '.')
  return value
}
function href(data, key, required = true) {
  const value = field(data, key, 1800, required)
  if (!value) return ''
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href
  } catch {}
  fail(400, 'Enter an HTTPS link.')
}
const view = ({id,name,email,role}) => ({id,name,email,role})
const requestView = row => ({...row, details:JSON.parse(row.details),history:JSON.parse(row.history)})
function booking(catalog, kind, input) {
  const name = field(input,'name',100,true)
  if (kind === 'pooja') {
    const ritual = catalog.rituals.find(item => item.id === input.service)
    if (!ritual) fail(400,'Choose a ritual.')
    if (!['proxy','visit'].includes(input.mode)) fail(400,'Choose a booking mode.')
    const deliver = input.mode === 'proxy' && input.deliver === true
    const pincode = deliver ? field(input,'pincode',6,true) : ''
    if (deliver && !/^[1-9]\d{5}$/.test(pincode)) fail(400,'Enter a six-digit Indian PIN code.')
    const delivery = deliver ? 99 : 0
    return [ritual.name, {name,mode:input.mode,date:date(input,'date',true),gotra:field(input,'gotra',80),
      family:field(input,'family',250),nakshatra:field(input,'nakshatra',80),rashi:field(input,'rashi',80),
      sankalp:field(input,'sankalp',1000,true),language:field(input,'language',30,true), deliver,pincode,
      address:deliver ? field(input,'address',450,true) : '',fee:ritual.fee,delivery,total:ritual.fee === null ? null : ritual.fee + delivery}]
  }
  if (kind === 'chadhava' || kind === 'store') {
    const item = topics[kind].find(entry => entry.id === input.service)
    if (!item) fail(400,'Choose a valid service.')
    const details = {name,note:field(input,'note',1000)}
    if (kind === 'chadhava') {
      const temple = topics.temples.find(entry=>entry.id===input.temple)
      if (!temple) fail(400,'Choose a temple.')
      details.temple = temple.name
      details.gotra = field(input,'gotra',80)
      details.sankalp = field(input,'sankalp',1000,true)
    } else {
      if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > 20) fail(400,'Choose a quantity from 1 to 20.')
      details.quantity = input.amount
    }
    return [item.name,details]
  }
  if (kind === 'daan') {
    if (!catalog.daan.some(item => item.name === input.service)) fail(400,'Choose a Daan option.')
    if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > 100000) fail(400,'Enter a whole amount between â‚¹1 and â‚¹100,000.')
    return [input.service,{name,amount:input.amount,note:field(input,'note',1000)}]
  }
  if (kind === 'support') return [field(input,'subject',100,true),{name,note:field(input,'note',1500,true)}]
  if (kind === 'consultation' || kind === 'astrology') {
    const topic = field(input,'service',100,true)
    if (!(kind === 'consultation' ? catalog.consult : catalog.astrology).includes(topic)) fail(400,'Choose a valid service.')
    const details = {name,note:field(input,'note',1000)}
    if (kind === 'consultation') {
      details.date = date(input,'date',true)
      details.channel = field(input,'channel',20,true)
      if (!['Chat','Audio','Video'].includes(details.channel)) fail(400,'Choose a consultation format.')
    } else {
      details.city = field(input,'city',100,true)
      if (['Janam Kundli','Kundli Milan'].includes(topic)) {
        details.birthDate = date(input,'birthDate')
        details.birthTime = field(input,'birthTime',5,true)
        if (details.birthDate > today() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(details.birthTime)) fail(400,'Check the birth details.')
        if (topic === 'Kundli Milan') {
          details.secondName = field(input,'secondName',100,true)
          details.secondCity = field(input,'secondCity',100,true)
          details.secondDate = date(input,'secondDate')
          details.secondTime = field(input,'secondTime',5,true)
          if (details.secondDate > today() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(details.secondTime)) fail(400,'Check the second birth profile.')
        }
      } else details.date = date(input,'date',topic === 'Shubh Muhurat')
    }
    return [topic,details]
  }
  fail(400,'Choose a service.')
}
async function transition(db, row, input, user) {
  const {kind, status, details} = row
  if (['Cancelled','Delivered','Completed','Resolved'].includes(status) ||
    (kind === 'pooja' && status === 'Video ready' && !details.deliver)) fail(409,'This request is closed.')
  if (input.action === 'cancel') {
    if (!((user.role === 'devotee' && status === 'Requested') || user.role === 'admin')) fail(403,'Cancellation is unavailable.')
    return 'Cancelled'
  }
  if (user.role === 'devotee') fail(403,'Only staff can advance requests.')
  if (kind === 'support' && user.role !== 'admin') fail(403,'Support is handled by operations.')
  if (kind === 'pooja' && ['Video ready','Prasad packed','Dispatched'].includes(status) && user.role !== 'admin') fail(403,'Dispatch is handled by operations.')
  const next = statuses[kind][statuses[kind].indexOf(status)+1]
  if (next === 'Assigned') row.assigned = user.role === 'pandit' ? user.id : field(input,'assignee',80,true)
  if (next === 'Assigned' && !(await db.prepare("SELECT id FROM users WHERE id=? AND role='pandit'").get(row.assigned))) fail(400,'Select a Pandit account.')
  if (next === 'Muhurat confirmed' || next === 'Scheduled') {
    details.confirmedDate = date(input,'confirmedDate',true)
    details.confirmedTime = field(input,'confirmedTime',5,true)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(details.confirmedTime)) fail(400,'Enter a valid time in IST.')
  }
  if (next === 'Scheduled') details.meeting = href(input,'meeting',false)
  if (next === 'Video ready' && details.mode === 'proxy') details.video = href(input,'video')
  if (next === 'Video ready' && details.mode === 'visit') return 'Completed'
  if (next === 'Dispatched') {
    details.awb = field(input,'AWB',100,true)
    details.tracking = href(input,'tracking')
  }
  if (next === 'Completed' || next === 'Resolved') {
    details.result = field(input,'result',2000,true)
    details.proof = href(input,'proof',false)
  }
  return next
}

export function createApplication({db,catalog,staffCode={},google,verifyLegacy,secure=false,passwordRounds=600000,authThrottle}) {
  const secureCookie=secure?'; Secure':''
  async function setSession(res, user) {
    const token = random(32)
    await db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now())
    await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(await tokenHash(token),user.id,Date.now()+86400000)
    res.appendHeader('Set-Cookie', 'avantika=' + token + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400'+secureCookie)
  }
  async function establish(res,user) {
    await setSession(res,user)
    send(res,{user:view(user)})
  }
  const devotional = devotionalApi(db,{send,read,field,date,href,fail,today,randomUUID})
  return async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Referrer-Policy','no-referrer')
    res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
    try {
      const url = new URL(req.url,'https://'+req.headers.host)
      const path = url.pathname
      const method = req.method
      if (!path.startsWith('/api/')) fail(404,'Page not found.')
      if (['POST','PATCH','PUT'].includes(method) && req.headers.origin && req.headers.origin !== (secure?'https://':'http://') + req.headers.host) fail(403,'Invalid request origin.')
      const token = req.headers.cookie?.match(/(?:^|; )avantika=([a-f0-9]{64})(?:;|$)/)?.[1]
      const user = token && await db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.owner WHERE token=? AND expires>?').get(await tokenHash(token),Date.now())
      if (method === 'GET' && path === '/api/session') return send(res,{user:user ? view(user) : null,googleSignIn:google?.available(req)||false})
      if (method === 'GET' && ['/api/login/google','/api/login/google/callback'].includes(path)) {
        if (!google?.available(req)) fail(503,'Google sign-in is unavailable at this address.')
        if (path.endsWith('/callback')) return await google.finish(req,res,url,setSession)
        return google.start(res,url)
      }
      if (method === 'POST' && path === '/api/logout') {
        if (token) await db.prepare('DELETE FROM sessions WHERE token=?').run(await tokenHash(token))
        res.setHeader('Set-Cookie','avantika=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+secureCookie)
        return send(res,{user:null})
      }
      if (method === 'POST' && ['/api/login','/api/register'].includes(path)) {
        const input = await read(req)
        const email = field(input,'email',180,true).toLowerCase()
        const password = field(input,'password',128,true)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Enter a valid email.')
        if (authThrottle) await authThrottle(req,path,email)
        const existing = await db.prepare('SELECT * FROM users WHERE email=?').get(email)
        if (path.endsWith('login')) {
          if (!existing?.password || !(await verify(password,existing.password,verifyLegacy))) fail(401,'Email or password is incorrect.')
          return await establish(res,existing)
        }
        if (existing) fail(409,'This email already has an account.')
        if (password.length < (secure?12:8)) fail(400,secure?'Use at least 12 characters for your password.':'Use at least eight characters for your password.')
        const role = ['admin','pandit'].includes(input.role) ? input.role : 'devotee'
        if (role !== 'devotee' && (!staffCode[role] || staffCode[role] !== field(input,'code',200))) fail(403,'Staff registration code is invalid or unavailable.')
        const account = {id:randomUUID(),name:field(input,'name',100,true),email,password:await hash(password,passwordRounds),role}
        const inserted=await db.prepare('INSERT INTO users VALUES (?,?,?,?,?) ON CONFLICT(email) DO NOTHING').run(account.id,account.name,email,account.password,role)
        if (!inserted.changes) fail(409,'This email already has an account.')
        return await establish(res,account)
      }
      if (await devotional(req,res,path,user)) return
      if (!user) fail(401,'Sign in to continue.')
      if (path === '/api/requests' && method === 'GET') {
        const query = 'SELECT * FROM requests '
        const sort = ' ORDER BY created DESC'
        const rows = user.role === 'admin' ? await db.prepare(query+sort).all() : user.role === 'pandit'
          ? await db.prepare(query+"WHERE assigned=? OR (assigned IS NULL AND status='Requested' AND kind!='support')"+sort).all(user.id)
          : await db.prepare(query+'WHERE owner=?'+sort).all(user.id)
        const staff = user.role === 'admin' ? await db.prepare("SELECT id,name FROM users WHERE role='pandit' ORDER BY name").all() : []
        return send(res,{requests:rows.map(row => {
          const value = requestView(row)
          if (user.role === 'pandit' && !row.assigned) value.details = {date:value.details.date}
          return value
        }),staff})
      }
      if (path === '/api/requests' && method === 'POST') {
        if (user.role !== 'devotee') fail(403,'Use a devotee account to submit a request.')
        const input = await read(req)
        const kind = field(input,'kind',20,true)
        const id = field(input,'id',36,true)
        if (!/^[0-9a-f-]{36}$/.test(id)) fail(400,'Invalid request ID.')
        const existing = await db.prepare('SELECT * FROM requests WHERE id=?').get(id)
        if (existing?.owner === user.id) return send(res,requestView(existing))
        if (existing) fail(409,'Request ID is already in use.')
        const [title,details] = booking(catalog,kind,input)
        const created = new Date().toISOString()
        const history = [{status:'Requested',date:created}]
        const inserted=await db.prepare('INSERT INTO requests VALUES (?,?,NULL,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(id,user.id,kind,title,'Requested',JSON.stringify(details),JSON.stringify(history),created)
        if (!inserted.changes) {
          const concurrent=await db.prepare('SELECT * FROM requests WHERE id=?').get(id)
          if (concurrent?.owner===user.id) return send(res,requestView(concurrent))
          fail(409,'Request ID is already in use.')
        }
        return send(res,{id,status:'Requested'},201)
      }
      const match = path.match(/^\/api\/requests\/([a-f0-9-]+)$/)
      if (match && method === 'PATCH') {
        const input = await read(req)
        const saved = await db.prepare('SELECT * FROM requests WHERE id=?').get(match[1])
        if (!saved || (user.role === 'devotee' && saved.owner !== user.id) ||
          (user.role === 'pandit' && (saved.kind === 'support' || (saved.assigned && saved.assigned !== user.id)))) fail(404,'Request not found.')
        if (input.expected !== saved.status) fail(409,'This request changed. Refresh and try again.')
        const row = requestView(saved)
        const next = await transition(db,row,input,user)
        row.history.push({status:next,date:new Date().toISOString()})
        const update = await db.prepare('UPDATE requests SET assigned=?,status=?,details=?,history=? WHERE id=? AND status=?').run(row.assigned,next,JSON.stringify(row.details),JSON.stringify(row.history),row.id,saved.status)
        if (!update.changes) fail(409,'This request changed. Refresh and try again.')
        return send(res,{...row,status:next})
      }
      fail(404,'Page not found.')
    } catch (error) {
      if (!error.status && error.code !== 'ENOENT') console.error(error)
      send(res,{error:error.status ? error.message : error.code === 'ENOENT' ? 'File not found.' : 'Something went wrong.'},error.status || (error.code === 'ENOENT' ? 404 : 500))
    }
  }
}
