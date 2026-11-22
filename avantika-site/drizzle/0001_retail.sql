CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>0), stock INTEGER NOT NULL CHECK(stock>=0), active INTEGER NOT NULL CHECK(active IN (0,1)));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cart(owner TEXT REFERENCES users(id), product TEXT REFERENCES products(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20), PRIMARY KEY(owner,product));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS retail_orders(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, address TEXT NOT NULL, pin TEXT NOT NULL, status TEXT NOT NULL, total INTEGER NOT NULL, created TEXT NOT NULL, tracking TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS retail_lines(order_id TEXT REFERENCES retail_orders(id), product TEXT REFERENCES products(id), name TEXT NOT NULL, price INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY(order_id,product));
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS reserve_retail_cart AFTER INSERT ON retail_orders BEGIN
  INSERT INTO retail_lines SELECT NEW.id,p.id,p.name,p.price,c.quantity FROM cart c JOIN products p ON p.id=c.product WHERE c.owner=NEW.owner;
  UPDATE products SET stock=stock-(SELECT quantity FROM cart WHERE owner=NEW.owner AND product=products.id)
    WHERE id IN (SELECT product FROM cart WHERE owner=NEW.owner);
  DELETE FROM cart WHERE owner=NEW.owner;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS release_retail_stock AFTER UPDATE OF status ON retail_orders
WHEN NEW.status='Cancelled' AND OLD.status IN ('Submitted','Confirmed') BEGIN
  UPDATE products SET stock=stock+(SELECT quantity FROM retail_lines WHERE order_id=NEW.id AND product=products.id)
    WHERE id IN (SELECT product FROM retail_lines WHERE order_id=NEW.id);
END;
