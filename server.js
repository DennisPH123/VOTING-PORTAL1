const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing request bodies and sessions
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: true
}));

// Serve static files (HTML, CSS, client-side JS) from the root directory or a 'public' folder
// If your html files are directly in the project root:
app.use(express.static(__dirname));

// (Optional) Explicit route for admin dashboard incase direct file mapping fails
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});