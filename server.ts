import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import path from 'path';
import { createServer as createViteServer } from 'vite';

declare module 'express-session' {
  interface SessionData {
    userId: number;
    role: 'student' | 'warden';
    name: string;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(session({
  secret: 'hostel-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true,
    sameSite: 'none',
    httpOnly: true
  }
}));

const dbPath = path.join(process.cwd(), 'hostel.db');
const db = new sqlite3.Database(dbPath);

// --- Database Initialization ---
const initDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('student', 'warden')) NOT NULL,
        room_no TEXT,
        parent_contact TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT CHECK(type IN ('Home Visit', 'Outing', 'Emergency')) NOT NULL,
        from_date DATETIME NOT NULL,
        to_date DATETIME NOT NULL,
        reason TEXT NOT NULL,
        status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
        warden_comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  });
};
initDb();

// --- Auth Middleware ---
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

const isWarden = (req: any, res: any, next: any) => {
  if (req.session.role === 'warden') return next();
  res.status(403).json({ error: 'Forbidden' });
};

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, role, room_no, parent_contact } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    'INSERT INTO users (username, password, name, role, room_no, parent_contact) VALUES (?, ?, ?, ?, ?, ?)',
    [username, hashedPassword, name, role, room_no, parent_contact],
    function(err) {
      if (err) return res.status(400).json({ error: 'Username already exists' });
      res.json({ id: this.lastID });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user: any) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.name = user.name;
    
    res.json({ id: user.id, role: user.role, name: user.name });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  res.json({ id: req.session.userId, role: req.session.role, name: req.session.name });
});

// Leave Requests
app.get('/api/leaves', isAuthenticated, (req, res) => {
  let sql = 'SELECT lr.*, u.name as student_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id';
  let params: any[] = [];
  
  if (req.session.role === 'student') {
    sql += ' WHERE lr.user_id = ?';
    params.push(req.session.userId);
  }
  
  sql += ' ORDER BY lr.created_at DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/leaves', isAuthenticated, (req, res) => {
  const { type, from_date, to_date, reason } = req.body;
  db.run(
    'INSERT INTO leave_requests (user_id, type, from_date, to_date, reason, status) VALUES (?, ?, ?, ?, ?, ?)',
    [req.session.userId, type, from_date, to_date, reason, 'Pending'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.patch('/api/leaves/:id', isAuthenticated, isWarden, (req, res) => {
  const { status, warden_comments } = req.body;
  db.run(
    'UPDATE leave_requests SET status = ?, warden_comments = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, warden_comments, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// --- Seed Warden ---
const seedWarden = async () => {
  const wardenUsername = 'warden';
  const wardenPassword = 'warden123';
  const hashedPassword = await bcrypt.hash(wardenPassword, 10);
  
  db.get('SELECT * FROM users WHERE username = ?', [wardenUsername], (err, row) => {
    if (!row) {
      db.run(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [wardenUsername, hashedPassword, 'Chief Warden', 'warden']
      );
    }
  });
};
seedWarden();

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
