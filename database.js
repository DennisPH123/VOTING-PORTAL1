const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    // 1. Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    )`);

    // 2. Nominees Table
    db.run(`CREATE TABLE IF NOT EXISTS nominees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT NOT NULL,
        photo_url TEXT,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    )`);

    // 3. Employees Table (Authorized voters)
    db.run(`CREATE TABLE IF NOT EXISTS employees (
        employee_id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    )`, () => {
        // Automatically import from 'voting tags.xlsx' if the table is empty
        db.get(`SELECT COUNT(*) as count FROM employees`, (err, row) => {
            if (row && row.count === 0) {
                importEmployeesFromExcel();
            }
        });
    });

    // 4. Votes Table
    db.run(`CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        category_id INTEGER,
        nominee_id INTEGER,
        UNIQUE(employee_id, category_id),
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
    )`);
});

function importEmployeesFromExcel() {
    try {
        const excelPath = path.resolve(__dirname, 'voting tags.xlsx');
        if (!fs.existsSync(excelPath)) {
            console.log('Excel file not found for automatic import.');
            return;
        }

        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        const stmt = db.prepare(`INSERT OR IGNORE INTO employees (employee_id, name) VALUES (?, ?)`);
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            sheetData.forEach(row => {
                if (row[0] && row[1]) {
                    // Clean up whitespace/strings
                    const empId = String(row[0]).trim();
                    const empName = String(row[1]).trim();
                    stmt.run(empId, empName);
                }
            });
            stmt.finalize();
            db.run('COMMIT');
            console.log('Successfully imported authorized employees from Excel file!');
        });
    } catch (e) {
        console.error('Error importing employees:', e.message);
    }
}

module.exports = db;