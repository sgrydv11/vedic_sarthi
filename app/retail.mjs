export function retailApi(db,{send,read,field,href,fail}) {
  const cart = owner => db.prepare('SELECT p.id,p.name,p.price,p.stock,p.active,c.quantity FROM cart c JOIN products p ON p.id=c.product WHERE c.owner=? ORDER BY p.name').all(owner)
  const stages={Submitted:'Confirmed',Confirmed:'Dispatched',Dispatched:'Delivered'}
  return async (req,res,path,user) => {
    if (!path.startsWith('/api/shop/')) return false
    const method=req.method
    const route=path.slice('/api/shop/'.length)
    if (route==='products' && method==='GET') {
      const products=await db.prepare(user?.role==='admin'?'SELECT * FROM products ORDER BY name':'SELECT * FROM products WHERE active=1 ORDER BY name').all()
      send(res,{products})
      return true
    }
    if (!user) fail(401,'Sign in to continue.')
    if (route==='products' && method==='PUT') {
      if (user.role!=='admin') fail(403,'Operations access is required.')
      const input=await read(req)
      const id=field(input,'id',40,true)
      if (!/^[a-z0-9-]+$/.test(id) || !Number.isSafeInteger(input.price) || input.price<1 || input.price>100000 || !Number.isSafeInteger(input.stock) || input.stock<0 || input.stock>100000 || typeof input.active!=='boolean') fail(400,'Check the product ID, price and inventory.')
      await db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,price=excluded.price,stock=excluded.stock,active=excluded.active')
        .run(id,field(input,'name',100,true),field(input,'description',900,true),input.price,input.stock,input.active?1:0)
      send(res,{id});return true
    }
    if (route==='cart' && ['GET','PUT'].includes(method)) {
      if (user.role!=='devotee') fail(403,'Use a devotee account to shop.')
      if (method==='PUT') {
        const input=await read(req)
        const id=field(input,'product',40,true)
        const quantity=input.quantity
        if (!Number.isInteger(quantity)||quantity<0||quantity>20) fail(400,'Enter a quantity from 0 to 20.')
        if (quantity===0) await db.prepare('DELETE FROM cart WHERE owner=? AND product=?').run(user.id,id)
        else {
          const change=await db.prepare('INSERT INTO cart SELECT ?,id,? FROM products WHERE id=? AND active=1 AND stock>=? ON CONFLICT(owner,product) DO UPDATE SET quantity=excluded.quantity').run(user.id,quantity,id,quantity)
          if (!change.changes) fail(409,'This quantity is unavailable.')
        }
      }
      send(res,{items:await cart(user.id)});return true
    }
    if (route==='orders' && method==='POST') {
      if (user.role!=='devotee') fail(403,'Use a devotee account to place an order.')
      const input=await read(req)
      const id=field(input,'id',36,true)
      const pin=field(input,'pin',6,true)
      if (!/^[a-f0-9-]{36}$/.test(id)||! /^[1-9]\d{5}$/.test(pin)||!Number.isSafeInteger(input.total)||input.total<1) fail(400,'Check the PIN and order total.')
      const change=await db.prepare(`
        INSERT INTO retail_orders(id,owner,name,address,pin,status,total,created)
        SELECT ?,?,?,?,?, 'Submitted',SUM(p.price*c.quantity),?
        FROM cart c JOIN products p ON p.id=c.product WHERE c.owner=?
        HAVING COUNT(*)>0 AND SUM(p.price*c.quantity)=? AND MIN(p.active)=1 AND MIN(p.stock-c.quantity)>=0
        ON CONFLICT(id) DO NOTHING
      `).run(id,user.id,field(input,'name',100,true),field(input,'address',450,true),pin,new Date().toISOString(),user.id,input.total)
      if (!change.changes) {
        const saved=await db.prepare('SELECT id FROM retail_orders WHERE id=? AND owner=?').get(id,user.id)
        if (!saved) fail(409,'Cart prices or stock changed. Review your cart and try again.')
      }
      send(res,{id},change.changes?201:200);return true
    }
    if (route==='orders' && method==='GET') {
      if (!['devotee','admin'].includes(user.role)) fail(403,'Orders are available to devotees and operations.')
      const where=user.role==='admin'?'':' WHERE o.owner=?'
      const rows=await db.prepare(`SELECT o.*,l.product,l.name AS item,l.price,l.quantity FROM retail_orders o JOIN retail_lines l ON l.order_id=o.id
        JOIN (SELECT id FROM retail_orders${user.role==='admin'?'':' WHERE owner=?'} ORDER BY created DESC LIMIT 50) recent ON recent.id=o.id${where}
        ORDER BY o.created DESC,l.name`).all(...(where?[user.id,user.id]:[]))
      const orders=new Map()
      for (const row of rows) {
        const {product,item,price,quantity,...order}=row
        if (!orders.has(row.id)) orders.set(row.id,{...order,items:[]})
        orders.get(row.id).items.push({product,name:item,price,quantity})
      }
      send(res,{orders:[...orders.values()]});return true
    }
    if (route.startsWith('orders/') && method==='PATCH') {
      const id=route.split('/')[1]
      const input=await read(req)
      const order=await db.prepare('SELECT owner,status FROM retail_orders WHERE id=?').get(id)
      if (!order||(user.role!=='admin'&&order.owner!==user.id)) fail(404,'Order not found.')
      if (order.status!==input.expected) fail(409,'The order changed. Refresh and try again.')
      const cancel=input.action==='cancel'
      const next=cancel&&['Submitted','Confirmed'].includes(order.status)?'Cancelled':!cancel&&user.role==='admin'?stages[order.status]:null
      if (!next) fail(403,'This order cannot be changed.')
      const tracking=next==='Dispatched'?href(input,'tracking'):''
      const changed=await db.prepare("UPDATE retail_orders SET status=?,tracking=CASE WHEN ?='' THEN tracking ELSE ? END WHERE id=? AND status=?")
        .run(next,tracking,tracking,id,order.status)
      if (!changed.changes) fail(409,'The order changed. Refresh and try again.')
      send(res,{id,status:next});return true
    }
    fail(404,'Shop route not found.')
  }
}
