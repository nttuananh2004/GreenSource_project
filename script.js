document.addEventListener('DOMContentLoaded', () => {
    // State
    let providers = [];
    let editingId = null;

    // DOM Elements
    const form = document.getElementById('providerForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const formTitle = document.querySelector('.input-panel h2');
    const tableContainer = document.getElementById('tableContainer');
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const countSpan = document.getElementById('count');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const winnerModal = document.getElementById('winnerModal');
    const winnerDetails = document.getElementById('winnerDetails');
    const closeModalElements = document.querySelectorAll('.close-modal, .close-btn');

    // Event Listeners
    form.addEventListener('submit', handleFormSubmit);
    calculateBtn.addEventListener('click', calculateBestOption);
    resetBtn.addEventListener('click', resetApp);

    closeModalElements.forEach(el => {
        el.addEventListener('click', () => {
            winnerModal.classList.add('hidden');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === winnerModal) {
            winnerModal.classList.add('hidden');
        }
    });

    // Functions
    function handleFormSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('providerName').value;
        const price = parseFloat(document.getElementById('price').value);
        const quality = parseInt(document.getElementById('quality').value);
        const time = parseInt(document.getElementById('time').value);
        const capacity = parseInt(document.getElementById('capacity').value);

        if (!name || isNaN(price) || isNaN(quality) || isNaN(time) || isNaN(capacity)) {
            alert('Please fill in all fields correctly.');
            return;
        }

        if (editingId) {
            // Update existing
            providers = providers.map(p => p.id === editingId ? { ...p, name, price, quality, time, capacity } : p);
            editingId = null;
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            formTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Provider';
        } else {
            // Add new
            const newProvider = {
                id: Date.now(),
                name,
                price,
                quality,
                time,
                capacity,
                score: 0
            };
            providers.push(newProvider);
        }

        renderProviders();
        form.reset();
        document.getElementById('providerName').focus();
    }

    function editProvider(id) {
        const provider = providers.find(p => p.id === id);
        if (!provider) return;

        editingId = id;
        document.getElementById('providerName').value = provider.name;
        document.getElementById('price').value = provider.price;
        document.getElementById('quality').value = provider.quality;
        document.getElementById('time').value = provider.time;
        document.getElementById('capacity').value = provider.capacity;

        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i>';
        formTitle.innerHTML = '<i class="fa-solid fa-edit"></i> Edit';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function removeProvider(id) {
        if (editingId === id) {
            editingId = null;
            form.reset();
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            formTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Provider';
        }
        providers = providers.filter(p => p.id !== id);
        renderProviders();
    }

    function calculateBestOption() {
        if (providers.length === 0) {
            alert('Please add providers first.');
            return;
        }

        let minPrice = Math.min(...providers.map(p => p.price));
        let maxQuality = Math.max(...providers.map(p => p.quality));
        let minTime = Math.min(...providers.map(p => p.time));
        let maxCapacity = Math.max(...providers.map(p => p.capacity));

        if (minPrice === 0) minPrice = 1;
        if (maxQuality === 0) maxQuality = 1;
        if (minTime === 0) minTime = 1;
        if (maxCapacity === 0) maxCapacity = 1;

        providers = providers.map(p => {
            const priceScore = (minPrice / (p.price || 1)) * 30;
            const qualityScore = ((p.quality || 0) / maxQuality) * 35;
            const timeScore = (minTime / (p.time || 1)) * 20;
            const capacityScore = ((p.capacity || 0) / maxCapacity) * 15;
            const totalScore = priceScore + qualityScore + timeScore + capacityScore;
            return {
                ...p,
                score: parseFloat(totalScore.toFixed(1))
            };
        });

        const bestProvider = providers.reduce((prev, current) =>
            (prev.score > current.score) ? prev : current
        );

        renderProviders(bestProvider.id);
        showWinnerModal(bestProvider);
    }

    function resetApp() {
        if (confirm('Are you sure you want to clear all data?')) {
            providers = [];
            editingId = null;
            renderProviders();
            form.reset();
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            formTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Provider';
        }
    }

    function renderProviders(highlightId = null) {
        tableBody.innerHTML = '';
        countSpan.textContent = providers.length;

        if (providers.length === 0) {
            emptyState.classList.remove('hidden');
            providersTable.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        providersTable.classList.remove('hidden');

        providers.forEach(p => {
            const isBest = p.id === highlightId;
            const row = document.createElement('tr');
            if (isBest) row.className = 'best-row';

            row.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td>$${p.price}</td>
                <td>${p.quality}/10</td>
                <td>${p.time} days</td>
                <td>${p.capacity} units</td>
                <td><span class="score-badge">${p.score > 0 ? p.score : 'Pending'}</span></td>
                <td class="action-cell">
                    <button class="btn-edit" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-delete" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;

            row.querySelector('.btn-edit').onclick = () => editProvider(p.id);
            row.querySelector('.btn-delete').onclick = () => removeProvider(p.id);
            tableBody.appendChild(row);
        });
    }

    function showWinnerModal(provider) {
        winnerDetails.innerHTML = `
            <div style="margin: 1.5rem 0;">
                <h3 style="font-size: 1.5rem; color: var(--primary-dark); margin-bottom: 0.5rem;">${provider.name}</h3>
                <p style="color: var(--text-light); margin-bottom: 1rem;">is your optimal choice!</p>
                <div style="background: #F3F4F6; padding: 1rem; border-radius: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left;">
                    <div><strong>Score:</strong> ${provider.score}/100</div>
                    <div><strong>Price:</strong> $${provider.price}</div>
                    <div><strong>Quality:</strong> ${provider.quality}/10</div>
                    <div><strong>Time:</strong> ${provider.time} days</div>
                </div>
            </div>
        `;
        winnerModal.classList.remove('hidden');
    }
});
