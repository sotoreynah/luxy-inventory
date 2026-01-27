// Luxy Inventory Checkout App
// Luxy Inventory Checkout App
// Configuration
const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbz2nJYAaOtlYvxN7N_Y0FXn6W8sKGYCCnivrHx544-9IYIVaeUrNthpyMVI0axJtzt4rg/exec'
};



// Response validation helpers
function validateEmployeeList(data) {
    if (!Array.isArray(data)) {
        throw new Error('Expected employees to be an array');
    }

    // Check size limit (max 1000 employees)
    if (data.length > 1000) {
        throw new Error(`Too many employees: ${data.length}`);
    }

    // Validate each employee object
    return data.map(emp => {
        if (!emp.id || typeof emp.id !== 'string') {
            throw new Error('Each employee must have an id (string)');
        }
        if (!emp.name || typeof emp.name !== 'string') {
            throw new Error('Each employee must have a name (string)');
        }
        return {
            id: emp.id.substring(0, 50),  // Max 50 chars
            name: emp.name.substring(0, 100)  // Max 100 chars
        };
    });
}

function validateItemList(data) {
    if (!Array.isArray(data)) {
        throw new Error('Expected items to be an array');
    }

    if (data.length > 1000) {
        throw new Error(`Too many items: ${data.length}`);
    }

    return data.map(item => {
        if (!item.id || typeof item.id !== 'string') {
            throw new Error('Each item must have an id (string)');
        }
        if (!item.name || typeof item.name !== 'string') {
            throw new Error('Each item must have a name (string)');
        }
        if (!item.unit || typeof item.unit !== 'string') {
            throw new Error('Each item must have a unit (string)');
        }
        return {
            id: item.id.substring(0, 50),
            name: item.name.substring(0, 100),
            unit: item.unit.substring(0, 20)
        };
    });
}

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

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    const rawData = await response.json();

    try {
        app.employees = validateEmployeeList(rawData.employees || []);
    } catch (error) {
        console.error('Invalid employee data from server:', error);
        throw new Error(`Invalid employee data: ${error.message}`);
    }
}


// Fetch items from Google Sheets
async function fetchItems() {
    const response = await fetch(`${CONFIG.BACKEND_URL}?action=getItems`);

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    const rawData = await response.json();

    try {
        app.items = validateItemList(rawData.items || []);
    } catch (error) {
        console.error('Invalid items data from server:', error);
        throw new Error(`Invalid items data: ${error.message}`);
    }
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

// Compress signature for storage efficiency
function compressSignature(canvas) {
    // Create smaller temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 200;
    tempCanvas.height = 67;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    // Return as JPEG for better compression (60% quality)
    return tempCanvas.toDataURL('image/jpeg', 0.6);
}

// Submit checkout
app.submitCheckout = async () => {
    if (!hasSignature()) {
        alert('Please provide your signature');
        return;
    }
    
    const canvas = document.getElementById('signature-pad');
    const signatureData = compressSignature(canvas);
    
    const checkoutData = {
        timestamp: new Date().toISOString(),
        employee: app.currentEmployee,
        items: app.cart,
        signature: signatureData
    };
    
    showLoading(true);
    
    try {
        if (app.isOnline) {
            console.log('Submitting online...', checkoutData);
            await submitToSheet(checkoutData);
            console.log('Submit successful!');
            
            // Clear cart immediately after successful submit
            app.cart = [];
            app.clearSignature();
            
            showConfirmation();
        } else {
            console.log('Offline - saving to queue');
            savePendingCheckout(checkoutData);
            showConfirmation(true);
        }
    } catch (error) {
        console.error('Submit error:', error);
        
        // Show the actual error to debug
        alert(`Submission failed: ${error.message}\nSaving offline for later sync.`);
        
        savePendingCheckout(checkoutData);
        showConfirmation(true);
    } finally {
        showLoading(false);
    }
};

// Submit to Google Sheets
async function submitToSheet(checkoutData) {
    // Use no-cors mode for Google Apps Script compatibility
    const response = await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'submitCheckout',
            timestamp: checkoutData.timestamp,
            employee: checkoutData.employee,
            items: checkoutData.items
        })
    });
    
    // With no-cors, we can't read the response, so assume success
    console.log('Submitted (no-cors mode - check sheet to verify)');
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
    const failed = [];

    for (const checkout of pending) {
        try {
            await submitToSheet(checkout);
            console.log('Synced checkout:', checkout.timestamp);
        } catch (error) {
            console.error('Sync failed for checkout:', error);
            failed.push(checkout);
        }
    }

    // Only clear successfully synced items
    if (failed.length === 0) {
        localStorage.setItem('pending_checkouts', '[]');
        console.log('All pending checkouts synced!');
    } else {
        // Keep failed items for retry
        localStorage.setItem('pending_checkouts', JSON.stringify(failed));
        console.warn(`${failed.length} checkouts failed to sync, will retry`);
    }
    
    updateSyncStatus();
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
    // Clear everything
    app.currentEmployee = null;
    app.cart = [];
    app.clearSignature();
    
    // Re-render to make sure UI is clean
    renderCart();
    
    // Go back to employee selection
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
