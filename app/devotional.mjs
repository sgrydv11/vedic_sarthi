export const deities = ['Shiva','Ganesha','Vishnu','Durga','Hanuman','Krishna']
export const offerings = ['Flowers','Diya','Prasad']
export const sections = ['darshan','audio','reading','panchang','horoscope','event']
export const topics = {
  temples: [
    {id:'mahakal',name:'Shri Mahakaleshwar',city:'Ujjain',description:'Jyotirlinga and the center of Mahakal worship in Avantika.',deity:'Shiva'},
    {id:'mangalnath',name:'Mangalnath Temple',city:'Ujjain',description:'Traditional site for Mangal Bhaat Puja.',deity:'Shiva'},
    {id:'harsiddhi',name:'Harsiddhi Temple',city:'Ujjain',description:'A Devi temple near the Mahakal precinct.',deity:'Durga'},
    {id:'gopal',name:'Gopal Mandir',city:'Ujjain',description:'A temple dedicated to Krishna in the old city.',deity:'Krishna'},
    {id:'omkareshwar',name:'Shri Omkareshwar',city:'Mandhata',description:'A Jyotirlinga on the Narmada.',deity:'Shiva'}
  ],
  chadhava: [
    {id:'flower',name:'Flower offering',description:'Request a flower offering in your name.'},
    {id:'lamp',name:'Deep offering',description:'Request a diya offering with your Sankalp.'},
    {id:'bhog',name:'Bhog offering',description:'Request a traditional bhog offering.'}
  ],
  store: [
    {id:'mala',name:'Jaap mala',description:'Request availability and a quote for a 108-bead mala.'},
    {id:'diya',name:'Puja diya',description:'Request availability and a quote for a diya.'},
    {id:'kit',name:'Home puja samagri',description:'Request a quote for supplies suited to your ceremony.'}
  ]
}
const initial = [
  {id:'sankalp',category:'reading',title:'Preparing a Sankalp',text:'Before beginning, prepare the name, family or Gotra where customary, and the intention you wish to state. Ask the officiating priest which details are needed.'},
  {id:'aarti',category:'reading',title:'Aarti at home',text:'Set the diya on a stable surface. Follow your familyâ€™s order of worship, offer flowers if customary, and conclude with a moment of quiet prayer.'},
  {id:'japa',category:'reading',title:'Counting a mala',text:'Set an intention for your practice and count one bead after each repetition. Avantikaâ€™s Jaap Mala saves your count on this device.'}
]
export function devotionalApi(db,{send,read,field,date,href,fail,today,randomUUID}) {

  const addContent = db.prepare('INSERT OR IGNORE INTO devotional_content VALUES (?,?,?,?,?,?,?,?)')
  return async function devotional(req,res,path,user) {
    const method=req.method
    if (path==='/api/devotional' && method==='GET') {
      const content = await db.prepare('SELECT * FROM devotional_content ORDER BY day DESC,created DESC LIMIT 150').all()
      const defaults=initial.filter(item=>!content.some(saved=>saved.id===item.id))
      send(res,{...topics,deities,offerings,sections,content:[...content,...defaults],today:today()})
      return true
    }
    if (!['/api/mandir','/api/community','/api/devotional/content'].includes(path) && !path.startsWith('/api/community/')) return false
    if (path==='/api/mandir') {
      if (!user) fail(401,'Sign in to save your mandir.')
      if (method==='PUT') {
        const input=await read(req)
        if (!deities.includes(input.deity)) fail(400,'Choose a deity.')
        await db.prepare('INSERT INTO mandirs VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET deity=excluded.deity').run(user.id,input.deity)
      } else if (method==='POST') {
        const input=await read(req)
        if (!offerings.includes(input.offering)) fail(400,'Choose an offering.')
        if (!(await db.prepare('SELECT 1 FROM mandirs WHERE owner=?').get(user.id))) fail(409,'Save your mandir first.')
        await db.prepare('INSERT INTO mandir_activity VALUES (?,?,?,1) ON CONFLICT(owner,day,offering) DO UPDATE SET total=total+1').run(user.id,today(),input.offering)
      } else if (method!=='GET') return false
      const selected=await db.prepare('SELECT deity FROM mandirs WHERE owner=?').get(user.id)
      const activity=await db.prepare('SELECT day,offering,total FROM mandir_activity WHERE owner=? ORDER BY day DESC LIMIT 90').all(user.id)
      send(res,{deity:selected?.deity||null,activity})
      return true
    }
    if (path==='/api/devotional/content' && method==='POST') {
      if (user?.role!=='admin') fail(403,'Operations access is required.')
      const input=await read(req)
      const category=field(input,'category',20,true)
      if (!sections.includes(category)) fail(400,'Choose a content category.')
      const temple=field(input,'temple',30)
      if (temple && !topics.temples.some(item=>item.id===temple)) fail(400,'Choose a temple.')
      const day=input.day?date(input,'day'):''
      if (['panchang','horoscope','event'].includes(category) && !day) fail(400,'Choose a date for this entry.')
      const entry={id:randomUUID(),category,title:field(input,'title',120,true),text:field(input,'text',3000,true),
        url:href(input,'url',['audio','darshan'].includes(category)),day,temple,created:new Date().toISOString()}
      await addContent.run(...Object.values(entry))
      send(res,entry,201)
      return true
    }
    if (path==='/api/community' && method==='GET') {
      const query='SELECT community_posts.id,title,text,state,created,users.name AS author FROM community_posts JOIN users ON users.id=owner '
      const order=' ORDER BY created DESC LIMIT 75'
      const posts=user?.role==='admin'?await db.prepare(query+order).all():
        user?await db.prepare(query+"WHERE state='Published' OR owner=?"+order).all(user.id):
          await db.prepare(query+"WHERE state='Published'"+order).all()
      send(res,{posts})
      return true
    }
    if (path==='/api/community' && method==='POST') {
      if (!user) fail(401,'Sign in to submit a post.')
      const input=await read(req)
      const id=randomUUID()
      await db.prepare('INSERT INTO community_posts VALUES (?,?,?,?,?,?)').run(id,user.id,field(input,'title',100,true),
        field(input,'text',1500,true),'Pending',new Date().toISOString())
      send(res,{id,state:'Pending'},201)
      return true
    }
    if (path.startsWith('/api/community/') && method==='PATCH') {
      if (user?.role!=='admin') fail(403,'Operations access is required.')
      const id=path.split('/').at(-1)
      const {state}=await read(req)
      if (!['Published','Hidden'].includes(state)) fail(400,'Choose a moderation action.')
      const change=await db.prepare('UPDATE community_posts SET state=? WHERE id=?').run(state,id)
      if (!change.changes) fail(404,'Post not found.')
      send(res,{id,state})
      return true
    }
    return false
  }
}
