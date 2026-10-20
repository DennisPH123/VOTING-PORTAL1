const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

const dbPath = path.join(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        
        // Categories table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`);

        // Nominees table
        db.run(`CREATE TABLE IF NOT EXISTS nominees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            name TEXT NOT NULL,
            image TEXT,
            FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
        )`);

        // Votes table
        db.run(`CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT,
            category_id INTEGER,
            nominee_id INTEGER,
            UNIQUE(employee_id, category_id)
        )`);

        // Employees table (for name personalization)
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            employee_id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        )`, () => {
            // Insert a test employee if table is empty
            db.get(`SELECT COUNT(*) as count FROM employees`, (err, row) => {
                if (row.count === 0) {
                    db.run(`INSERT INTO employees (employee_id, name) VALUES ('ACT1505', 'Irene')`);
                    db.run(`INSERT INTO employees (employee_id, name) VALUES ('ACT1001', 'Dennis')`);
                }
            });
        });
    }
});

// --- VOTER LOGIN & PERSONALIZATION ---
app.post('/api/voter/login', (req, res) => {
    let { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, error: 'Employee ID is required' });
    employeeId = employeeId.trim();

    db.get(`SELECT name FROM employees WHERE employee_id = ?`, [employeeId], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        
        // If employee isn't pre-registered, give them a default name or allow generic login
        const employeeName = row ? row.name : 'Colleague';

        req.session.employeeId = employeeId;
        req.session.employeeName = employeeName;
        res.json({ success: true, name: employeeName });
    });
});

app.get('/api/voter/ballot-data', (req, res) => {
    if (!req.session.employeeId) return res.status(401).json({ error: 'Unauthorized' });

    db.all("SELECT * FROM categories", [], (err, categories) => {
        db.all("SELECT * FROM nominees", [], (err2, nominees) => {
            db.all("SELECT category_id FROM votes WHERE employee_id = ?", [req.session.employeeId], (err3, userVotes) => {
                res.json({ 
                    employeeName: req.session.employeeName || 'Colleague',
                    categories: categories || [], 
                    nominees: nominees || [], 
                    votedCategories: (userVotes || []).map(v => v.category_id) 
                });
            });
        });
    });
});

app.post('/api/voter/vote', (req, res) => {
    if (!req.session.employeeId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { categoryId, nomineeId } = req.body;

    db.run("INSERT OR IGNORE INTO votes (employee_id, category_id, nominee_id) VALUES (?, ?, ?)", 
        [req.session.employeeId, categoryId, nomineeId], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (this.changes === 0) return res.status(400).json({ success: false, error: 'You have already voted in this category!' });
        res.json({ success: true });
    });
});

// --- ADMIN ROUTES ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: 'Incorrect password' });
});

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/admin/data', requireAdmin, (req, res) => {
    db.all("SELECT * FROM categories", [], (err, categories) => {
        db.all("SELECT * FROM nominees", [], (err2, nominees) => {
            db.all(`SELECT nominee_id, COUNT(*) as vote_count FROM votes GROUP BY nominee_id`, [], (err3, tallies) => {
                db.all("SELECT * FROM employees", [], (err4, employees) => {
                    res.json({ 
                        categories: categories || [], 
                        nominees: nominees || [], 
                        tallies: tallies || [],
                        employees: employees || []
                    });
                });
            });
        });
    });
});

app.post('/api/admin/category', requireAdmin, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO categories (name) VALUES (?)", [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.post('/api/admin/nominee', requireAdmin, upload.single('image'), (req, res) => {
    const { categoryId, name } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    db.run("INSERT INTO nominees (category_id, name, image) VALUES (?, ?, ?)", [categoryId, name, imagePath], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Add new employee ID mapping from admin panel
app.post('/api/admin/employee', requireAdmin, (req, res) => {
    const { employeeId, name } = req.body;
    db.run("INSERT OR REPLACE INTO employees (employee_id, name) VALUES (?, ?)", [employeeId.trim(), name.trim()], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/admin/category/:id', requireAdmin, (req, res) => {
    db.run("DELETE FROM categories WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

app.delete('/api/admin/nominee/:id', requireAdmin, (req, res) => {
    db.run("DELETE FROM nominees WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));