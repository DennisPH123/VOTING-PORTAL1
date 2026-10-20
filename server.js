const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to SQLite Database and Auto-Create Tables if missing
const dbPath = path.join(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create tables automatically so queries never fail with "no such table"
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS nominees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            name TEXT NOT NULL,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        )`);
    }
});

// --- ADMIN API ROUTES ---

app.get('/api/admin/data', (req, res) => {
    db.all("SELECT * FROM categories", [], (err, categories) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM nominees", [], (err, nominees) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ categories: categories || [], nominees: nominees || [] });
        });
    });
});

app.post('/api/admin/category', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    db.run("INSERT INTO categories (name) VALUES (?)", [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID, message: 'Category added successfully' });
    });
});

app.post('/api/admin/nominee', (req, res) => {
    const { categoryId, name } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: 'Category and nominee name are required' });

    db.run("INSERT INTO nominees (category_id, name) VALUES (?, ?)", [categoryId, name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID, message: 'Nominee added successfully' });
    });
});

app.delete('/api/admin/category/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM categories WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Category deleted successfully' });
    });
});

app.delete('/api/admin/nominee/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM nominees WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Nominee deleted successfully' });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});