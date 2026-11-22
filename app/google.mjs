import { randomBytes, createHash } from 'node:crypto'

const callback = '/api/login/google/callback'
const safeRoute = value => /^[a-z]+(?:\/[a-z]+)?$/.test(value || '') ? value : 'home'
const random = () => randomBytes(32).toString('base64url')

export function googleAuth(db, createAccount) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:4173'+callback
  const configured = Boolean(clientId && clientSecret &&
    /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/login\/google\/callback$/.test(redirectUri))
  const available = req => configured && redirectUri === 'http://'+req.headers.host+callback
  db.exec(`
    CREATE TABLE IF NOT EXISTS google_accounts(subject TEXT PRIMARY KEY, owner TEXT UNIQUE REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS google_pending(state TEXT PRIMARY KEY, verifier TEXT, route TEXT, expires INTEGER);
  `)
  const clear = 'avantika_google=; HttpOnly; SameSite=Lax; Path=/api/login/google; Max-Age=0'
  const redirect = (res, location) => {
    res.writeHead(303, {Location:location,'Cache-Control':'no-store'})
    res.end()
  }
  function start(res, url) {
    const state = random()
    const verifier = random()
    db.prepare('DELETE FROM google_pending WHERE expires<=?').run(Date.now())
    db.prepare('INSERT INTO google_pending VALUES (?,?,?,?)').run(state,verifier,safeRoute(url.searchParams.get('returnTo')),Date.now()+600000)
    const google = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    google.search = new URLSearchParams({
      client_id:clientId, redirect_uri:redirectUri, response_type:'code', scope:'openid email profile',
      state, code_challenge:createHash('sha256').update(verifier).digest('base64url'), code_challenge_method:'S256'
    })
    res.setHeader('Set-Cookie','avantika_google='+state+'; HttpOnly; SameSite=Lax; Path=/api/login/google; Max-Age=600')
    redirect(res,google.href)
  }
  async function finish(req, res, url, setSession) {
    res.setHeader('Set-Cookie',clear)
    const state = url.searchParams.get('state')
    const cookie = req.headers.cookie?.match(/(?:^|; )avantika_google=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1]
    const pending = state && cookie === state &&
      db.prepare('DELETE FROM google_pending WHERE state=? AND expires>? RETURNING verifier,route').get(state,Date.now())
    const route = pending?.route || 'home'
    const failed = (reason='failed') => redirect(res,'/?auth='+reason+'#'+route)
    const code = url.searchParams.get('code')
    if (!pending || !code || code.length > 2048 || url.searchParams.has('error')) return failed()
    try {
      const response = await fetch('https://oauth2.googleapis.com/token',{
        method:'POST',body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,
          redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:pending.verifier}),
        signal:AbortSignal.timeout(10000),redirect:'error'
      })
      if (!response.ok) return failed()
      const {access_token:token} = await response.json()
      if (!token || typeof token !== 'string') return failed()
      const account = await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
        headers:{Authorization:'Bearer '+token}, signal:AbortSignal.timeout(10000),redirect:'error'
      })
      if (!account.ok) return failed()
      const profile = await account.json()
      const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : ''
      if (profile.email_verified !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 ||
        typeof profile.sub !== 'string' || !profile.sub || profile.sub.length > 255) return failed()
      let user = db.prepare('SELECT users.* FROM users JOIN google_accounts ON users.id=google_accounts.owner WHERE subject=?').get(profile.sub)
      if (!user) {
        if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return failed('existing')
        const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0,100) : email.split('@')[0].slice(0,100)
        db.exec('BEGIN IMMEDIATE')
        try {
          user = createAccount(name,email)
          db.prepare('INSERT INTO google_accounts VALUES (?,?)').run(profile.sub,user.id)
          db.exec('COMMIT')
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
      }
      await setSession(res,user)
      redirect(res,'/#'+route)
    } catch {
      failed()
    }
  }
  return {available,start,finish}
}
