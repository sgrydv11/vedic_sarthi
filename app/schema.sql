CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, owner TEXT REFERENCES users(id), expires INTEGER);
CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, owner TEXT REFERENCES users(id), assigned TEXT REFERENCES users(id), kind TEXT, title TEXT, status TEXT, details TEXT, history TEXT, created TEXT, UNIQUE(owner,id));
CREATE TABLE IF NOT EXISTS mandirs(owner TEXT PRIMARY KEY REFERENCES users(id), deity TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mandir_activity(owner TEXT REFERENCES users(id), day TEXT, offering TEXT, total INTEGER NOT NULL, PRIMARY KEY(owner,day,offering));
CREATE TABLE IF NOT EXISTS devotional_content(id TEXT PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL, url TEXT NOT NULL, day TEXT NOT NULL, temple TEXT NOT NULL, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS community_posts(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, text TEXT NOT NULL, state TEXT NOT NULL, created TEXT NOT NULL);
