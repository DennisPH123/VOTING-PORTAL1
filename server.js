const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up image upload storage using Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration for secure admin login
app.use(session({
    secret: 'voting-portal-super-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Simple Admin Authentication Middleware
function isAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Admin login required.' });
}

// --- ADMIN ROUTES ---

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    // You can change 'admin123' to any password you prefer
    if (password === 'admin123') {
        req.session.isAdmin = true;
        res.json({ success: true, message: 'Logged in successfully' });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Admin Logout Route
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Add Category
app.post('/api/categories', isAdmin, (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO categories (name) VALUES (?)`, [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, categoryId: this.lastID });
    });
});

// Delete Category
app.delete('/api/categories/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM categories WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Add Nominee with Photo Upload
app.post('/api/nominees', isAdmin, upload.single('photo'), (req, res) => {
    const { category_id, name } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO nominees (category_id, name, photo_url) VALUES (?, ?, ?)`,
        [category_id, name, photo_url],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, nomineeId: this.lastID });
        }
    );
});

// Delete Nominee
app.delete('/api/nominees/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM nominees WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- PUBLIC & VOTING ROUTES ---

// Verify Employee ID against the authorized list from Excel
app.post('/api/verify-employee', (req, res) => {
    let { employee_id } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee ID is required.' });

    employee_id = employee_id.trim();

    db.get(`SELECT * FROM employees WHERE employee_id = ?`, [employee_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            return res.status(401).json({ error: 'Invalid Employee ID. You are not authorized to vote.' });
        }
        res.json({ success: true, employeeName: row.name });
    });
});

// Get all categories (Public)
app.get('/api/categories', (req, res) => {
    db.all(`SELECT * FROM categories`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all categories and their respective nominees for the voting page
app.get('/api/voting/data', (req, res) => {
    const categoryQuery = `SELECT * FROM categories`;
    db.all(categoryQuery, [], (err, categories) => {
        if (err) return res.status(500).json({ error: err.message });

        const nomineeQuery = `SELECT * FROM nominees`;
        db.all(nomineeQuery, [], (err, nominees) => {
            if (err) return res.status(500).json({ error: err.message });

            const result = categories.map(cat => {
                return {
                    category_id: cat.id,
                    category_name: cat.name,
                    nominees: nominees.filter(nom => nom.category_id === cat.id)
                };
            });

            res.json(result);
        });
    });
});

// Submit Votes (Ensures an employee can only vote once per category)
app.post('/api/votes', (req, res) => {
    const { employee_id, votes } = req.body; 

    if (!employee_id || !votes || Object.keys(votes).length === 0) {
        return res.status(400).json({ error: 'Employee ID and votes are required.' });
    }

    const stmt = db.prepare(`INSERT INTO votes (employee_id, category_id, nominee_id) VALUES (?, ?, ?)`);
    let hasError = false;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        for (const [categoryId, nomineeId] of Object.entries(votes)) {
            stmt.run(employee_id, categoryId, nomineeId, (err) => {
                if (err) {
                    hasError = true;
                }
            });
        }

        stmt.finalize();

        if (hasError) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'You have already voted in one or more of these categories!' });
        } else {
            db.run('COMMIT');
            res.json({ success: true, message: 'Votes recorded successfully!' });
        }
    });
});

// Get Live Tally (Admin view with real-time vote counts)
app.get('/api/admin/tally', isAdmin, (req, res) => {
    const query = `
        SELECT 
            c.id AS category_id,
            c.name AS category_name,
            n.id AS nominee_id,
            n.name AS nominee_name,
            n.photo_url,
            COUNT(v.id) AS vote_count
        FROM categories c
        LEFT JOIN nominees n ON c.id = n.category_id
        LEFT JOIN votes v ON n.id = v.nominee_id
        GROUP BY c.id, n.id
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Voting Portal running at http://localhost:${PORT}`);
});