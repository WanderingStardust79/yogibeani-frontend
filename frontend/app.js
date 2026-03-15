/* ========================================
   YOGIBEANI — APP.JS (Production / Vercel)
   ======================================== */

// API_BASE points to the Railway backend. Update this after deploying.
const API_BASE = window.YOGIBEANI_API || '';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ========== STRIPE CONFIG ==========
const STRIPE_CONFIG = {
    publishableKey: '',
    prices: {
        drop_in: '',
        unlimited: '',
    }
};

// ========== STATE ==========
let allClasses = [];
let currentDay = 0;
let currentBookingClass = null;
let bookingClientInfo = {};
let adminAuthenticated = false;
let signaturePad = null;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
    initSchedule();
    initPricing();
    initBookingModal();
    initWaiverModal();
    initPurchaseModal();
    initAdmin();
    initSignaturePad();
    handleHashRoute();
    handlePaymentReturn();
    loadSettings();

    const waiverDate = document.getElementById('waiverDate');
    if (waiverDate) waiverDate.value = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
});

// ========== NAVIGATION ==========
function initNavigation() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    });

    toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        toggle.classList.toggle('active');
    });

    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.classList.remove('active');
        });
    });
}

// ========== SCROLL REVEAL ==========
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ========== API HELPERS ==========
async function apiGet(path, params = {}) {
    let url = `${API_BASE}${path}`;
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
    try {
        const res = await fetch(url);
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: 'Network error' };
    }
}

async function apiPost(path, body) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: 'Network error' };
    }
}

async function apiPut(path, body) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: 'Network error' };
    }
}

async function apiDelete(path, params = {}) {
    let url = `${API_BASE}${path}`;
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
    try {
        const res = await fetch(url, { method: 'DELETE' });
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: 'Network error' };
    }
}

// ========== SETTINGS (load from backend) ==========
async function loadSettings() {
    const result = await apiGet('/api/settings');
    if (result.success && result.data) {
        const settings = result.data;
        if (settings.stripe_publishable_key) {
            STRIPE_CONFIG.publishableKey = settings.stripe_publishable_key;
        }
        if (settings.stripe_price_drop_in) STRIPE_CONFIG.prices.drop_in = settings.stripe_price_drop_in;
        if (settings.stripe_price_five_pack) STRIPE_CONFIG.prices.five_pack = settings.stripe_price_five_pack;
        if (settings.stripe_price_ten_pack) STRIPE_CONFIG.prices.ten_pack = settings.stripe_price_ten_pack;
        if (settings.stripe_price_unlimited) STRIPE_CONFIG.prices.unlimited = settings.stripe_price_unlimited;

        if (settings.pricing_drop_in) updatePricingCard('drop_in', settings.pricing_drop_in);
        if (settings.pricing_five_pack) updatePricingCard('5_pack', settings.pricing_five_pack);
        if (settings.pricing_ten_pack) updatePricingCard('10_pack', settings.pricing_ten_pack);
        if (settings.pricing_unlimited) updatePricingCard('unlimited', settings.pricing_unlimited);
    }
}

function updatePricingCard(packageType, amount) {
    const btn = document.querySelector(`.pricing-btn[data-package="${packageType}"]`);
    if (btn) {
        btn.dataset.amount = amount;
        const card = btn.closest('.pricing-card');
        if (card) {
            const amountEl = card.querySelector('.pricing-amount');
            if (amountEl) {
                amountEl.innerHTML = `<span class="pricing-currency">$</span>${parseInt(amount)}`;
            }
        }
    }
}

// ========== STRIPE CHECKOUT ==========
async function redirectToStripeCheckout(priceId, mode) {
    if (!STRIPE_CONFIG.publishableKey || !priceId) {
        return false;
    }
    try {
        const stripe = Stripe(STRIPE_CONFIG.publishableKey);
        const { error } = await stripe.redirectToCheckout({
            lineItems: [{ price: priceId, quantity: 1 }],
            mode: mode,
            successUrl: window.location.href.split('?')[0] + '?payment=success',
            cancelUrl: window.location.href.split('?')[0] + '?payment=cancelled',
        });
        if (error) {
            showToast(error.message, 'error');
        }
    } catch (e) {
        showToast('Payment redirect failed. Please try again.', 'error');
        return false;
    }
    return true;
}

function handlePaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        showToast('Payment successful! Thank you for your purchase.', 'success');
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            history.replaceState(null, '', url.pathname + url.hash);
        } catch (e) { /* ignore */ }
    } else if (urlParams.get('payment') === 'cancelled') {
        showToast('Payment was cancelled.', 'error');
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            history.replaceState(null, '', url.pathname + url.hash);
        } catch (e) { /* ignore */ }
    }
}

// ========== SCHEDULE ==========
async function initSchedule() {
    const tabs = document.getElementById('scheduleTabs');
    tabs.addEventListener('click', e => {
        if (e.target.classList.contains('schedule-tab')) {
            tabs.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentDay = parseInt(e.target.dataset.day);
            renderSchedule();
        }
    });

    await loadClasses();
}

async function loadClasses() {
    const result = await apiGet('/api/classes');
    if (result.success) {
        allClasses = result.data;
    }
    renderSchedule();
}

function renderSchedule() {
    const container = document.getElementById('scheduleClasses');
    const dayClasses = allClasses.filter(c => c.day_of_week === currentDay);

    if (dayClasses.length === 0) {
        container.innerHTML = `<div class="schedule-empty">
            <p>No classes scheduled for ${DAYS[currentDay]}.</p>
        </div>`;
        return;
    }

    container.innerHTML = dayClasses.map(c => {
        const isFull = c.spots_remaining <= 0;
        const spotsClass = isFull ? 'full' : '';
        const btnText = isFull ? 'Waitlist' : 'Book';
        const btnClass = isFull ? 'btn btn-outline class-book-btn waitlist' : 'btn btn-primary class-book-btn';

        return `
        <div class="class-card">
            <div class="class-color-bar" style="background: ${c.color || '#C4956A'}"></div>
            <div class="class-info">
                <div class="class-name">${esc(c.name)}</div>
                <div class="class-meta">
                    <span class="class-style-badge">${esc(c.style)}</span>
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${esc(c.time)} · ${c.duration} min
                    </span>
                    <span>with ${esc(c.instructor)}</span>
                </div>
                <div class="class-spots ${spotsClass}">${c.spots_remaining}/${c.capacity} spots</div>
            </div>
            <div class="class-action">
                <button class="${btnClass}" onclick="startBooking(${c.id})" ${isFull ? 'disabled' : ''}>${btnText}</button>
            </div>
        </div>`;
    }).join('');
}

// ========== BOOKING ==========
function initBookingModal() {
    document.getElementById('bookingClose').addEventListener('click', closeBooking);
    document.getElementById('bookingDone').addEventListener('click', closeBooking);
    document.getElementById('bookingModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeBooking();
    });

    document.getElementById('bookingContinue').addEventListener('click', handleBookingContinue);
}

function startBooking(classId) {
    currentBookingClass = allClasses.find(c => c.id === classId);
    if (!currentBookingClass) return;

    const info = document.getElementById('bookingClassInfo');
    info.innerHTML = `
        <h4>${esc(currentBookingClass.name)}</h4>
        <p>${DAYS[currentBookingClass.day_of_week]} · ${esc(currentBookingClass.time)} · ${currentBookingClass.duration} min · ${esc(currentBookingClass.style)}</p>
    `;

    document.getElementById('bookingStep1').classList.remove('hidden');
    document.getElementById('bookingStep2').classList.add('hidden');
    document.getElementById('bookingNote').textContent = '';
    document.getElementById('bookingNote').className = 'modal-note';

    openModal('bookingModal');
}

async function handleBookingContinue() {
    const email = document.getElementById('bookingEmail').value.trim();
    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const note = document.getElementById('bookingNote');

    if (!email || !name) {
        note.textContent = 'Name and email are required.';
        note.className = 'modal-note error';
        return;
    }

    if (!isValidEmail(email)) {
        note.textContent = 'Please enter a valid email.';
        note.className = 'modal-note error';
        return;
    }

    note.textContent = 'Checking waiver status...';
    note.className = 'modal-note';

    bookingClientInfo = { name, email, phone };

    const waiverResult = await apiGet('/api/waivers/check', { email });

    if (waiverResult.success && waiverResult.has_waiver) {
        await completeBooking();
    } else {
        closeModal('bookingModal');
        openWaiverForBooking(name, email, phone);
    }
}

async function completeBooking() {
    const note = document.getElementById('bookingNote');
    note.textContent = 'Booking...';

    const result = await apiPost('/api/bookings', {
        class_id: currentBookingClass.id,
        client_name: bookingClientInfo.name,
        client_email: bookingClientInfo.email,
        client_phone: bookingClientInfo.phone
    });

    if (result.success) {
        document.getElementById('bookingStep1').classList.add('hidden');
        document.getElementById('bookingStep2').classList.remove('hidden');
        document.getElementById('bookingConfirmDetails').innerHTML = `
            <strong>${esc(currentBookingClass.name)}</strong><br>
            ${DAYS[currentBookingClass.day_of_week]} · ${esc(currentBookingClass.time)}<br>
            Duration: ${currentBookingClass.duration} minutes<br>
            Style: ${esc(currentBookingClass.style)}<br>
            Instructor: ${esc(currentBookingClass.instructor)}
        `;
        await loadClasses();
    } else {
        note.textContent = result.error || 'Booking failed. Please try again.';
        note.className = 'modal-note error';
    }
}

function closeBooking() {
    closeModal('bookingModal');
    currentBookingClass = null;
}

// ========== WAIVER ==========
function initWaiverModal() {
    document.getElementById('waiverClose').addEventListener('click', closeWaiver);
    document.getElementById('waiverModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeWaiver();
    });
    document.getElementById('waiverSubmit').addEventListener('click', handleWaiverSubmit);
}

function openWaiverForBooking(name, email, phone) {
    document.getElementById('waiverName').value = name || '';
    document.getElementById('waiverEmail').value = email || '';
    document.getElementById('waiverPhone').value = phone || '';
    document.getElementById('waiverNote').textContent = '';
    document.getElementById('waiverAgree').checked = false;
    clearSignature();
    openModal('waiverModal');
    resizeSignatureCanvas();
}

async function handleWaiverSubmit() {
    const note = document.getElementById('waiverNote');
    const name = document.getElementById('waiverName').value.trim();
    const email = document.getElementById('waiverEmail').value.trim();
    const phone = document.getElementById('waiverPhone').value.trim();
    const emergName = document.getElementById('waiverEmergencyName').value.trim();
    const emergPhone = document.getElementById('waiverEmergencyPhone').value.trim();
    const medical = document.getElementById('waiverMedical').value.trim();
    const agreed = document.getElementById('waiverAgree').checked;
    const sigData = getSignatureData();

    if (!name || !email || !phone || !emergName || !emergPhone) {
        note.textContent = 'Please fill in all required fields.';
        note.className = 'modal-note error';
        return;
    }

    if (!sigData) {
        note.textContent = 'Please sign the waiver.';
        note.className = 'modal-note error';
        return;
    }

    if (!agreed) {
        note.textContent = 'You must agree to the waiver terms.';
        note.className = 'modal-note error';
        return;
    }

    note.textContent = 'Submitting waiver...';
    note.className = 'modal-note';

    const result = await apiPost('/api/waivers', {
        full_name: name,
        email: email,
        phone: phone,
        emergency_contact_name: emergName,
        emergency_contact_phone: emergPhone,
        medical_conditions: medical,
        signature_data: sigData
    });

    if (result.success) {
        closeWaiver();
        showToast('Waiver signed successfully!', 'success');

        if (currentBookingClass) {
            bookingClientInfo = { name, email, phone };
            openModal('bookingModal');
            await completeBooking();
        }
    } else {
        note.textContent = result.error || 'Failed to submit waiver.';
        note.className = 'modal-note error';
    }
}

function closeWaiver() {
    closeModal('waiverModal');
}

// ========== SIGNATURE PAD ==========
function initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0, lastY = 0;
    let hasDrawn = false;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    function startDraw(e) {
        e.preventDefault();
        drawing = true;
        hasDrawn = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#2A2725';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    }

    function stopDraw() {
        drawing = false;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    document.getElementById('signatureClear').addEventListener('click', () => {
        clearSignature();
        hasDrawn = false;
    });

    canvas._hasDrawn = () => hasDrawn;
    canvas._setHasDrawn = (v) => { hasDrawn = v; };
}

function resizeSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    setTimeout(() => {
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 150;
    }, 100);
}

function clearSignature() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvas._setHasDrawn) canvas._setHasDrawn(false);
}

function getSignatureData() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas || !canvas._hasDrawn || !canvas._hasDrawn()) return null;
    return canvas.toDataURL('image/png');
}

// ========== PRICING ==========
function initPricing() {
    document.querySelectorAll('.pricing-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pkg = btn.dataset.package;
            const amount = btn.dataset.amount;
            const label = btn.dataset.label;
            startPurchase(pkg, amount, label);
        });
    });
}

// ========== PURCHASE ==========
function initPurchaseModal() {
    document.getElementById('purchaseClose').addEventListener('click', closePurchase);
    document.getElementById('purchaseDone').addEventListener('click', closePurchase);
    document.getElementById('purchaseModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closePurchase();
    });
    document.getElementById('purchaseSubmit').addEventListener('click', handlePurchaseSubmit);
}

async function startPurchase(pkg, amount, label) {
    const stripePriceMap = {
        'drop_in': 'drop_in',
        '5_pack': 'five_pack',
        '10_pack': 'ten_pack',
        'unlimited': 'unlimited'
    };
    const stripeKey = stripePriceMap[pkg];
    const priceId = stripeKey ? STRIPE_CONFIG.prices[stripeKey] : '';
    const mode = pkg === 'unlimited' ? 'subscription' : 'payment';

    if (STRIPE_CONFIG.publishableKey && priceId) {
        const redirected = await redirectToStripeCheckout(priceId, mode);
        if (redirected) return;
    }

    document.getElementById('purchaseInfo').innerHTML = `
        <h4>${esc(label)}</h4>
        <div class="purchase-price">$${amount}</div>
    `;
    document.getElementById('purchaseStep1').classList.remove('hidden');
    document.getElementById('purchaseStep2').classList.add('hidden');
    document.getElementById('purchaseSubmit').dataset.package = pkg;
    document.getElementById('purchaseSubmit').dataset.amount = amount;

    const noteEl = document.getElementById('purchaseNote');
    if (!STRIPE_CONFIG.publishableKey) {
        noteEl.textContent = 'Online payments coming soon — contact us to pay.';
    } else {
        noteEl.textContent = 'This records your purchase intent. Contact us to finalize payment.';
    }

    openModal('purchaseModal');
}

async function handlePurchaseSubmit() {
    const btn = document.getElementById('purchaseSubmit');
    const name = document.getElementById('purchaseName').value.trim();
    const email = document.getElementById('purchaseEmail').value.trim();

    if (!name || !email) {
        showToast('Name and email are required.', 'error');
        return;
    }

    const result = await apiPost('/api/purchases', {
        client_name: name,
        client_email: email,
        package_type: btn.dataset.package,
        amount: parseFloat(btn.dataset.amount)
    });

    if (result.success) {
        document.getElementById('purchaseStep1').classList.add('hidden');
        document.getElementById('purchaseStep2').classList.remove('hidden');
    } else {
        showToast(result.error || 'Purchase failed.', 'error');
    }
}

function closePurchase() {
    closeModal('purchaseModal');
}

// ========== ADMIN ==========
function initAdmin() {
    document.getElementById('adminLink').addEventListener('click', e => {
        e.preventDefault();
        window.location.hash = 'admin';
        showAdmin();
    });

    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('adminPassword').addEventListener('keypress', e => {
        if (e.key === 'Enter') handleAdminLogin();
    });
    document.getElementById('adminCancel').addEventListener('click', closeAdmin);
    document.getElementById('adminLogout').addEventListener('click', closeAdmin);
    document.getElementById('adminOverlay').addEventListener('click', closeAdmin);

    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'admin-settings') {
                loadSettingsIntoForm();
            }
        });
    });

    document.getElementById('addClassBtn').addEventListener('click', () => openClassForm());
    document.getElementById('classFormClose').addEventListener('click', () => closeModal('classFormModal'));
    document.getElementById('classFormModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal('classFormModal');
    });
    document.getElementById('classFormSubmit').addEventListener('click', handleClassFormSubmit);

    document.getElementById('saveStripeSettings').addEventListener('click', saveStripeSettings);
    document.getElementById('saveStudioSettings').addEventListener('click', saveStudioSettings);
    document.getElementById('savePricingSettings').addEventListener('click', savePricingSettings);
}

function handleHashRoute() {
    if (window.location.hash === '#admin') {
        showAdmin();
    }
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#admin') {
            showAdmin();
        }
    });
}

function showAdmin() {
    document.getElementById('adminPanel').classList.remove('hidden');
    if (adminAuthenticated) {
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadAdminData();
    } else {
        document.getElementById('adminLogin').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminNote').textContent = '';
        setTimeout(() => document.getElementById('adminPassword').focus(), 200);
    }
    document.body.style.overflow = 'hidden';
}

function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === 'Byute2011!') {
        adminAuthenticated = true;
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadAdminData();
    } else {
        document.getElementById('adminNote').textContent = 'Incorrect password.';
        document.getElementById('adminNote').className = 'modal-note error';
    }
}

function closeAdmin() {
    document.getElementById('adminPanel').classList.add('hidden');
    document.body.style.overflow = '';
    if (window.location.hash === '#admin') {
        history.replaceState(null, '', window.location.pathname);
    }
}

async function loadAdminData() {
    const [dashResult, classesResult, bookingsResult, waiversResult, clientsResult, purchasesResult] = await Promise.all([
        apiGet('/api/dashboard'),
        apiGet('/api/classes'),
        apiGet('/api/bookings'),
        apiGet('/api/waivers'),
        apiGet('/api/clients'),
        apiGet('/api/purchases')
    ]);

    // Stats
    if (dashResult.success) {
        const d = dashResult.data;
        document.getElementById('adminStats').innerHTML = `
            <div class="stat-card"><div class="stat-value">${d.total_classes}</div><div class="stat-label">Classes</div></div>
            <div class="stat-card"><div class="stat-value">${d.total_bookings}</div><div class="stat-label">Active Bookings</div></div>
            <div class="stat-card"><div class="stat-value">${d.total_waivers}</div><div class="stat-label">Waivers Signed</div></div>
            <div class="stat-card"><div class="stat-value">${d.total_purchases}</div><div class="stat-label">Purchases</div></div>
            <div class="stat-card"><div class="stat-value">$${Number(d.total_revenue).toFixed(0)}</div><div class="stat-label">Revenue</div></div>
            <div class="stat-card"><div class="stat-value">${d.todays_classes || 0}</div><div class="stat-label">Today's Classes</div></div>
            <div class="stat-card"><div class="stat-value">${d.this_week_bookings || 0}</div><div class="stat-label">This Week's Bookings</div></div>
        `;
    }

    // Classes table
    if (classesResult.success) {
        const classes = classesResult.data;
        if (classes.length === 0) {
            document.getElementById('adminClassesTable').innerHTML = '<div class="admin-empty">No classes yet.</div>';
        } else {
            document.getElementById('adminClassesTable').innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>Day</th><th>Time</th><th>Name</th><th>Style</th><th>Description</th><th>Instructor</th><th>Spots</th><th>Actions</th></tr></thead>
                    <tbody>${classes.map(c => `
                        <tr>
                            <td>${DAYS_SHORT[c.day_of_week]}</td>
                            <td>${esc(c.time)}</td>
                            <td><strong>${esc(c.name)}</strong></td>
                            <td>${esc(c.style)}</td>
                            <td>${esc(c.description || '—')}</td>
                            <td>${esc(c.instructor)}</td>
                            <td>${c.spots_remaining}/${c.capacity}</td>
                            <td class="actions">
                                <button class="btn-edit" onclick="openClassForm(${c.id})">Edit</button>
                                <button class="btn-dup" onclick="duplicateClass(${c.id})">Dup</button>
                                <button class="btn-delete" onclick="deleteClass(${c.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}</tbody>
                </table>`;
        }
    }

    // Bookings table
    if (bookingsResult.success) {
        const bookings = bookingsResult.data;
        if (bookings.length === 0) {
            document.getElementById('adminBookingsTable').innerHTML = '<div class="admin-empty">No bookings yet.</div>';
        } else {
            const dayCounts = [0, 0, 0, 0, 0, 0, 0];
            bookings.forEach(b => {
                if (b.status === 'confirmed' && b.day_of_week >= 0 && b.day_of_week <= 6) {
                    dayCounts[b.day_of_week]++;
                }
            });
            const maxCount = Math.max(...dayCounts, 1);

            const chartHTML = `
                <div style="margin-bottom: 20px;">
                    <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--charcoal-muted);margin-bottom:8px;">Bookings by Day</p>
                    <div class="booking-bar-chart">
                        ${DAYS_SHORT.map((day, i) => `
                            <div class="booking-bar-wrapper">
                                <div class="booking-bar-count">${dayCounts[i]}</div>
                                <div class="booking-bar" style="height: ${Math.max(4, (dayCounts[i] / maxCount) * 80)}px;"></div>
                                <div class="booking-bar-label">${day}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            document.getElementById('adminBookingsTable').innerHTML = chartHTML + `
                <table class="admin-table">
                    <thead><tr><th>Class</th><th>Day</th><th>Time</th><th>Client</th><th>Email</th><th>Status</th><th>Booked</th><th>Actions</th></tr></thead>
                    <tbody>${bookings.map(b => `
                        <tr>
                            <td><strong>${esc(b.class_name)}</strong></td>
                            <td>${DAYS_SHORT[b.day_of_week]}</td>
                            <td>${esc(b.class_time)}</td>
                            <td>${esc(b.client_name)}</td>
                            <td>${esc(b.client_email)}</td>
                            <td>${esc(b.status)}</td>
                            <td>${formatDate(b.booked_at)}</td>
                            <td class="actions">
                                ${b.status === 'confirmed' ? `<button class="btn-cancel" onclick="cancelBooking(${b.id})">Cancel</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}</tbody>
                </table>`;
        }
    }

    // Waivers table
    if (waiversResult.success) {
        const waivers = waiversResult.data;
        if (waivers.length === 0) {
            document.getElementById('adminWaiversTable').innerHTML = '<div class="admin-empty">No waivers signed yet.</div>';
        } else {
            document.getElementById('adminWaiversTable').innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Emergency Contact</th><th>Medical</th><th>Signed</th></tr></thead>
                    <tbody>${waivers.map(w => `
                        <tr>
                            <td><strong>${esc(w.full_name)}</strong></td>
                            <td>${esc(w.email)}</td>
                            <td>${esc(w.phone)}</td>
                            <td>${esc(w.emergency_contact_name)} (${esc(w.emergency_contact_phone)})</td>
                            <td>${esc(w.medical_conditions || 'None')}</td>
                            <td>${formatDate(w.signed_at)}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>`;
        }
    }

    // Clients table
    if (clientsResult.success) {
        const clients = clientsResult.data;
        if (clients.length === 0) {
            document.getElementById('adminClientsTable').innerHTML = '<div class="admin-empty">No clients yet.</div>';
        } else {
            document.getElementById('adminClientsTable').innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Waiver</th></tr></thead>
                    <tbody>${clients.map(c => `
                        <tr>
                            <td><strong>${esc(c.name)}</strong></td>
                            <td>${esc(c.email)}</td>
                            <td>${esc(c.phone || '-')}</td>
                            <td>${c.total_bookings}</td>
                            <td>${c.waiver_signed ? '✓ Signed' : '—'}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>`;
        }
    }

    // Purchases table
    if (purchasesResult.success) {
        const purchases = purchasesResult.data;
        if (purchases.length === 0) {
            document.getElementById('adminPurchasesTable').innerHTML = '<div class="admin-empty">No purchases yet.</div>';
        } else {
            document.getElementById('adminPurchasesTable').innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>Client</th><th>Email</th><th>Package</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>${purchases.map(p => `
                        <tr>
                            <td><strong>${esc(p.client_name)}</strong></td>
                            <td>${esc(p.client_email)}</td>
                            <td>${esc(formatPackage(p.package_type))}</td>
                            <td>$${Number(p.amount).toFixed(2)}</td>
                            <td>${esc(p.status)}</td>
                            <td>${formatDate(p.purchased_at)}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>`;
        }
    }
}

// ========== CANCEL BOOKING (Admin) ==========
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const result = await apiDelete(`/api/bookings/${bookingId}`);
    if (result.success) {
        showToast('Booking cancelled.', 'success');
        await loadClasses();
        loadAdminData();
    } else {
        showToast(result.error || 'Failed to cancel booking.', 'error');
    }
}

// ========== DUPLICATE CLASS (Admin) ==========
async function duplicateClass(classId) {
    const cls = allClasses.find(c => c.id === classId);
    if (!cls) return;

    const title = document.getElementById('classFormTitle');
    title.textContent = 'Duplicate Class';
    document.getElementById('classFormId').value = '';
    document.getElementById('classFormName').value = cls.name;
    document.getElementById('classFormStyle').value = cls.style;
    document.getElementById('classFormDay').value = (cls.day_of_week + 1) % 7;
    document.getElementById('classFormTime').value = cls.time;
    document.getElementById('classFormDuration').value = cls.duration;
    document.getElementById('classFormCapacity').value = cls.capacity;
    document.getElementById('classFormInstructor').value = cls.instructor;
    document.getElementById('classFormDesc').value = cls.description || '';

    openModal('classFormModal');
}

// ========== CLASS FORM (Admin) ==========
function openClassForm(classId) {
    const title = document.getElementById('classFormTitle');

    if (classId) {
        const cls = allClasses.find(c => c.id === classId);
        if (!cls) return;
        title.textContent = 'Edit Class';
        document.getElementById('classFormId').value = cls.id;
        document.getElementById('classFormName').value = cls.name;
        document.getElementById('classFormStyle').value = cls.style;
        document.getElementById('classFormDay').value = cls.day_of_week;
        document.getElementById('classFormTime').value = cls.time;
        document.getElementById('classFormDuration').value = cls.duration;
        document.getElementById('classFormCapacity').value = cls.capacity;
        document.getElementById('classFormInstructor').value = cls.instructor;
        document.getElementById('classFormDesc').value = cls.description || '';
    } else {
        title.textContent = 'Add Class';
        document.getElementById('classFormId').value = '';
        document.getElementById('classFormName').value = '';
        document.getElementById('classFormStyle').value = 'Vinyasa';
        document.getElementById('classFormDay').value = '0';
        document.getElementById('classFormTime').value = '';
        document.getElementById('classFormDuration').value = '60';
        document.getElementById('classFormCapacity').value = '20';
        document.getElementById('classFormInstructor').value = 'Charlene';
        document.getElementById('classFormDesc').value = '';
    }

    openModal('classFormModal');
}

async function handleClassFormSubmit() {
    const id = document.getElementById('classFormId').value;
    const data = {
        name: document.getElementById('classFormName').value.trim(),
        style: document.getElementById('classFormStyle').value,
        day_of_week: parseInt(document.getElementById('classFormDay').value),
        time: document.getElementById('classFormTime').value.trim(),
        duration: parseInt(document.getElementById('classFormDuration').value),
        capacity: parseInt(document.getElementById('classFormCapacity').value),
        instructor: document.getElementById('classFormInstructor').value.trim(),
        description: document.getElementById('classFormDesc').value.trim()
    };

    if (!data.name || !data.time) {
        showToast('Class name and time are required.', 'error');
        return;
    }

    const styleColors = {
        Vinyasa: '#C4956A', Power: '#8B5E3C', Yin: '#7A8B6F',
        Gentle: '#A8B5A0', Restorative: '#B8C4A8', Foundations: '#D4A574',
        'Hot Yoga': '#D4704F', 'Partner Yoga': '#B07AA1'
    };
    data.color = styleColors[data.style] || '#C4956A';

    let result;
    if (id) {
        result = await apiPut(`/api/classes/${id}`, data);
    } else {
        result = await apiPost('/api/classes', data);
    }

    if (result.success) {
        closeModal('classFormModal');
        showToast(id ? 'Class updated!' : 'Class added!', 'success');
        await loadClasses();
        loadAdminData();
    } else {
        showToast(result.error || 'Failed to save class.', 'error');
    }
}

async function deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class?')) return;
    const result = await apiDelete(`/api/classes/${classId}`);
    if (result.success) {
        showToast('Class deleted.', 'success');
        await loadClasses();
        loadAdminData();
    } else {
        showToast(result.error || 'Failed to delete class.', 'error');
    }
}

// ========== SETTINGS (Admin) ==========
async function loadSettingsIntoForm() {
    const result = await apiGet('/api/settings');
    if (result.success && result.data) {
        const s = result.data;
        document.getElementById('settingsStripeKey').value = s.stripe_publishable_key || '';
        document.getElementById('settingsPriceDropIn').value = s.stripe_price_drop_in || '';
        document.getElementById('settingsPrice5Pack').value = s.stripe_price_five_pack || '';
        document.getElementById('settingsPrice10Pack').value = s.stripe_price_ten_pack || '';
        document.getElementById('settingsPriceUnlimited').value = s.stripe_price_unlimited || '';
        document.getElementById('settingsStudioName').value = s.studio_name || '';
        document.getElementById('settingsStudioEmail').value = s.studio_email || '';
        document.getElementById('settingsStudioPhone').value = s.studio_phone || '';
        document.getElementById('settingsStudioAddress').value = s.studio_address || '';
        document.getElementById('settingsPricingDropIn').value = s.pricing_drop_in || '';
        document.getElementById('settingsPricing5Pack').value = s.pricing_five_pack || '';
        document.getElementById('settingsPricing10Pack').value = s.pricing_ten_pack || '';
        document.getElementById('settingsPricingUnlimited').value = s.pricing_unlimited || '';
    }
}

async function saveStripeSettings() {
    const settings = {
        stripe_publishable_key: document.getElementById('settingsStripeKey').value.trim(),
        stripe_price_drop_in: document.getElementById('settingsPriceDropIn').value.trim(),
        stripe_price_five_pack: document.getElementById('settingsPrice5Pack').value.trim(),
        stripe_price_ten_pack: document.getElementById('settingsPrice10Pack').value.trim(),
        stripe_price_unlimited: document.getElementById('settingsPriceUnlimited').value.trim()
    };
    const result = await apiPost('/api/settings', settings);
    if (result.success) {
        showToast('Stripe settings saved!', 'success');
        STRIPE_CONFIG.publishableKey = settings.stripe_publishable_key;
        STRIPE_CONFIG.prices.drop_in = settings.stripe_price_drop_in;
        STRIPE_CONFIG.prices.five_pack = settings.stripe_price_five_pack;
        STRIPE_CONFIG.prices.ten_pack = settings.stripe_price_ten_pack;
        STRIPE_CONFIG.prices.unlimited = settings.stripe_price_unlimited;
    } else {
        showToast(result.error || 'Failed to save settings.', 'error');
    }
}

async function saveStudioSettings() {
    const settings = {
        studio_name: document.getElementById('settingsStudioName').value.trim(),
        studio_email: document.getElementById('settingsStudioEmail').value.trim(),
        studio_phone: document.getElementById('settingsStudioPhone').value.trim(),
        studio_address: document.getElementById('settingsStudioAddress').value.trim()
    };
    const result = await apiPost('/api/settings', settings);
    if (result.success) {
        showToast('Studio info saved!', 'success');
    } else {
        showToast(result.error || 'Failed to save settings.', 'error');
    }
}

async function savePricingSettings() {
    const settings = {
        pricing_drop_in: document.getElementById('settingsPricingDropIn').value.trim(),
        pricing_five_pack: document.getElementById('settingsPricing5Pack').value.trim(),
        pricing_ten_pack: document.getElementById('settingsPricing10Pack').value.trim(),
        pricing_unlimited: document.getElementById('settingsPricingUnlimited').value.trim()
    };
    const result = await apiPost('/api/settings', settings);
    if (result.success) {
        showToast('Pricing updated!', 'success');
        if (settings.pricing_drop_in) updatePricingCard('drop_in', settings.pricing_drop_in);
        if (settings.pricing_five_pack) updatePricingCard('5_pack', settings.pricing_five_pack);
        if (settings.pricing_ten_pack) updatePricingCard('10_pack', settings.pricing_ten_pack);
        if (settings.pricing_unlimited) updatePricingCard('unlimited', settings.pricing_unlimited);
    } else {
        showToast(result.error || 'Failed to save pricing.', 'error');
    }
}

// ========== MODAL HELPERS ==========
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    const anyOpen = document.querySelector('.modal-overlay.active');
    const adminOpen = !document.getElementById('adminPanel').classList.contains('hidden');
    if (!anyOpen && !adminOpen) {
        document.body.style.overflow = '';
    }
}

// ========== TOAST ==========
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type} visible`;
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// ========== UTILS ==========
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatPackage(type) {
    const map = { drop_in: 'Single Class', unlimited: 'Unlimited Monthly' };
    return map[type] || type;
}