import { createApplication } from './application.mjs'
import { assets, catalog } from './assets.mjs'

function d1(binding) {
  return {prepare(sql) {
    return {
      get:(...args)=>binding.prepare(sql).bind(...args).first(),
      all:async (...args)=>(await binding.prepare(sql).bind(...args).all()).results,
      run:async (...args)=>({changes:(await binding.prepare(sql).bind(...args).run()).meta.changes})
    }
  }}
}

function fetchResponse() {
  const headers=new Headers()
  let response
  let status=200
  const out={
    setHeader:(key,value)=>headers.set(key,value),
    appendHeader:(key,value)=>headers.append(key,value),
    writeHead(code,extra={}) {
      status=code
      for (const [key,value] of Object.entries(extra)) headers.set(key,value)
      return out
    },
    end(body) { response=new Response(body,{status,headers}) }
  }
  return {out,result:()=>response}
}

function throttle(db) {
  return async (req,path,email)=>{
    const now=Date.now()
    const hour=3600000
    const window=Math.floor(now/hour)
    const identity=path.endsWith('/login')?'email:'+email:'signup:'+(req.headers['cf-connecting-ip']||'shared')
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity))
    const key=Array.from(new Uint8Array(digest),item=>item.toString(16).padStart(2,'0')).join('')
    const counter=await db.prepare(
      'INSERT INTO auth_limits VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits'
    ).get(key+':'+window,(window+1)*hour)
    if (counter.hits>20) throw Object.assign(new Error('Too many attempts. Try again later.'),{status:429})
    if (counter.hits===1) await db.prepare('DELETE FROM auth_limits WHERE expires<?').run(now)
  }
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return Response.json({error:'Database unavailable.'},{status:503})
      const db=d1(env.DB)
      const application=createApplication({db,catalog,secure:true,passwordRounds:100000,authThrottle:throttle(db),staffCode:{
        admin:env.ADMIN_CODE?.length>=16?env.ADMIN_CODE:undefined,
        pandit:env.PANDIT_CODE?.length>=16?env.PANDIT_CODE:undefined
      }})
      const {out,result}=fetchResponse()
      const headers=Object.fromEntries(request.headers)
      headers.host=url.host
      const req={url:request.url,method:request.method,headers,
        async *[Symbol.asyncIterator]() { if(request.body) yield* request.body }}
      await application(req,out)
      return result()
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405})
    if (!Object.hasOwn(assets,url.pathname)) return new Response('Page not found.',{status:404})
    const {encoded,type,download}=assets[url.pathname]
    const headers={
      'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; media-src 'self' https:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    }
    if (download) headers['Content-Disposition']='attachment; filename="Avantika.apk"'
    return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{headers})
  }
}
