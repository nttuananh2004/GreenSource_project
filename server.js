const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = ProcessingInstruction.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
// Phục vụ file tĩnh (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// KẾT NỐI DATABASE
const dbPath = path.join(__dirname, 'supplier_eval.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Lỗi kết nối DB:', err.message);
    else {
        console.log('Connected to SQLite Database.');
        initializeDB();
    }
});

function initializeDB() {
    db.serialize(() => {
        // Tạo bảng Users
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            email TEXT,
            phone TEXT
        )`);

        // Khởi tạo Admin mặc định
        db.get("SELECT count(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO users (username, password, role, email, phone) VALUES (?, ?, ?, ?, ?)");
                stmt.run("admin", "admin123", "admin", "admin@green.com", "0909000111");
                stmt.finalize();
                console.log("Admin mặc định: admin/admin123");
            }
        });

        // Tạo bảng Suppliers
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            default_price REAL DEFAULT 0,
            default_quality REAL DEFAULT 0,
            default_time REAL DEFAULT 0,
            default_capacity INTEGER DEFAULT 0
        )`);

        // Các bảng phục vụ lưu lịch sử và kết quả
        db.run(`CREATE TABLE IF NOT EXISTS criteria (id INTEGER PRIMARY KEY, name TEXT, type TEXT)`);
        const criteria = [{ name: 'Price', type: 'COST' }, { name: 'Quality', type: 'BENEFIT' }, { name: 'Time', type: 'COST' }];
        criteria.forEach(c => db.run(`INSERT OR IGNORE INTO criteria (name, type) VALUES (?, ?)`, [c.name, c.type]));

        db.run(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, total_demand INTEGER, min_avg_score REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS project_criteria_weights (project_id INTEGER, criteria_id INTEGER, weight REAL)`);
        db.run(`CREATE TABLE IF NOT EXISTS project_supplier_capacity (project_id INTEGER, supplier_id INTEGER, max_capacity INTEGER)`);
        db.run(`CREATE TABLE IF NOT EXISTS supplier_evaluation_values (project_id INTEGER, supplier_id INTEGER, criteria_id INTEGER, raw_value REAL)`);
        db.run(`CREATE TABLE IF NOT EXISTS optimization_results (project_id INTEGER, supplier_id INTEGER, topsis_score REAL, allocated_amount INTEGER, total_cost REAL)`);
    });
}

// ============================================================
// 1. API AUTHENTICATION
// ============================================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) res.json({ success: true, role: row.role, username: row.username });
        else res.status(401).json({ success: false, message: "Sai thông tin đăng nhập" });
    });
});

app.post('/api/register', (req, res) => {
    const { username, password, email, phone } = req.body;
    const role = 'user';
    db.run(`INSERT INTO users (username, password, role, email, phone) VALUES (?, ?, ?, ?, ?)`, 
        [username, password, role, email, phone], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Username đã tồn tại" });
        res.json({ success: true, message: "Đăng ký thành công!" });
    });
});

// ============================================================
// 2. API QUẢN LÝ USER (CHO ADMIN)
// ============================================================
app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, role, email, phone FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/users/:id', (req, res) => {
    const id = req.params.id;
    if(id == 1) return res.status(403).json({ error: "Cannot delete Super Admin!" });
    db.run("DELETE FROM users WHERE id = ?", id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User deleted!" });
    });
});

// CẬP NHẬT USER (Full thông tin)
app.put('/api/users/:id', (req, res) => {
    const { role, email, phone, password } = req.body; // Nhận thêm email, phone
    const id = req.params.id;

    if (password) {
        // Nếu có nhập password mới -> Cập nhật tất cả kèm password
        const sql = "UPDATE users SET role = ?, email = ?, phone = ?, password = ? WHERE id = ?";
        db.run(sql, [role, email, phone, password, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        // Nếu không đổi pass -> Chỉ cập nhật thông tin cá nhân
        const sql = "UPDATE users SET role = ?, email = ?, phone = ? WHERE id = ?";
        db.run(sql, [role, email, phone, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

// ============================================================
// 3. API CRUD SUPPLIERS (NHÀ CUNG CẤP)
// ============================================================
app.get('/api/providers', (req, res) => {
    db.all(`SELECT id, name, default_price as price, default_quality as quality, default_time as time, default_capacity as capacity FROM suppliers`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/providers/all', (req, res) => {
    // console.log('Delete all suppliers');

    db.serialize(() => {
        db.run("DELETE FROM suppliers", function(err) {
            if (err) {
                console.error('Error deleting suppliers:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    error: err.message 
                });
            }

            console.log('Suppliers deleted!');

            // Reset ID (để lần sau thêm lại bắt đầu từ 1)
            db.run("DELETE FROM sqlite_sequence WHERE name = 'suppliers'", (err) => {
                if (err) console.error('Reset error:', err.message);
                else console.log('Reset ID suppliers');

                res.json({ 
                    success: true, 
                    message: "Deleting all suppliers successfully!" 
                });
            });
        });
    });
});

app.post('/api/providers', (req, res) => {
    const { name, price, quality, time, capacity } = req.body;
    db.run(`INSERT INTO suppliers (name, default_price, default_quality, default_time, default_capacity) VALUES (?, ?, ?, ?, ?)`, 
        [name, price, quality, time, capacity], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, price, quality, time, capacity });
    });
});

app.put('/api/providers/:id', (req, res) => {
    const { name, price, quality, time, capacity } = req.body;
    db.run(`UPDATE suppliers SET name=?, default_price=?, default_quality=?, default_time=?, default_capacity=? WHERE id=?`, 
        [name, price, quality, time, capacity, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/providers/:id', (req, res) => {
    db.run(`DELETE FROM suppliers WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
});


// ============================================================
// 4. API OPTIMIZATION ENGINE (TOPSIS + SCORE-BASED ALLOCATION)
// ============================================================
app.post('/api/optimize', (req, res) => {
    const { totalUnits, minScore, weights } = req.body; 
    
    db.all(`SELECT id, name, default_price as price, default_quality as quality, default_time as time, default_capacity as capacity FROM suppliers`, [], (err, providers) => {
        if (err) return res.status(500).json({ error: err.message });
        if (providers.length === 0) return res.status(400).json({ error: "Chưa có dữ liệu nhà cung cấp!" });

        // --- BƯỚC 1: TÍNH TOÁN TOPSIS ---

        // 1. Tính Vector Norm
        let sumSq = { price: 0, quality: 0, time: 0 };
        providers.forEach(p => {
            sumSq.price += p.price ** 2;
            sumSq.quality += p.quality ** 2;
            sumSq.time += p.time ** 2;
        });

        const normDiv = {
            price: Math.sqrt(sumSq.price) || 1,
            quality: Math.sqrt(sumSq.quality) || 1,
            time: Math.sqrt(sumSq.time) || 1
        };

        // 2. Chuẩn hóa & Nhân trọng số
        let matrix = providers.map(p => ({
            id: p.id,
            normP: (p.price / normDiv.price) * weights[0],
            normQ: (p.quality / normDiv.quality) * weights[1],
            normT: (p.time / normDiv.time) * weights[2]
        }));

        // 3. Tìm giải pháp lý tưởng (A+) và tệ nhất (A-)
        const idealBest = {
            p: Math.min(...matrix.map(m => m.normP)), // Giá: Min tốt
            q: Math.max(...matrix.map(m => m.normQ)), // Chất lượng: Max tốt
            t: Math.min(...matrix.map(m => m.normT))  // Thời gian: Min tốt
        };
        const idealWorst = {
            p: Math.max(...matrix.map(m => m.normP)),
            q: Math.min(...matrix.map(m => m.normQ)),
            t: Math.max(...matrix.map(m => m.normT))
        };

        // 4. Tính điểm TOPSIS (Si)
        let scoredProviders = providers.map((p, i) => {
            const m = matrix[i];
            const dPlus = Math.sqrt((m.normP - idealBest.p)**2 + (m.normQ - idealBest.q)**2 + (m.normT - idealBest.t)**2);
            const dMinus = Math.sqrt((m.normP - idealWorst.p)**2 + (m.normQ - idealWorst.q)**2 + (m.normT - idealWorst.t)**2);
            // Tránh chia cho 0
            const topsisScore = (dPlus + dMinus) === 0 ? 0 : (dMinus / (dPlus + dMinus));
            return { ...p, topsisScore };
        });

        // --- BƯỚC 2: PHÂN BỔ HÀNG (SỬA ĐỔI QUAN TRỌNG) ---
        
        // Sắp xếp theo ĐIỂM TOPSIS CAO NHẤT (b - a) thay vì GIÁ THẤP NHẤT
        let sortedForAllocation = [...scoredProviders].sort((a, b) => b.topsisScore - a.topsisScore);

        let remaining = totalUnits;
        let allocationResults = [];
        let totalCost = 0;
        let weightedScoreSum = 0;

        sortedForAllocation.forEach(p => {
            let buy = Math.min(remaining, p.capacity);
            if (remaining > 0) remaining -= buy;
            
            const cost = buy * p.price;
            totalCost += cost;
            if (buy > 0) weightedScoreSum += (buy * p.topsisScore);
            
            allocationResults.push({ ...p, allocated: buy, totalItemCost: cost });
        });

        const finalAvgScore = weightedScoreSum / totalUnits;
        const summary = { 
            totalCost, 
            finalAvgScore: finalAvgScore || 0, 
            isEnough: remaining === 0, 
            isPass: (finalAvgScore || 0) >= minScore 
        };

        // --- BƯỚC 3: LƯU VÀO DATABASE ---
        const timestamp = new Date().toISOString();
        const projectName = `Run ${timestamp}`;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(`INSERT INTO projects (name, total_demand, min_avg_score) VALUES (?, ?, ?)`, 
                [projectName, totalUnits, minScore], function(err) {
                if (err) { db.run("ROLLBACK"); return res.status(500).json(err); }
                const projectId = this.lastID;

                const wStmt = db.prepare(`INSERT INTO project_criteria_weights (project_id, criteria_id, weight) VALUES (?, (SELECT id FROM criteria WHERE name = ?), ?)`);
                wStmt.run(projectId, 'Price', weights[0]);
                wStmt.run(projectId, 'Quality', weights[1]);
                wStmt.run(projectId, 'Time', weights[2]);
                wStmt.finalize();

                const capStmt = db.prepare(`INSERT INTO project_supplier_capacity (project_id, supplier_id, max_capacity) VALUES (?, ?, ?)`);
                const valStmt = db.prepare(`INSERT INTO supplier_evaluation_values (project_id, supplier_id, criteria_id, raw_value) VALUES (?, ?, (SELECT id FROM criteria WHERE name = ?), ?)`);
                const resStmt = db.prepare(`INSERT INTO optimization_results (project_id, supplier_id, topsis_score, allocated_amount, total_cost) VALUES (?, ?, ?, ?, ?)`);

                allocationResults.forEach(r => {
                    capStmt.run(projectId, r.id, r.capacity);
                    valStmt.run(projectId, r.id, 'Price', r.price);
                    valStmt.run(projectId, r.id, 'Quality', r.quality);
                    valStmt.run(projectId, r.id, 'Time', r.time);
                    resStmt.run(projectId, r.id, r.topsisScore, r.allocated, r.totalItemCost);
                });

                capStmt.finalize(); valStmt.finalize(); resStmt.finalize();
                
                db.run("COMMIT", (err) => {
                    if (err) return res.status(500).json(err);
                    res.json({ success: true, projectId, summary, results: allocationResults });
                });
            });
        });
    });
});

// Chuyển hướng trang chủ về login
app.get('/', (req, res) => res.redirect('/login.html'));

app.listen(PORT, () => {
    console.log(`Server is running at: http://localhost:${PORT}`);
});