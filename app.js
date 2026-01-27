// Luxy Inventory Checkout App just checking update
// Configuration
const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxC77mRunmMFq6WzIKvRwV07PaGkRXbob0jr6XKOer2AxF2cx74h0lr3BueNuZC5UzGWQ/exec'
};

// App State
const app = {
    currentScreen: 'employee',
    currentEmployee: null,
    cart: [],
    employees: [],
    items: [],
    accessToken: null,
    signaturePad: null,
    isOnline: navigator.onLine,
    pendingCheckouts: []
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Luxy Inventory App starting...');
    
    // Setup service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered');
        } catch (e) {
            console.error('Service Worker registration failed:', e);
        }
    }
    
    // Setup signature pad
    setupSignaturePad();
    
    // Setup online/offline detection
    window.addEventListener('online', () => {
        app.isOnline = true;
        updateSyncStatus();
        syncPendingCheckouts();
    });
    
    window.addEventListener('offline', () => {
        app.isOnline = false;
        updateSyncStatus();
    });
    
    // Load data
    await loadData();
    
    updateSyncStatus();
});

// Load employees and items from Google Sheets
async function loadData() {
    showLoading(true);
    
    try {
        // Load from cache first
        const cached = loadFromCache();
        if (cached) {
            app.employees = cached.employees || [];
            app.items = cached.items || [];
            renderEmployees();
            renderItems();
        }
        
        // Then fetch fresh data
        if (app.isOnline) {
            await fetchEmployees();
            await fetchItems();
            saveToCache();
            renderEmployees();
            renderItems();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Using cached version if available.');
    } finally {
        showLoading(false);
    }
}



// Fetch employees from Google Sheets
async function fetchEmployees() {
    const response = await fetch(`${CONFIG.BACKEND_URL}?action=getEmployees`);
    const data = await response.json();
    app.employees = data.employees || [];
}


// Fetch items from Google Sheets
async function fetchItems() {
    const response = await fetch(`${CONFIG.BACKEND_URL}?action=getItems`);
    const data = await response.json();
    app.items = data.items || [];
}

// Cache management
function saveToCache() {
    localStorage.setItem('cached_employees', JSON.stringify(app.employees));
    localStorage.setItem('cached_items', JSON.stringify(app.items));
    localStorage.setItem('cache_time', Date.now());
}

function loadFromCache() {
    const cacheTime = localStorage.getItem('cache_time');
    if (!cacheTime || Date.now() - parseInt(cacheTime) > 24 * 60 * 60 * 1000) {
        return null; // Cache expired
    }
    
    return {
        employees: JSON.parse(localStorage.getItem('cached_employees') || '[]'),
        items: JSON.parse(localStorage.getItem('cached_items') || '[]')
    };
}

// Render employees
function renderEmployees() {
    const container = document.getElementById('employee-buttons');
    container.innerHTML = '';
    
    app.employees.forEach(emp => {
        const btn = document.createElement('button');
        btn.className = 'btn-employee';
        btn.textContent = emp.name;
        btn.onclick = () => selectEmployee(emp);
        container.appendChild(btn);
    });
}

// Render items dropdown
function renderItems() {
    const select = document.getElementById('item-select');
    select.innerHTML = '<option value="">-- Choose Item --</option>';
    
    app.items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (${item.unit})`;
        option.dataset.item = JSON.stringify(item);
        select.appendChild(option);
    });
}

// Select employee
function selectEmployee(employee) {
    app.currentEmployee = employee;
    document.getElementById('current-employee-name').textContent = employee.name;
    app.goToScreen('items');
}

// Quantity controls
app.incrementQty = () => {
    const input = document.getElementById('quantity-input');
    input.value = parseInt(input.value) + 1;
};

app.decrementQty = () => {
    const input = document.getElementById('quantity-input');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
};

// Add to cart
app.addToCart = () => {
    const select = document.getElementById('item-select');
    const qtyInput = document.getElementById('quantity-input');
    
    if (!select.value) {
        alert('Please select an item');
        return;
    }
    
    const item = JSON.parse(select.options[select.selectedIndex].dataset.item);
    const quantity = parseInt(qtyInput.value);
    
    app.cart.push({
        ...item,
        quantity
    });
    
    // Reset form
    select.value = '';
    qtyInput.value = '1';
    
    renderCart();
};

// Render cart
function renderCart() {
    const container = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const continueBtn = document.getElementById('btn-continue');
    
    if (app.cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">Cart is empty</p>';
        countEl.textContent = '0';
        continueBtn.disabled = true;
        return;
    }
    
    countEl.textContent = app.cart.length;
    continueBtn.disabled = false;
    
    container.innerHTML = app.cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                <span>${item.quantity} ${item.unit}${item.quantity > 1 ? 's' : ''}</span>
            </div>
            <button class="btn-remove" onclick="removeFromCart(${index})">×</button>
        </div>
    `).join('');
}

// Remove from cart
function removeFromCart(index) {
    app.cart.splice(index, 1);
    renderCart();
}

// Go to signature screen
app.goToSignature = () => {
    // Render summary
    const summaryList = document.getElementById('summary-items');
    summaryList.innerHTML = app.cart.map(item => 
        `<li>${item.quantity} ${item.unit}${item.quantity > 1 ? 's' : ''} ${item.name}</li>`
    ).join('');
    
    app.goToScreen('signature');
};

// Setup signature pad
function setupSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
}

app.clearSignature = () => {
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Check if signature exists
function hasSignature() {
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.some(channel => channel !== 0);
}

// Submit checkout
app.submitCheckout = async () => {
    if (!hasSignature()) {
        alert('Please provide your signature');
        return;
    }
    
    const canvas = document.getElementById('signature-pad');
    const signatureData = canvas.toDataURL('image/png');
    
    const checkoutData = {
        timestamp: new Date().toISOString(),
        employee: app.currentEmployee,
        items: app.cart,
        signature: signatureData
    };
    
    showLoading(true);
    
    try {
       if (app.isOnline) {
            await submitToSheet(checkoutData);
            showConfirmation();
        } else {
            // Save offline
            savePendingCheckout(checkoutData);
            showConfirmation(true);
        }
    } catch (error) {
        console.error('Submit error:', error);
        savePendingCheckout(checkoutData);
        alert('Saved offline. Will sync when online.');
        showConfirmation(true);
    } finally {
        showLoading(false);
    }
};

// Submit to Google Sheets
async function submitToSheet(checkoutData) {
    const response = await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'submitCheckout',
            timestamp: checkoutData.timestamp,
            employee: checkoutData.employee,
            items: checkoutData.items
        })
    });
    
    const result = await response.json();
    if (!result.success) {
        throw new Error('Failed to submit checkout');
    }
}

// Offline queue
function savePendingCheckout(data) {
    const pending = JSON.parse(localStorage.getItem('pending_checkouts') || '[]');
    pending.push(data);
    localStorage.setItem('pending_checkouts', JSON.stringify(pending));
}

async function syncPendingCheckouts() {
    const pending = JSON.parse(localStorage.getItem('pending_checkouts') || '[]');
    
    if (pending.length === 0) return;
    
    console.log(`Syncing ${pending.length} pending checkouts...`);
    
    for (const checkout of pending) {
        try {
            await submitToSheet(checkout);
        } catch (error) {
            console.error('Sync failed for checkout:', error);
            return; // Stop syncing if one fails
        }
    }
    
    // Clear pending
    localStorage.setItem('pending_checkouts', '[]');
    console.log('All pending checkouts synced!');
}

// Show confirmation
function showConfirmation(offline = false) {
    document.getElementById('confirmation-employee').textContent = app.currentEmployee.name;
    document.getElementById('confirmation-message').textContent = 
        `${app.cart.length} item${app.cart.length > 1 ? 's' : ''} logged ${offline ? '(offline - will sync)' : 'successfully'}`;
    
    app.goToScreen('confirmation');
}

// Start new checkout
app.startNew = () => {
    app.currentEmployee = null;
    app.cart = [];
    app.clearSignature();
    app.goToScreen('employee');
};

// Screen navigation
app.goToScreen = (screenName) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`).classList.add('active');
    app.currentScreen = screenName;
};

// Loading overlay
function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// Sync status
function updateSyncStatus() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    
    const pending = JSON.parse(localStorage.getItem('pending_checkouts') || '[]');
    
    if (app.isOnline) {
        dot.className = 'status-dot online';
        text.textContent = pending.length > 0 ? `Online (${pending.length} pending)` : 'Online';
    } else {
        dot.className = 'status-dot offline';
        text.textContent = 'Offline';
    }
}
