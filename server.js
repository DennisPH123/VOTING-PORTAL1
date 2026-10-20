const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: true
}));

// Serve static files from 'public' and uploads folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration for Nominee Pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Connect to SQLite Database & Create Tables
const dbPath = path.join(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS nominees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            name TEXT NOT NULL,
            image TEXT,
            FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT,
            category_id INTEGER,
            nominee_id INTEGER,
            UNIQUE(employee_id, category_id)
        )`);
    }
});

// --- VOTER ROUTES ---
app.post('/api/voter/login', (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, error: 'Employee ID is required' });

    req.session.employeeId = employeeId.trim();
    res.json({ success: true });
});

// Get categories, nominees, and voting status for the voter ballot page
app.get('/api/voter/ballot-data', (req, res) => {
    if (!req.session.employeeId) return res.status(401).json({ error: 'Unauthorized' });

    db.all("SELECT * FROM categories", [], (err, categories) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM nominees", [], (err, nominees) => {
            if (err) return res.status(500).json({ error: err.message });

            // Check what this employee has already voted for
            db.all("SELECT category_id FROM votes WHERE employee_id = ?", [req.session.employeeId], (err, userVotes) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({ 
                    categories, 
                    nominees, 
                    votedCategories: userVotes.map(v => v.category_id) 
                });
            });
        });
    });
});

// Submit a vote
app.post('/api/voter/vote', (req, res) => {
    if (!req.session.employeeId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { categoryId, nomineeId } = req.body;

    db.run("INSERT OR IGNORE INTO votes (employee_id, category_id, nominee_id) VALUES (?, ?, ?)", 
        [req.session.employeeId, categoryId, nomineeId], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (this.changes === 0) return res.status(400).json({ success: false, error: 'You have already voted in this category!' });
        res.json({ success: true, message: 'Vote recorded successfully' });
    });
});

// --- ADMIN AUTH & ROUTES ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') { // Change admin password here if desired
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: 'Incorrect password' });
});

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// Get admin data & live vote tally results
app.get('/api/admin/data', requireAdmin, (req, res) => {
    db.all("SELECT * FROM categories", [], (err, categories) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM nominees", [], (err, nominees) => {
            if (err) return res.status(500).json({ error: err.message });

            // Fetch live vote tally count per nominee
            db.all(`SELECT nominee_id, COUNT(*) as vote_count FROM votes GROUP BY nominee_id`, [], (err, tallies) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({ 
                    categories: categories || [], 
                    nominees: nominees || [], 
                    tallies: tallies || [] 
                });
            });
        });
    });
});

app.post('/api/admin/category', requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    db.run("INSERT INTO categories (name) VALUES (?)", [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.post('/api/admin/nominee', requireAdmin, upload.single('image'), (req, res) => {
    const { categoryId, name } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!categoryId || !name) return res.status(400).json({ error: 'Category and name are required' });

    db.run("INSERT INTO nominees (category_id, name, image) VALUES (?, ?, ?)", [categoryId, name, imagePath], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/admin/category/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM categories WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/admin/nominee/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM nominees WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});