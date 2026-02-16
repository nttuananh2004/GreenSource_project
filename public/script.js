document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.origin + '/api';
    let providersData = []; 

    // ==========================================
    // 1. AUTHENTICATION (LOGIN / REGISTER)
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm && registerForm) {
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');
        const msgBox = document.getElementById('authMessage');

        document.getElementById('showRegister').onclick = () => {
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
            msgBox.style.display = 'none';
        };
        document.getElementById('showLogin').onclick = () => {
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            msgBox.style.display = 'none';
        };

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUser').value;
            const password = document.getElementById('loginPass').value;

            fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('username', data.username);
                    window.location.href = data.role === 'admin' ? 'admin.html' : 'user.html';
                } else {
                    msgBox.textContent = data.message; // Message from server (usually English if backend is English) or translate here
                    msgBox.style.display = 'block';
                }
            })
            .catch(() => {
                msgBox.textContent = "Server connection error!";
                msgBox.style.display = 'block';
            });
        });

        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const payload = {
                username: document.getElementById('regUser').value,
                password: document.getElementById('regPass').value,
                email: document.getElementById('regEmail').value,
                phone: document.getElementById('regPhone').value
            };
            fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    msgBox.textContent = "Registration successful!";
                    msgBox.style.color = "green";
                    msgBox.style.display = 'block';
                    registerForm.reset();
                    setTimeout(() => document.getElementById('showLogin').click(), 1500);
                } else {
                    msgBox.textContent = data.message;
                    msgBox.style.display = 'block';
                }
            });
        });
        return; 
    }

    // ==========================================
    // 2. GUARD & LOGOUT
    // ==========================================
    if (!localStorage.getItem('userRole')) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // ==========================================
    // 3. ADMIN PAGE LOGIC (SUPPLIERS)
    // ==========================================
    const adminProviderForm = document.getElementById('providerForm');
    
    if (adminProviderForm) {
        const editIdInput = document.getElementById('editId');
        const cancelBtn = document.getElementById('cancelEditBtn'); 

        fetchProviders();

        // Handle Delete All Button
        // XỬ LÝ NÚT DELETE ALL (TRONG TRANG ADMIN.HTML)
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.onclick = () => {
            if (!confirm("Warning: Do you want to delete all the users?")) return;

            const pass = prompt("Input admin password:");
            if (pass !== "admin123") {
                if (pass) alert("Wrong password!");
                return;
            }

            fetch(`${API_URL}/providers/all`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                console.log('📨 Response delete all:', data);   // ← Dùng để debug

                if (data.success) {
                    alert(data.message);
                    window.location.reload();
                } else {
                    alert("Error: " + (data.error || data.message || JSON.stringify(data) || "undefined!!"));
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                alert("Fail to connect to server: " + err.message);
            });
        };
    }
        adminProviderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = editIdInput.value;
            const payload = {
                name: document.getElementById('providerName').value,
                price: parseFloat(document.getElementById('price').value),
                quality: parseFloat(document.getElementById('quality').value),
                time: parseFloat(document.getElementById('time').value),
                capacity: parseInt(document.getElementById('capacity').value)
            };

            const method = editId ? 'PUT' : 'POST';
            const url = editId ? `${API_URL}/providers/${editId}` : `${API_URL}/providers`;

            fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if(data.error) alert('Error: ' + data.error);
                else {
                    resetAdminForm();    
                    fetchProviders();    
                    alert(editId ? 'Update successful!' : 'Added successfully!');
                }
            })
            .catch(err => alert("System error: " + err));
        });

        if (cancelBtn) cancelBtn.onclick = resetAdminForm;
    }

    function fetchProviders() {
        fetch(`${API_URL}/providers?t=${new Date().getTime()}`)
            .then(res => res.json())
            .then(data => {
                providersData = data;
                renderAdminTable(data);
            });
    }

    function renderAdminTable(data) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        document.getElementById('count').textContent = data.length;
        tbody.innerHTML = data.map(p => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>$${p.price}</td>
                <td>${p.quality}/10</td>
                <td>${p.time} days</td>
                <td>${p.capacity.toLocaleString()}</td>
                <td>
                    <button onclick="editProvider(${p.id})" style="color: #3B82F6; border:none; background:none; cursor:pointer; margin-right:10px;" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteProvider(${p.id})" style="color: #EF4444; border:none; background:none; cursor:pointer;" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    }

    // Global functions for HTML access
    window.editProvider = (id) => {
        const p = providersData.find(item => item.id === id);
        if (!p) return;
        document.getElementById('editId').value = p.id;
        document.getElementById('providerName').value = p.name;
        document.getElementById('price').value = p.price;
        document.getElementById('quality').value = p.quality;
        document.getElementById('time').value = p.time;
        document.getElementById('capacity').value = p.capacity;

        document.getElementById('formTitle').innerText = "Edit Supplier";
        document.getElementById('submitBtn').innerText = "Update Data";
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if(cancelBtn) cancelBtn.classList.remove('hidden');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteProvider = (id) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            fetch(`${API_URL}/providers/${id}`, { method: 'DELETE' })
            .then(() => fetchProviders());
        }
    };

    function resetAdminForm() {
        if(adminProviderForm) adminProviderForm.reset();
        document.getElementById('editId').value = "";
        const titleEl = document.getElementById('formTitle');
        if(titleEl) titleEl.innerText = "Add Supplier";
        const btnEl = document.getElementById('submitBtn');
        if(btnEl) btnEl.innerText = "Save";
        const cancelBtn = document.getElementById('cancelEditBtn');
        if(cancelBtn) cancelBtn.classList.add('hidden');
    }

    // ==========================================
    // 4. USER OPTIMIZATION LOGIC
    // ==========================================
    const userOptForm = document.getElementById('optimizationForm');
    if (userOptForm) {
        initSmartSliders();
        userOptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const demand = parseInt(document.getElementById('totalUnits').value);
            const minScore = parseFloat(document.getElementById('minScore').value);
            const weights = [
                parseInt(document.getElementById('wPrice').value) / 100,
                parseInt(document.getElementById('wQuality').value) / 100,
                parseInt(document.getElementById('wTime').value) / 100
            ];

            fetch(`${API_URL}/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalUnits: demand, minScore, weights })
            })
            .then(res => res.json())
            .then(data => {
                if(data.error) { alert("Error: " + data.error); return; }
                renderResults(data.results, demand, data.summary);
            })
            .catch(err => alert("Calculation error: " + err));
        });
    }

    function initSmartSliders() {
        const sPrice = document.getElementById('wPrice');
        const sQuality = document.getElementById('wQuality');
        const sTime = document.getElementById('wTime');
        const sliders = [sPrice, sQuality, sTime];

        sliders.forEach(slider => {
            slider.addEventListener('input', function() {
                let newVal = parseInt(this.value);
                let others = sliders.filter(s => s !== this);
                let remain = 100 - newVal;
                
                let otherSum = parseInt(others[0].value) + parseInt(others[1].value);

                if (otherSum > 0) {
                    others[0].value = Math.round(remain * (parseInt(others[0].value) / otherSum));
                    others[1].value = 100 - (newVal + parseInt(others[0].value));
                } else {
                    others[0].value = Math.floor(remain / 2);
                    others[1].value = remain - others[0].value;
                }
                
                document.getElementById('valPrice').innerText = sPrice.value + '%';
                document.getElementById('valQuality').innerText = sQuality.value + '%';
                document.getElementById('valTime').innerText = sTime.value + '%';
            });
        });
    }

    function renderResults(results, totalDemand, summary) {
        const container = document.getElementById('resultsContainer');
        container.classList.remove('hidden');

        document.getElementById('resTotalCost').innerText = '$' + summary.totalCost.toLocaleString();
        document.getElementById('resAvgScore').innerText = summary.finalAvgScore.toFixed(3);
        
        const scoreEl = document.getElementById('resAvgScore');
        scoreEl.className = 'val ' + (summary.isPass ? 'status-pass' : 'status-fail');

        const statusEl = document.getElementById('resStatus');
        if (!summary.isEnough) { 
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Insufficient Supply'; 
            statusEl.className = 'val status-fail'; 
        } else if (!summary.isPass) { 
            statusEl.innerHTML = '<i class="fa-solid fa-xmark"></i> Low Quality'; 
            statusEl.className = 'val status-fail'; 
        } else { 
            statusEl.innerHTML = '<i class="fa-solid fa-check"></i> Optimal'; 
            statusEl.className = 'val status-pass'; 
        }

        document.getElementById('resultTableBody').innerHTML = results.map(r => `
            <tr style="${r.allocated > 0 ? 'background:#f0fdf4' : ''}">
                <td><strong>${r.name}</strong><br><small>Score: ${r.topsisScore.toFixed(3)}</small></td>
                <td>$${r.price}</td>
                <td>${r.capacity.toLocaleString()}</td>
                <td style="font-weight:bold; color:${r.allocated > 0 ? '#166534': '#9ca3af'}">${r.allocated.toLocaleString()}</td>
                <td>$${r.totalItemCost.toLocaleString()}</td>
                <td>${Math.round((r.allocated/totalDemand)*100)}%</td>
            </tr>`).join('');
    }

    // ==========================================
    // 5. USER MANAGEMENT PAGE
    // ==========================================
    const isUserManagePage = document.getElementById('pageIdentifier')?.value === 'user_management';
    
    if (isUserManagePage) {
        let currentUsers = [];

        if (localStorage.getItem('userRole') !== 'admin') {
            alert("You do not have permission to access this page!");
            window.location.href = 'login.html';
        }

        function fetchUsers() {
            fetch(`${API_URL}/users?t=${new Date().getTime()}`)
            .then(res => res.json())
            .then(data => {
                currentUsers = data; 
                const tbody = document.getElementById('userTableBody');
                
                if (tbody) {
                    tbody.innerHTML = data.map(u => `
                        <tr>
                            <td>#${u.id}</td>
                            <td><strong>${u.username}</strong></td>
                            <td>${u.email || '<i style="color:gray">N/A</i>'}</td>
                            <td>${u.phone || '<i style="color:gray">N/A</i>'}</td>
                            <td>
                                <span class="score-badge" style="background:${u.role==='admin'?'#DBEAFE':'#F3F4F6'}; color:${u.role==='admin'?'#1E40AF':'#374151'}">
                                    ${u.role ? u.role.toUpperCase() : 'USER'}
                                </span>
                            </td>
                            <td>
                                ${u.username === 'admin' ? '<span style="color:gray; font-size:0.9em">Super Admin</span>' : `
                                <button onclick="openEditModal(${u.id})" style="color: #3B82F6; margin-right: 15px; border:none; background:none; cursor:pointer;" title="Edit">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="deleteUser(${u.id})" style="color: #EF4444; border:none; background:none; cursor:pointer;" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>`}
                            </td>
                        </tr>
                    `).join('');
                }
            })
            .catch(err => console.error("Error loading users:", err));
        }
        
        fetchUsers();

        // Edit Modal Logic
        const modal = document.getElementById('editUserModal');
        const closeModal = document.getElementById('closeUserModal');
        
        window.openEditModal = (id) => {
            const user = currentUsers.find(u => u.id === id);
            if (!user) return;
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editPhone').value = user.phone || '';
            document.getElementById('editRole').value = user.role || 'USER';
            document.getElementById('editPassword').value = ''; 
            modal.classList.remove('hidden');
        };

        if (closeModal) closeModal.onclick = () => modal.classList.add('hidden');
        window.onclick = (e) => { if (e.target == modal) modal.classList.add('hidden'); };

        const editForm = document.getElementById('editUserForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('editUserId').value;
                const payload = {
                    email: document.getElementById('editEmail').value,
                    phone: document.getElementById('editPhone').value,
                    role: document.getElementById('editRole').value,
                    password: document.getElementById('editPassword').value 
                };
                fetch(`${API_URL}/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    if(data.error) alert(data.error);
                    else {
                        alert("Update successful!");
                        modal.classList.add('hidden');
                        fetchUsers(); 
                    }
                });
            });
        }

        window.deleteUser = (id) => {
            if(confirm("Are you sure you want to delete this account?")) {
                fetch(`${API_URL}/users/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if(data.error) alert(data.error);
                    else {
                        alert("User deleted!");
                        fetchUsers();
                    }
                });
            }
        };
    }
});
