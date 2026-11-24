import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { isIPv4 } from 'node:net'
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { googleAuth } from './google.mjs'
import { createApplication } from './application.mjs'

const root = new URL('./public/', import.meta.url)
const catalog = JSON.parse(readFileSync(new URL('catalog.json', root)))
const data = process.env.AVANTIKA_DATA || new URL('./data/', import.meta.url)
mkdirSync(data, { recursive: true })
const db = new DatabaseSync(resolve(data instanceof URL ? fileURLToPath(data) : data, 'avantika.sqlite'))
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;')
for (const schema of ['schema.sql','retail.sql','events.sql']) db.exec(readFileSync(new URL('./'+schema,import.meta.url),'utf8'))
function verifyLegacy(password,stored) {
  const [salt,digest]=stored.split(':')
  return Boolean(digest?.length===128 && timingSafeEqual(scryptSync(password,salt,64),Buffer.from(digest,'hex')))
}
const files = {'/':'index.html','/ui.js':'ui.js','/panchang.js':'panchang.js','/jyotish.js':'jyotish.js','/jyotish-engine.js':'jyotish-engine.js','/jyotish-licenses.txt':'jyotish-licenses.txt','/panchang-engine.js':'panchang-engine.js','/panchang-licenses.txt':'panchang-licenses.txt','/style.css':'style.css','/catalog.json':'catalog.json','/hero.webp':'hero.webp','/vishal-rawal.jpg':'vishal-rawal.jpg','/yashwant-rawal.jpg':'yashwant-rawal.jpg'}
const types = {html:'text/html',js:'text/javascript',txt:'text/plain',css:'text/css',json:'application/json',webp:'image/webp',jpg:'image/jpeg'}
const staffCode = {pandit:process.env.PANDIT_CODE,admin:process.env.ADMIN_CODE}
for (const [role, code] of Object.entries(staffCode)) {
  if (code && code.length < 12) throw new Error(role + ' registration code must be at least 12 characters.')
}
const bind = process.env.AVANTIKA_BIND || '127.0.0.1'
const [first, second] = bind.split('.').map(Number)
const isLocal = first === 127 || first === 10 || (first === 192 && second === 168) ||
  (first === 172 && second >= 16 && second <= 31)
if (!isIPv4(bind) || !isLocal) throw new Error('AVANTIKA_BIND must be a private or loopback IPv4 address.')
const hosts = new Set(bind === '127.0.0.1' ? ['127.0.0.1','localhost'] : [bind])

const google = googleAuth(db,(name,email)=>{
  const user = {id:randomUUID(),name,email,role:'devotee'}
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(user.id,name,email,null,user.role)
  return user
})
const application = await createApplication({db,catalog,staffCode,google,verifyLegacy})
const server = createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https://upload.wikimedia.org https://thumb.wikimedia.org; media-src 'self' https:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
  if (!hosts.has(req.headers.host?.split(':')[0])) return res.writeHead(403).end('Use the local app address.')
  const path=new URL(req.url,'http://localhost').pathname
  const method=req.method
  if (path.startsWith('/api/')) return application(req,res)
  try {
    if (method === 'GET' && path === '/download/avantika.apk') {
      const apk = readFileSync(new URL('./android/Avantika.apk', import.meta.url))
      res.writeHead(200, {
        'Content-Type':'application/vnd.android.package-archive',
        'Content-Disposition':'attachment; filename="Avantika.apk"',
        'Content-Length':apk.length,
        'Cache-Control':'no-store'
      })
      return res.end(apk)
    }
    if (method === 'GET' && Object.hasOwn(files,path)) {
      const file = files[path]
      const bytes = readFileSync(new URL(file, root))
      res.writeHead(200,{'Content-Type': types[file.split('.').at(-1)] + (/\.(webp|jpg)$/.test(file) ? '' : '; charset=utf-8')})
      return res.end(bytes)
    }
    res.writeHead(404).end('Page not found.')
  } catch(error) {
    if (error.code!=='ENOENT') console.error(error)
    res.writeHead(error.code==='ENOENT'?404:500).end(error.code==='ENOENT'?'File not found.':'Something went wrong.')
  }
})
server.listen(Number(process.env.PORT || 4173),bind,() => console.log('Avantika is ready at http://' + bind + ':' + server.address().port))
