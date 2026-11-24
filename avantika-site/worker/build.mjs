import { readFile,writeFile,mkdir } from 'node:fs/promises'
const url = path => new URL(path,import.meta.url)
const text = path => readFile(url(path),'utf8')
const files = {
  '/':['index.html','text/html; charset=utf-8'],
  '/jyotish.js':['jyotish.js','text/javascript; charset=utf-8'],
  '/jyotish-engine.js':['jyotish-engine.js','text/javascript; charset=utf-8'],
  '/jyotish-licenses.txt':['jyotish-licenses.txt','text/plain; charset=utf-8'],
  '/panchang.js':['panchang.js','text/javascript; charset=utf-8'],
  '/panchang-engine.js':['panchang-engine.js','text/javascript; charset=utf-8'],
  '/panchang-licenses.txt':['panchang-licenses.txt','text/plain; charset=utf-8'],
  '/ui.js':['ui.js','text/javascript; charset=utf-8'],
  '/style.css':['style.css','text/css; charset=utf-8'],
  '/library-gita.json':['library-gita.json','application/json; charset=utf-8'],
  '/catalog.json':['catalog.json','application/json; charset=utf-8'],
  '/hero.webp':['hero.webp','image/webp'],
  '/vishal-rawal.jpg':['vishal-rawal.jpg','image/jpeg'],
  '/yashwant-rawal.jpg':['yashwant-rawal.jpg','image/jpeg'],
  '/download/avantika.apk':['../android/Avantika.apk','application/vnd.android.package-archive']
}
const assets = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([path,[file,type]])=>{
  const source=await readFile(url('../../app/public/'+file))
  const bytes=path==='/'?Buffer.from(source.toString().replace('<span>Local preview</span>','<a href="/download/avantika.apk" download="Avantika.apk">Download for Android</a>')):source
  return [path,{type,encoded:bytes.toString('base64'),download:path.endsWith('.apk')}]
})))
const catalog=JSON.parse(await text('../../app/public/catalog.json'))
const temples=(await text('../../app/temples.mjs')).replace(/^export /gm,'')
const photos=(await text('../../app/temple-photos.mjs')).replace(/^export /gm,'')
const devotional=(await text('../../app/devotional.mjs')).replace(/^import .*\r?\n/gm,'').replace(/^export /gm,'')
const retail=(await text('../../app/retail.mjs')).replace(/^export /gm,'')
const solar=(await text('../../app/solar.mjs')).replace(/^export /gm,'')
const application=(await text('../../app/application.mjs')).replace(/^import .*\r?\n/gm,'').replace(/^export /gm,'')
const worker=(await text('index.mjs')).replace(/^import .*\r?\n/gm,'')
const result=[temples,photos,devotional,retail,solar,application, 'const assets='+JSON.stringify(assets), 'const catalog='+JSON.stringify(catalog),worker].join('\n')
await mkdir(url('../dist/server/'),{recursive:true})
await writeFile(url('../dist/server/index.js'),result)
