// app.js - Slideshower 2001 v2

// State
let currentUser = null;
let slideTheme = 'dark';
let logoIdx = 4;
let logoImg = null;
let zoom = 0.5;
let vehicles = [];
let currentIdx = 0;
let feedVehicles = [];
let feedUploadDate = null;
let selectedIds = new Set();
let feedSort = { col: 'days', dir: 'asc' };

let visibility = {
    showBadge: true, showStock: true, showYear: true, showTrim: true,
    showPriceLabel: true, showHighlight: true, showPayment: true,
    showDown: false, showDisclaimer: true
};

let typo = {
    yearFont: 'Toyota Type', yearWeight: 700, yearSize: 30, yearGap: 30,
    makeFont: 'Toyota Type', makeWeight: 900, makeSize: 66, makeGap: -10,
    modelFont: 'Toyota Type', modelWeight: 600, modelSize: 60, modelGap: -15,
    trimFont: 'Toyota Type', trimWeight: 600, trimSize: 30, trimGap: 70,
    priceFont: 'Toyota Type', priceWeight: 700, priceSize: 70, priceGap: 25,
    hlFont: 'Toyota Type', hlWeight: 900, hlSize: 40, hlPad: 15, hlRadius: 10,
    payFont: 'Toyota Type', payWeight: 700, paySize: 60, payPad: 15,
    badgeFont: 'Toyota Type', badgeWeight: 900, badgeSize: 24,
    downFont: 'DM Sans', downWeight: 500, downSize: 18,
    discFont: 'Inter', discWeight: 700, discSize: 18,
    marginOuter: 75, cardPad: 20, infoOffset: 55, headerTop: 65
};

// Global color overrides (empty = use theme defaults)
let colors = {
    accent: '', year: '', line: '', text: '', textSub: '', price: '', trim: '',
    badgeBg: '', badgeText: '', hlBg: '', hlText: '',
    payBg: '', payText: '', payLabel: '',
    downText: '', discText: '',
    bg1: '', bg2: '', card: ''
};

// AUTH FUNCTIONS
function showLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.login-tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById('signinForm').style.display = tab === 'signin' ? 'flex' : 'none';
    document.getElementById('signupForm').style.display = tab === 'signup' ? 'flex' : 'none';
}

async function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    const errorEl = document.getElementById('signinError');
    errorEl.textContent = '';
    
    try {
        await window.authHelpers.signInWithEmailAndPassword(window.auth, email, password);
    } catch (err) {
        errorEl.textContent = err.message.replace('Firebase: ', '');
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const errorEl = document.getElementById('signupError');
    errorEl.textContent = '';
    
    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        return;
    }
    
    try {
        await window.authHelpers.createUserWithEmailAndPassword(window.auth, email, password);
    } catch (err) {
        errorEl.textContent = err.message.replace('Firebase: ', '');
    }
}

async function handleSignOut() {
    await window.authHelpers.signOut(window.auth);
}

// Called when user logs in
window.onUserLogin = async function(user) {
    currentUser = user;
    loadStorage();
    loadTypoUI();
    loadColorsUI();
    renderThemes();
    renderLogos();
    await loadFeedFromFirebase();
    renderFeed();
    renderInv();
    updatePanel();
    setTimeout(loadLayouts, 500);
};

// FIREBASE FEED STORAGE
async function saveFeedToFirebase() {
    if (!currentUser || !window.firebaseReady) return;
    
    try {
        document.getElementById('syncStatus').textContent = 'Saving...';
        await window.fbHelpers.setDoc(
            window.fbHelpers.doc(window.db, 'users', currentUser.uid, 'data', 'feed'),
            { 
                vehicles: feedVehicles,
                uploadDate: feedUploadDate,
                updatedAt: new Date().toISOString()
            }
        );
        document.getElementById('syncStatus').textContent = 'Synced';
    } catch (e) {
        console.error('Save feed error:', e);
        document.getElementById('syncStatus').textContent = 'Sync error';
    }
}

async function loadFeedFromFirebase() {
    if (!currentUser || !window.firebaseReady) return;
    
    try {
        const snap = await window.fbHelpers.getDoc(
            window.fbHelpers.doc(window.db, 'users', currentUser.uid, 'data', 'feed')
        );
        if (snap.exists()) {
            const data = snap.data();
            feedVehicles = data.vehicles || [];
            feedUploadDate = data.uploadDate || null;
            hydrateDropdowns();
            updateFeedInfo();
        }
    } catch (e) {
        console.error('Load feed error:', e);
    }
}

function updateFeedInfo() {
    const el = document.getElementById('feedInfo');
    if (feedUploadDate) {
        const d = new Date(feedUploadDate);
        el.innerHTML = `<strong>${feedVehicles.length}</strong> vehicles | Uploaded ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
        el.textContent = feedVehicles.length ? `${feedVehicles.length} vehicles` : 'No feed loaded';
    }
}

// TYPOGRAPHY UI
function loadTypoUI() {
    // Populate font dropdowns
    const displayFonts = FONTS.display;
    const bodyFonts = FONTS.body;
    
    ['year', 'make', 'model', 'price', 'hl', 'pay', 'badge'].forEach(id => {
        const fontEl = document.getElementById(id + 'Font');
        if (fontEl) {
            fontEl.innerHTML = displayFonts.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
            fontEl.value = typo[id + 'Font'];
            fontEl.onchange = () => { updateWeightOptions(id); saveTypo(); updatePreview(); };
        }
        updateWeightOptions(id);
    });
    
    ['trim', 'down', 'disc'].forEach(id => {
        const fontEl = document.getElementById(id + 'Font');
        if (fontEl) {
            fontEl.innerHTML = bodyFonts.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
            fontEl.value = typo[id + 'Font'];
            fontEl.onchange = () => { updateWeightOptions(id); saveTypo(); updatePreview(); };
        }
        updateWeightOptions(id);
    });
    
    // Set sizes
    ['year', 'make', 'model', 'trim', 'price', 'hl', 'pay', 'badge', 'down', 'disc'].forEach(id => {
        const sizeEl = document.getElementById(id + 'Size');
        if (sizeEl) sizeEl.value = typo[id + 'Size'];
    });
    
    // Set gaps/pads as sliders
    document.getElementById('yearGap').value = typo.yearGap;
    document.getElementById('makeGap').value = typo.makeGap;
    document.getElementById('modelGap').value = typo.modelGap;
    document.getElementById('trimGap').value = typo.trimGap;
    document.getElementById('priceGap').value = typo.priceGap;
    document.getElementById('hlPad').value = typo.hlPad;
    document.getElementById('payPad').value = typo.payPad;
    document.getElementById('marginOuter').value = typo.marginOuter;
    document.getElementById('cardPad').value = typo.cardPad;
    document.getElementById('infoOffset').value = typo.infoOffset;
    document.getElementById('headerTop').value = typo.headerTop;
    if (document.getElementById('hlRadius')) document.getElementById('hlRadius').value = typo.hlRadius || 8;
    
    updateSliderVals();
}

function updateWeightOptions(id) {
    const fontName = document.getElementById(id + 'Font')?.value;
    const weightEl = document.getElementById(id + 'Weight');
    if (!fontName || !weightEl) return;
    
    const allFonts = [...FONTS.display, ...FONTS.body];
    const font = allFonts.find(f => f.name === fontName);
    const weights = font?.weights || [400];
    
    weightEl.innerHTML = weights.map(w => `<option value="${w}">${WEIGHT_LABELS[w] || w}</option>`).join('');
    
    // Set current value or default
    const currentWeight = typo[id + 'Weight'];
    if (weights.includes(currentWeight)) {
        weightEl.value = currentWeight;
    } else {
        weightEl.value = weights[0];
        typo[id + 'Weight'] = weights[0];
    }
}

function saveTypo() {
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const v = +el.value;
        return isNaN(v) ? def : v;
    };
    const getStr = (id, def) => document.getElementById(id)?.value || def;
    
    typo.yearFont = getStr('yearFont', typo.yearFont);
    typo.yearWeight = getVal('yearWeight', 700);
    typo.yearSize = getVal('yearSize', 30);
    typo.yearGap = getVal('yearGap', 30);
    
    typo.makeFont = getStr('makeFont', typo.makeFont);
    typo.makeWeight = getVal('makeWeight', 900);
    typo.makeSize = getVal('makeSize', 66);
    typo.makeGap = getVal('makeGap', -10);
    
    typo.modelFont = getStr('modelFont', typo.modelFont);
    typo.modelWeight = getVal('modelWeight', 600);
    typo.modelSize = getVal('modelSize', 60);
    typo.modelGap = getVal('modelGap', -15);
    
    typo.trimFont = getStr('trimFont', typo.trimFont);
    typo.trimWeight = getVal('trimWeight', 600);
    typo.trimSize = getVal('trimSize', 30);
    typo.trimGap = getVal('trimGap', 70);
    
    typo.priceFont = getStr('priceFont', typo.priceFont);
    typo.priceWeight = getVal('priceWeight', 700);
    typo.priceSize = getVal('priceSize', 70);
    typo.priceGap = getVal('priceGap', 25);
    
    typo.hlFont = getStr('hlFont', typo.hlFont);
    typo.hlWeight = getVal('hlWeight', 900);
    typo.hlSize = getVal('hlSize', 40);
    typo.hlPad = getVal('hlPad', 15);
    typo.hlRadius = getVal('hlRadius', 10);
    
    typo.payFont = getStr('payFont', typo.payFont);
    typo.payWeight = getVal('payWeight', 700);
    typo.paySize = getVal('paySize', 60);
    typo.payPad = getVal('payPad', 15);
    
    typo.badgeFont = getStr('badgeFont', typo.badgeFont);
    typo.badgeWeight = getVal('badgeWeight', 900);
    typo.badgeSize = getVal('badgeSize', 24);
    
    typo.downFont = getStr('downFont', typo.downFont);
    typo.downWeight = getVal('downWeight', 500);
    typo.downSize = getVal('downSize', 18);
    
    typo.discFont = getStr('discFont', typo.discFont);
    typo.discWeight = getVal('discWeight', 700);
    typo.discSize = getVal('discSize', 18);
    
    typo.marginOuter = getVal('marginOuter', 75);
    typo.cardPad = getVal('cardPad', 20);
    typo.infoOffset = getVal('infoOffset', 55);
    typo.headerTop = getVal('headerTop', 65);
    
    updateSliderVals();
    saveStorage();
}

function updateSliderVals() {
    const setVal = (id) => {
        const el = document.getElementById(id + 'Val');
        const input = document.getElementById(id);
        if (el && input) el.textContent = input.value;
    };
    ['yearGap', 'makeGap', 'modelGap', 'trimGap', 'priceGap', 'hlPad', 'payPad', 
     'marginOuter', 'cardPad', 'infoOffset', 'headerTop', 'hlRadius'].forEach(setVal);
}

// COLORS UI
function loadColorsUI() {
    const T = THEMES[slideTheme];
    // Map of color keys to their theme default values
    const themeDefaults = getThemeColorMap(T);
    
    Object.keys(colors).forEach(key => {
        const picker = document.getElementById('color' + capitalize(key));
        const text = document.getElementById('color' + capitalize(key) + 'Text');
        if (picker) {
            if (colors[key]) {
                // User has an override - show it
                picker.value = colors[key];
                if (text) text.value = colors[key];
            } else {
                // No override - show theme default in picker but leave text empty
                picker.value = themeDefaults[key] || '#000000';
                if (text) text.value = '';
            }
        }
    });
}

function getThemeColorMap(T) {
    return {
        accent: T.year || '#EB0A1E',
        year: T.year || '#EB0A1E',
        line: T.line || T.year || '#EB0A1E',
        text: T.text || '#ffffff',
        textSub: T.textSub || '#888888',
        price: T.price || T.text || '#ffffff',
        trim: T.trim || T.textSub || '#a1a1a1',
        badgeBg: T.badge?.bg || T.year || '#EB0A1E',
        badgeText: T.badge?.text || '#ffffff',
        hlBg: T.hl?.bg || T.highlight?.bg || T.year || '#EB0A1E',
        hlText: T.hl?.text || T.highlight?.text || '#ffffff',
        payBg: T.payBox?.bg || T.year || '#EB0A1E',
        payText: T.payBox?.text || '#ffffff',
        payLabel: T.payLabel || T.payBox?.label || T.year || '#EB0A1E',
        downText: T.textSub || '#888888',
        discText: T.disc || T.textSub || '#888888',
        bg1: T.bg?.[0] || '#0f0f0f',
        bg2: T.bg?.[1] || '#1a1a1a',
        card: T.card || '#1a1a1a'
    };
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function updateColors() {
    const colorKeys = ['accent', 'year', 'line', 'text', 'textSub', 'price', 'trim',
                       'badgeBg', 'badgeText', 'hlBg', 'hlText', 
                       'payBg', 'payText', 'payLabel', 'downText', 'discText',
                       'bg1', 'bg2', 'card'];
    
    colorKeys.forEach(key => {
        const text = document.getElementById('color' + capitalize(key) + 'Text');
        const picker = document.getElementById('color' + capitalize(key));
        // Only save as override if text field has a value (user explicitly set it)
        if (text && text.value && text.value.match(/^#[0-9A-Fa-f]{6}$/)) {
            colors[key] = text.value;
            if (picker) picker.value = text.value;
        } else if (text && !text.value) {
            // Text cleared = revert to theme default
            colors[key] = '';
        }
    });
    
    saveStorage();
    updatePreview();
}

function handleColorPicker(key) {
    // Called when user interacts with a color picker directly
    const picker = document.getElementById('color' + capitalize(key));
    const text = document.getElementById('color' + capitalize(key) + 'Text');
    if (picker && text) {
        text.value = picker.value;
        colors[key] = picker.value;
    }
    saveStorage();
    updatePreview();
}

function syncColorFromText(pickerId) {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(pickerId + 'Text');
    if (picker && text) {
        if (text.value === '') {
            // Clearing the text = revert to theme default
            const T = THEMES[slideTheme];
            const defaults = getThemeColorMap(T);
            const key = pickerId.replace('color', '');
            const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
            picker.value = defaults[lowerKey] || '#000000';
            colors[lowerKey] = '';
            saveStorage();
            updatePreview();
        } else if (text.value.match(/^#[0-9A-Fa-f]{6}$/)) {
            picker.value = text.value;
            const key = pickerId.replace('color', '');
            const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
            colors[lowerKey] = text.value;
            saveStorage();
            updatePreview();
        }
    }
}

function loadFromTheme(themeName) {
    const T = THEMES[themeName];
    if (!T) return;
    const themeColors = getThemeColorMap(T);
    
    Object.keys(themeColors).forEach(key => {
        colors[key] = themeColors[key];
        const picker = document.getElementById('color' + capitalize(key));
        const text = document.getElementById('color' + capitalize(key) + 'Text');
        if (picker) picker.value = themeColors[key];
        if (text) text.value = themeColors[key];
    });
    
    saveStorage();
    updatePreview();
    toast('Loaded colors from ' + T.name);
}

function resetColors() {
    Object.keys(colors).forEach(key => colors[key] = '');
    loadColorsUI();
    saveStorage();
    updatePreview();
    toast('Colors reset to theme defaults');
}

// VIEW SWITCHING
function switchView(v) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === v));
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(v + 'View').classList.add('active');
    
    if (v === 'design') {
        setTimeout(() => {
            initCanvas();
            loadLogo().then(updatePreview);
        }, 50);
    }
    if (v === 'colors') {
        // Populate theme color loader dropdown
        const loader = document.getElementById('themeColorLoader');
        if (loader && loader.options.length <= 1) {
            Object.entries(THEMES).forEach(([k, t]) => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = t.name;
                loader.appendChild(opt);
            });
        }
        setTimeout(() => {
            loadLogo().then(updatePreview);
        }, 50);
    }
    if (v === 'inventory') renderInv();
}

// THEMES
function renderThemes() {
    document.getElementById('themeGrid').innerHTML = Object.entries(THEMES).map(([k, t]) =>
        `<div class="theme-card ${k === slideTheme ? 'selected' : ''}" onclick="selectTheme('${k}')">
            <div class="theme-preview" style="background:linear-gradient(135deg,${t.bg[0]},${t.bg[1]})"></div>
            <div class="theme-name">${t.name}</div>
        </div>`
    ).join('');
}

function selectTheme(t) {
    slideTheme = t;
    renderThemes();
    saveStorage();
    updatePreview();
}

// LOGOS
function renderLogos() {
    document.getElementById('logoGrid').innerHTML = LOGOS.map((l, i) =>
        `<div class="logo-option ${i === logoIdx ? 'selected' : ''} ${l.dark ? 'dark-bg' : ''}" onclick="selectLogo(${i})">
            <img src="${l.url}">
        </div>`
    ).join('');
}

function selectLogo(i) {
    logoIdx = i;
    renderLogos();
    saveStorage();
    loadLogo().then(updatePreview);
}

async function loadLogo() {
    const l = LOGOS[logoIdx];
    if (!l) return;
    return new Promise(r => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { logoImg = img; r(); };
        img.onerror = r;
        img.src = l.url;
    });
}

// CANVAS
function initCanvas() {
    const container = document.getElementById('canvasArea');
    const wrap = document.getElementById('canvasWrap');
    const canvas = document.getElementById('mainCanvas');
    if (!container || !wrap || !canvas) return;
    
    const rect = container.getBoundingClientRect();
    const availW = rect.width - 40;
    const availH = rect.height - 40;
    
    const scaleW = availW / 1920;
    const scaleH = availH / 1080;
    zoom = Math.min(scaleW, scaleH, 1);
    zoom = Math.max(0.25, zoom);
    
    const displayW = Math.floor(1920 * zoom);
    const displayH = Math.floor(1080 * zoom);
    wrap.style.width = displayW + 'px';
    wrap.style.height = displayH + 'px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
}

function zoomIn() { zoom = Math.min(1, zoom + 0.1); updateZoom(); }
function zoomOut() { zoom = Math.max(0.2, zoom - 0.1); updateZoom(); }
function zoomFit() { initCanvas(); }

function updateZoom() {
    const wrap = document.getElementById('canvasWrap');
    wrap.style.width = Math.floor(1920 * zoom) + 'px';
    wrap.style.height = Math.floor(1080 * zoom) + 'px';
    document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
}

// PREVIEW
let updateTO;
function updatePreview() {
    clearTimeout(updateTO);
    updateTO = setTimeout(() => {
        const v = vehicles[currentIdx] || {
            year: '2025', make: 'Toyota', model: 'Camry', trim: 'XSE',
            stock: 'T12345', price: 34999, payment: 499, down: 3999,
            days: 0, imageUrl: '', imageObj: null
        };
        
        loadImg(v).then(() => {
            // Main design canvas
            const canvas = document.getElementById('mainCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                drawSlide(ctx, v, 1920, 1080, 1, currentIdx);
            }
            
            // Color preview canvas
            const colorCanvas = document.getElementById('colorPreviewCanvas');
            if (colorCanvas) {
                const ctx2 = colorCanvas.getContext('2d');
                drawSlide(ctx2, v, 1920, 1080, 1, currentIdx);
            }
            
            // Update color preview info
            const colorInfo = document.getElementById('colorPreviewInfo');
            if (colorInfo) {
                colorInfo.textContent = vehicles[currentIdx] 
                    ? `${v.year} ${v.make} ${v.model} (${currentIdx + 1}/${vehicles.length})`
                    : 'No Vehicle';
            }
        });
    }, 50);
}

async function loadImg(v) {
    if (v.imageObj || !v.imageUrl) return;
    return new Promise(r => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { v.imageObj = img; r(); };
        img.onerror = r;
        img.src = v.imageUrl;
    });
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Get color with override support
function getColor(themeColor, overrideKey) {
    return colors[overrideKey] || themeColor;
}

// DRAW SLIDE
function drawSlide(ctx, v, W, H, opacity, idx) {
    const T = THEMES[slideTheme];
    const TY = typo;
    
    const S = {
        badge: document.getElementById('badgeText')?.value || "MANAGER'S SPECIAL",
        priceLabel: document.getElementById('priceLabelText')?.value || 'SPECIAL PRICE',
        highlight: document.getElementById('highlightText')?.value || 'BUY WITH $0 DOWN!',
        payLabel: document.getElementById('paymentLabel')?.value || 'OR PAYMENTS FROM',
        paySuffix: document.getElementById('paymentSuffix')?.value || '/MO',
        disc: document.getElementById('disclaimer')?.value || '',
        logoSize: +document.getElementById('logoSize')?.value || 108,
        imgPos: document.getElementById('imgPos')?.value || 'left',
        imgSize: document.getElementById('imgSize')?.value || 'medium',
        badgePos: document.getElementById('badgePos')?.value || 'top-right',
        cardStyle: document.getElementById('cardStyle')?.value || 'border'
    };
    
    const M = TY.marginOuter;
    const accent = v.overrideAccentColor || getColor(T.hl.bg, 'accent');
    const badgeTxt = v.overrideBadge || S.badge;
    const hlTxt = v.overrideHighlight || S.highlight;
    const showPay = visibility.showPayment && !v.hidePayment && v.payment > 0;
    
    const badgeBg = v.overrideAccentColor || getColor(T.badge.bg, 'badgeBg');
    const hlBg = v.overrideAccentColor || getColor(T.hl.bg, 'hlBg');
    const payBg = v.overrideAccentColor || getColor(T.payBox.bg, 'payBg');
    const yearC = v.overrideAccentColor || getColor(T.year, 'year');
    const lineC = v.overrideAccentColor || getColor(T.line, 'line');
    
    let imgR = S.imgPos === 'right';
    if (S.imgPos === 'alternate') imgR = idx % 2 === 1;
    const badgeL = S.badgePos === 'top-left';
    
    ctx.globalAlpha = opacity;
    
    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, getColor(T.bg[0], 'bg1'));
    bg.addColorStop(1, getColor(T.bg[1], 'bg2'));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    
    // Header gradient overlay
    const hg = ctx.createLinearGradient(0, 0, 0, 180);
    hg.addColorStop(0, 'rgba(0,0,0,0.3)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, 180);
    
    // Logo
    if (logoImg) {
        const r = logoImg.width / logoImg.height;
        const lW = S.logoSize * r;
        const lH = S.logoSize;
        const lX = badgeL ? W - M - lW : M;
        ctx.drawImage(logoImg, lX, M - 10, lW, lH);
    }
    
    // Badge
    if (visibility.showBadge) {
        ctx.font = `${TY.badgeWeight} ${TY.badgeSize}px "${TY.badgeFont}", sans-serif`;
        const bW = ctx.measureText(badgeTxt).width + 36;
        const bH = TY.badgeSize + 22;
        const bX = badgeL ? M : W - M - bW;
        const bY = M - 8;
        ctx.fillStyle = badgeBg;
        rr(ctx, bX, bY, bW, bH, 4);
        ctx.fill();
        ctx.fillStyle = getColor(T.badge.text, 'badgeText');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeTxt, bX + bW / 2, bY + bH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    // Card
    const cX = M;
    const cY = M + 100;
    const cW = W - M * 2;
    const cH = H - cY - M - (visibility.showDisclaimer ? 50 : 20);
    
    if (S.cardStyle === 'shadow') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        rr(ctx, cX + 4, cY + 4, cW, cH, 16);
        ctx.fill();
    }
    
    ctx.fillStyle = getColor(T.card, 'card');
    rr(ctx, cX, cY, cW, cH, 16);
    ctx.fill();
    
    if (S.cardStyle === 'border') {
        ctx.strokeStyle = lineC;
        ctx.lineWidth = 3;
        rr(ctx, cX, cY, cW, cH, 16);
        ctx.stroke();
    }
    
    // Image area
    const imgRatios = { small: 0.40, medium: 0.46, large: 0.52 };
    const imgRatio = imgRatios[S.imgSize] || 0.46;
    const imgPad = TY.cardPad;
    const imgW = cW * imgRatio;
    const imgH = cH - imgPad * 2;
    const imgX = imgR ? cX + cW - imgPad - imgW : cX + imgPad;
    const imgY = cY + imgPad;
    
    ctx.fillStyle = T.imgBg;
    rr(ctx, imgX, imgY, imgW, imgH, 12);
    ctx.fill();
    
    if (v.imageObj) {
        ctx.save();
        rr(ctx, imgX, imgY, imgW, imgH, 12);
        ctx.clip();
        const ir = v.imageObj.width / v.imageObj.height;
        const ar = imgW / imgH;
        let dw, dh, dx, dy;
        if (ir > ar) {
            dh = imgH; dw = dh * ir;
            dx = imgX + (imgW - dw) / 2; dy = imgY;
        } else {
            dw = imgW; dh = dw / ir;
            dx = imgX; dy = imgY + (imgH - dh) / 2;
        }
        ctx.drawImage(v.imageObj, dx, dy, dw, dh);
        ctx.restore();
    }
    
    // Info area
    const infoX = imgR ? cX + imgPad + 30 : imgX + imgW + TY.infoOffset;
    const infoW = cW - imgW - imgPad - TY.infoOffset - 30;
    let Y = cY + TY.headerTop;
    
    // Stock badge
    if (visibility.showStock) {
        ctx.font = '600 18px "DM Sans", sans-serif';
        const sTxt = 'Stock #' + v.stock;
        const sW = ctx.measureText(sTxt).width + 20;
        const sH = 32;
        ctx.fillStyle = 'rgba(128,128,128,0.15)';
        rr(ctx, infoX + infoW - sW, Y, sW, sH, sH / 2);
        ctx.fill();
        ctx.fillStyle = getColor(T.textSub, 'textSub');
        ctx.textBaseline = 'middle';
        ctx.fillText(sTxt, infoX + infoW - sW + 10, Y + sH / 2);
        ctx.textBaseline = 'alphabetic';
    }
    Y += 55;
    
    // Year
    if (visibility.showYear) {
        ctx.font = `${TY.yearWeight} ${TY.yearSize}px "${TY.yearFont}", sans-serif`;
        ctx.fillStyle = yearC;
        ctx.fillText(v.year, infoX, Y);
        Y += TY.yearSize + TY.yearGap;
    }
    
    // Make
    let fs = TY.makeSize;
    ctx.font = `${TY.makeWeight} ${fs}px "${TY.makeFont}", sans-serif`;
    while (ctx.measureText(v.make.toUpperCase()).width > infoW - 20 && fs > 30) {
        fs -= 2;
        ctx.font = `${TY.makeWeight} ${fs}px "${TY.makeFont}", sans-serif`;
    }
    ctx.fillStyle = getColor(T.text, 'text');
    ctx.fillText(v.make.toUpperCase(), infoX, Y);
    Y += fs + TY.makeGap;
    
    // Model
    fs = TY.modelSize;
    ctx.font = `${TY.modelWeight} ${fs}px "${TY.modelFont}", sans-serif`;
    while (ctx.measureText(v.model.toUpperCase()).width > infoW - 20 && fs > 30) {
        fs -= 2;
        ctx.font = `${TY.modelWeight} ${fs}px "${TY.modelFont}", sans-serif`;
    }
    ctx.fillText(v.model.toUpperCase(), infoX, Y);
    Y += fs + TY.modelGap;
    
    // Trim
    if (visibility.showTrim) {
        ctx.font = `${TY.trimWeight} ${TY.trimSize}px "${TY.trimFont}", sans-serif`;
        ctx.fillStyle = getColor(T.trim, 'trim');
        ctx.fillText(v.trim.toUpperCase(), infoX, Y);
        Y += TY.trimGap;
    } else {
        Y += 15;
    }
    
    // Price label
    if (visibility.showPriceLabel) {
        ctx.font = '600 18px "DM Sans", sans-serif';
        ctx.fillStyle = getColor(T.priceLabel, 'textSub');
        ctx.fillText(S.priceLabel.toUpperCase(), infoX, Y);
        Y += 28;
    }
    
    // Price
    ctx.font = `${TY.priceWeight} ${TY.priceSize}px "${TY.priceFont}", sans-serif`;
    ctx.fillStyle = getColor(T.price, 'price');
    const pTxt = '$' + v.price.toLocaleString();
    const pW = ctx.measureText(pTxt).width;
    ctx.fillText(pTxt, infoX, Y + TY.priceSize * 0.75);
    
    // Highlight - perfectly centered with rounded corners
    if (visibility.showHighlight) {
        ctx.font = `${TY.hlWeight} ${TY.hlSize}px "${TY.hlFont}", sans-serif`;
        const hlW = ctx.measureText(hlTxt).width + TY.hlPad * 2;
        const hlH = TY.hlSize + 20;
        const hlX = infoX + pW + 24;
        const hlY = Y + (TY.priceSize * 0.75) / 2 - hlH / 2;
        ctx.fillStyle = hlBg;
        rr(ctx, hlX, hlY, hlW, hlH, TY.hlRadius || 8);
        ctx.fill();
        ctx.fillStyle = getColor(T.hl.text, 'hlText');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hlTxt, hlX + hlW / 2, hlY + hlH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    // Payment
    if (showPay) {
        Y += TY.priceSize + TY.priceGap;
        
        ctx.font = '700 20px "DM Sans", sans-serif';
        ctx.fillStyle = getColor(T.payLabel, 'payLabel');
        const plTxt = S.payLabel.toUpperCase();
        const plW = ctx.measureText(plTxt).width;
        
        ctx.strokeStyle = lineC;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(infoX, Y - 4);
        ctx.lineTo(infoX + 40, Y - 4);
        ctx.stroke();
        ctx.fillText(plTxt, infoX + 52, Y);
        ctx.beginPath();
        ctx.moveTo(infoX + 52 + plW + 12, Y - 4);
        ctx.lineTo(infoX + 52 + plW + 52, Y - 4);
        ctx.stroke();
        
        Y += 28;
        
        const payTxt = '$' + v.payment + S.paySuffix;
        ctx.font = `${TY.payWeight} ${TY.paySize}px "${TY.payFont}", sans-serif`;
        const payW = ctx.measureText(payTxt).width;
        const boxW = payW + TY.payPad * 2;
        const boxH = TY.paySize + 26;
        
        ctx.fillStyle = payBg;
        rr(ctx, infoX, Y, boxW, boxH, 8);
        ctx.fill();
        ctx.fillStyle = getColor(T.payBox.text, 'payText');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(payTxt, infoX + boxW / 2, Y + boxH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        if (visibility.showDown && v.down > 0) {
            ctx.font = `${TY.downWeight} ${TY.downSize}px "${TY.downFont}", sans-serif`;
            ctx.fillStyle = getColor(T.textSub, 'downText');
            ctx.fillText('with $' + v.down.toLocaleString() + ' down', infoX, Y + boxH + 24);
        }
    }
    
    // Disclaimer
    if (visibility.showDisclaimer && S.disc) {
        ctx.font = `${TY.discWeight} ${TY.discSize}px "${TY.discFont}", sans-serif`;
        ctx.fillStyle = getColor(T.disc, 'discText');
        ctx.textAlign = 'center';
        ctx.fillText(S.disc, W / 2, H - M + 24);
        ctx.textAlign = 'left';
    }
    
    ctx.globalAlpha = 1;
}

// VISIBILITY TOGGLE
function toggleVis(el) {
    const k = el.id;
    visibility[k] = !visibility[k];
    el.classList.toggle('active', visibility[k]);
    saveStorage();
    updatePreview();
}

// PANEL UPDATE
function updatePanel() {
    const v = vehicles[currentIdx];
    document.getElementById('cvName').textContent = v ? `${v.year} ${v.make} ${v.model}` : 'No vehicle';
    document.getElementById('cvStock').textContent = v ? `#${v.stock} - ${v.trim}` : '-';
    document.getElementById('cvPrice').textContent = v ? '$' + v.price.toLocaleString() : '-';
    document.getElementById('cvDays').textContent = v && v.days != null ? v.days + ' days' : '';
    document.getElementById('navTitle').textContent = v ? `${v.year} ${v.make} ${v.model}` : 'No Vehicle';
    document.getElementById('navSub').textContent = v ? `${currentIdx + 1} of ${vehicles.length}` : 'Add vehicles';
    document.getElementById('invBadge').textContent = vehicles.length;
    
    if (v) {
        document.getElementById('ovBadge').value = v.overrideBadge || '';
        document.getElementById('ovHighlight').value = v.overrideHighlight || '';
        document.getElementById('ovColor').value = v.overrideAccentColor || '';
        document.getElementById('ovHidePay').classList.toggle('active', v.hidePayment);
    }
}

function updateOverride() {
    if (!vehicles[currentIdx]) return;
    vehicles[currentIdx].overrideBadge = document.getElementById('ovBadge').value;
    vehicles[currentIdx].overrideHighlight = document.getElementById('ovHighlight').value;
    vehicles[currentIdx].overrideAccentColor = document.getElementById('ovColor').value;
    saveStorage();
    updatePreview();
}

function toggleOv(el) {
    if (!vehicles[currentIdx]) return;
    el.classList.toggle('active');
    vehicles[currentIdx].hidePayment = el.classList.contains('active');
    saveStorage();
    updatePreview();
}

// NAVIGATION
function prevVehicle() {
    if (!vehicles.length) return;
    currentIdx = (currentIdx - 1 + vehicles.length) % vehicles.length;
    updatePanel();
    updatePreview();
}

function nextVehicle() {
    if (!vehicles.length) return;
    currentIdx = (currentIdx + 1) % vehicles.length;
    updatePanel();
    updatePreview();
}

// DAYS FILTER
function filterDays(v, minDays) {
    if (!minDays || minDays === '' || minDays === 0) return true;
    return (v.days ?? 0) >= minDays;
}

// INVENTORY
function renderInv() {
    const search = (document.getElementById('invSearch')?.value || '').toLowerCase();
    const minDays = +document.getElementById('invDaysFilter')?.value || 0;
    
    const filtered = vehicles.filter(v => {
        if (!filterDays(v, minDays)) return false;
        if (search && !`${v.year} ${v.make} ${v.model} ${v.trim} ${v.stock}`.toLowerCase().includes(search)) return false;
        return true;
    });
    
    document.getElementById('invCount').textContent = filtered.length + ' vehicles';
    document.getElementById('invBadge').textContent = vehicles.length;
    
    if (!filtered.length) {
        document.getElementById('invGrid').innerHTML = '<div class="empty">No vehicles</div>';
        return;
    }
    
    document.getElementById('invGrid').innerHTML = filtered.map(v => {
        const i = vehicles.indexOf(v);
        const dc = v.days >= 61 ? 'danger' : v.days >= 46 ? 'warn' : '';
        return `<div class="inv-card">
            ${v.imageUrl ? `<img class="inv-card-img" src="${v.imageUrl}" onerror="this.style.display='none'">` : '<div class="inv-card-img"></div>'}
            <div class="inv-card-body">
                <div class="inv-card-title">${v.year} ${v.make} ${v.model}</div>
                <div class="inv-card-sub">${v.trim} - #${v.stock}</div>
                <div class="inv-card-price">$${v.price.toLocaleString()}</div>
                <div class="inv-card-days"><span class="days-badge ${dc}">${v.days ?? 0} days</span></div>
                <div class="inv-card-actions">
                    <button class="btn btn-sm" onclick="goTo(${i})">View</button>
                    <button class="btn btn-sm" onclick="openEdit(${i})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteVehicle(${i})">Del</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function goTo(i) {
    currentIdx = i;
    switchView('design');
    updatePanel();
    updatePreview();
}

function addVehicle() {
    const rate = +document.getElementById('globalRate').value || 6.9;
    const term = +document.getElementById('globalTerm').value || 72;
    const down = +document.getElementById('newDown').value || 3999;
    const price = +document.getElementById('newPrice').value || 0;
    let pay = +document.getElementById('newPayment').value || 0;
    if (!pay && price) pay = calcPay(price, rate, term, down);
    
    vehicles.push({
        year: document.getElementById('newYear').value,
        make: document.getElementById('newMake').value,
        model: document.getElementById('newModel').value,
        trim: document.getElementById('newTrim').value,
        stock: document.getElementById('newStock').value,
        price, payment: pay, down,
        days: +document.getElementById('newDays').value || 0,
        imageUrl: document.getElementById('newImg').value,
        imageObj: null,
        overrideBadge: '', overrideHighlight: '', overrideAccentColor: '',
        hidePayment: false
    });
    
    currentIdx = vehicles.length - 1;
    saveStorage();
    renderInv();
    updatePanel();
    closeModal('addModal');
    ['newYear', 'newMake', 'newModel', 'newTrim', 'newStock', 'newPrice', 'newPayment', 'newImg'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('newDays').value = '0';
    document.getElementById('newDown').value = '3999';
    toast('Added');
}

function openEdit(i) {
    const v = vehicles[i];
    document.getElementById('editIdx').value = i;
    document.getElementById('editYear').value = v.year;
    document.getElementById('editMake').value = v.make;
    document.getElementById('editModel').value = v.model;
    document.getElementById('editTrim').value = v.trim;
    document.getElementById('editStock').value = v.stock;
    document.getElementById('editPrice').value = v.price;
    document.getElementById('editPayment').value = v.payment;
    document.getElementById('editDown').value = v.down;
    document.getElementById('editDays').value = v.days ?? 0;
    document.getElementById('editImg').value = v.imageUrl;
    showModal('editModal');
}

function saveEdit() {
    const i = +document.getElementById('editIdx').value;
    const v = vehicles[i];
    if (!v) return;
    
    v.year = document.getElementById('editYear').value;
    v.make = document.getElementById('editMake').value;
    v.model = document.getElementById('editModel').value;
    v.trim = document.getElementById('editTrim').value;
    v.stock = document.getElementById('editStock').value;
    v.price = +document.getElementById('editPrice').value || 0;
    v.payment = +document.getElementById('editPayment').value || 0;
    v.down = +document.getElementById('editDown').value || 0;
    v.days = +document.getElementById('editDays').value || 0;
    v.imageUrl = document.getElementById('editImg').value;
    v.imageObj = null;
    
    saveStorage();
    renderInv();
    updatePanel();
    updatePreview();
    closeModal('editModal');
    toast('Saved');
}

function deleteVehicle(i) {
    vehicles.splice(i, 1);
    if (currentIdx >= vehicles.length) currentIdx = Math.max(0, vehicles.length - 1);
    saveStorage();
    renderInv();
    updatePanel();
    updatePreview();
    toast('Deleted');
}

function shuffleVehicles() {
    for (let i = vehicles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vehicles[i], vehicles[j]] = [vehicles[j], vehicles[i]];
    }
    currentIdx = 0;
    saveStorage();
    renderInv();
    updatePanel();
    updatePreview();
    toast('Shuffled');
}

function clearAllVehicles() {
    if (!vehicles.length || !confirm('Delete all?')) return;
    vehicles = [];
    currentIdx = 0;
    saveStorage();
    renderInv();
    updatePanel();
    updatePreview();
    toast('Cleared');
}

// FEED
function loadFeedFile(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    
    feedUploadDate = new Date().toISOString();
    
    const isXL = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
    if (isXL) {
        const r = new FileReader();
        r.onload = e => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                parseCSV(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
                saveFeedToFirebase();
                toast('Feed loaded');
            } catch (err) { toast('Error loading feed'); }
        };
        r.readAsArrayBuffer(f);
    } else {
        const r = new FileReader();
        r.onload = e => {
            try {
                parseCSV(e.target.result);
                saveFeedToFirebase();
                toast('Feed loaded');
            } catch (err) { toast('Error loading feed'); }
        };
        r.readAsText(f);
    }
    ev.target.value = '';
}

function parseCSV(text) {
    const rows = [];
    let row = [], field = '', i = 0, inQ = false;
    
    while (i < text.length) {
        const c = text[i];
        if (inQ) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQ = false; i++; continue;
            }
            field += c; i++;
        } else {
            if (c === '"') { inQ = true; i++; continue; }
            if (c === ',') { row.push(field); field = ''; i++; continue; }
            if (c === '\r') { i++; continue; }
            if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
            field += c; i++;
        }
    }
    row.push(field);
    if (row.length > 1 || row[0].trim()) rows.push(row);
    
    if (rows.length < 2) throw new Error('No data');
    
    const h = rows[0].map(s => (s || '').toLowerCase().trim());
    const idx = n => h.findIndex(x => x === n.toLowerCase());
    const col = {
        vin: idx('vin'), stock: idx('stock #'), type: idx('new/used'),
        year: idx('year'), make: idx('make'), model: idx('model'),
        series: idx('series'), price: idx('price'),
        invDate: idx('inventory date'), photo: idx('photo url list')
    };
    
    feedVehicles = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length < 5) continue;
        
        const stock = (col.stock >= 0 ? r[col.stock] : '').trim();
        const vin = (col.vin >= 0 ? r[col.vin] : '').trim();
        if (!stock && !vin) continue;
        
        const price = parseInt(String(col.price >= 0 ? r[col.price] : '').replace(/[^0-9]/g, '')) || 0;
        const photoList = col.photo >= 0 ? r[col.photo] : '';
        const imageUrl = (photoList || '').split('|')[0].trim();
        const invDate = col.invDate >= 0 ? r[col.invDate] : '';
        const days = calcDays(invDate);
        
        feedVehicles.push({
            id: `${stock || vin}_${i}`, vin, stock,
            type: (col.type >= 0 ? (r[col.type] || '').trim() : ''),
            year: (col.year >= 0 ? r[col.year] : '').trim(),
            make: (col.make >= 0 ? r[col.make] : '').trim(),
            model: (col.model >= 0 ? r[col.model] : '').trim(),
            series: (col.series >= 0 ? (r[col.series] || '').trim() : ''),
            price, days,
            imageUrl: imageUrl && imageUrl !== '.' ? imageUrl : ''
        });
    }
    
    selectedIds = new Set();
    hydrateDropdowns();
    updateFeedInfo();
    renderFeed();
}

function calcDays(s) {
    if (!s) return null;
    const p = String(s).split('/');
    if (p.length !== 3) return null;
    const d = new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]));
    if (isNaN(d)) return null;
    return Math.max(0, Math.floor((Date.now() - d) / 86400000));
}

function hydrateDropdowns() {
    const makes = [...new Set(feedVehicles.map(v => v.make).filter(Boolean))].sort();
    const years = [...new Set(feedVehicles.map(v => v.year).filter(Boolean))].sort((a, b) => b - a);
    
    document.getElementById('feedMake').innerHTML = '<option value="all">All Makes</option>' + makes.map(m => `<option>${m}</option>`).join('');
    document.getElementById('feedModel').innerHTML = '<option value="all">All Models</option>';
    document.getElementById('feedYear').innerHTML = '<option value="all">All Years</option>' + years.map(y => `<option>${y}</option>`).join('');
}

function onMakeChange() {
    const make = document.getElementById('feedMake').value;
    const models = make === 'all'
        ? [...new Set(feedVehicles.map(v => v.model).filter(Boolean))]
        : [...new Set(feedVehicles.filter(v => v.make === make).map(v => v.model).filter(Boolean))];
    models.sort();
    document.getElementById('feedModel').innerHTML = '<option value="all">All Models</option>' + models.map(m => `<option>${m}</option>`).join('');
    renderFeed();
}

function getFilters() {
    return {
        q: (document.getElementById('feedSearch')?.value || '').toLowerCase(),
        type: document.getElementById('feedType')?.value || 'all',
        make: document.getElementById('feedMake')?.value || 'all',
        model: document.getElementById('feedModel')?.value || 'all',
        year: document.getElementById('feedYear')?.value || 'all',
        minDays: +document.getElementById('feedDays')?.value || 0,
        hasImg: document.getElementById('feedHasImg')?.checked
    };
}

function filteredFeed() {
    const f = getFilters();
    return feedVehicles.filter(v => {
        if (f.hasImg && !v.imageUrl) return false;
        if (f.type !== 'all' && (v.type || '').toUpperCase() !== f.type) return false;
        if (f.make !== 'all' && v.make !== f.make) return false;
        if (f.model !== 'all' && v.model !== f.model) return false;
        if (f.year !== 'all' && v.year !== f.year) return false;
        if (!filterDays(v, f.minDays)) return false;
        if (f.q && !`${v.stock} ${v.vin}`.toLowerCase().includes(f.q)) return false;
        return true;
    });
}

function setSort(col) {
    if (feedSort.col === col) feedSort.dir = feedSort.dir === 'asc' ? 'desc' : 'asc';
    else { feedSort.col = col; feedSort.dir = 'asc'; }
    renderFeed();
}

function sortedFeed(list) {
    const dir = feedSort.dir === 'asc' ? 1 : -1;
    const col = feedSort.col;
    return list.slice().sort((a, b) => {
        const va = col === 'price' ? a.price : col === 'days' ? (a.days ?? 999999) : col === 'type' ? a.type : col === 'stock' ? a.stock : `${a.year} ${a.make} ${a.model}`;
        const vb = col === 'price' ? b.price : col === 'days' ? (b.days ?? 999999) : col === 'type' ? b.type : col === 'stock' ? b.stock : `${b.year} ${b.make} ${b.model}`;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
    });
}

function renderFeed() {
    const list = sortedFeed(filteredFeed());
    document.getElementById('feedCount').textContent = `${list.length} of ${feedVehicles.length}`;
    
    if (!list.length) {
        document.getElementById('feedBody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">No vehicles</td></tr>';
        return;
    }
    
    document.getElementById('feedBody').innerHTML = list.map(v => {
        const sel = selectedIds.has(v.id);
        const dc = v.days >= 61 ? 'danger' : v.days >= 46 ? 'warn' : '';
        return `<tr class="${sel ? 'selected' : ''}" onclick="toggleRow('${v.id}')">
            <td><input type="checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation();toggleRow('${v.id}')"></td>
            <td>${v.imageUrl ? `<img class="thumb" src="${v.imageUrl}">` : '<div class="thumb"></div>'}</td>
            <td><div class="v-name">${v.year} ${v.make} ${v.model}</div><div class="v-trim">${v.series}</div></td>
            <td>${v.stock}</td>
            <td>${v.type === 'N' ? 'New' : v.type === 'U' ? 'Used' : v.type}</td>
            <td>$${v.price.toLocaleString()}</td>
            <td><span class="days-badge ${dc}">${v.days ?? '-'}</span></td>
        </tr>`;
    }).join('');
}

function toggleAllFeed(checked) {
    sortedFeed(filteredFeed()).forEach(v => {
        if (checked) selectedIds.add(v.id);
        else selectedIds.delete(v.id);
    });
    renderFeed();
}

function toggleRow(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    renderFeed();
}

function selectAllFeed() {
    sortedFeed(filteredFeed()).forEach(v => selectedIds.add(v.id));
    renderFeed();
    toast('Selected ' + selectedIds.size);
}

function clearFeedSel() {
    selectedIds = new Set();
    document.getElementById('feedCheckAll').checked = false;
    renderFeed();
}

function roundTo9(p) { return Math.ceil(p / 10) * 10 - 1; }

function calcPay(price, rate, term, down) {
    const prin = (price || 0) - (down || 0);
    if (prin <= 0) return 0;
    const mr = (rate || 0) / 100 / 12;
    if (!mr) return roundTo9(prin / (term || 1));
    return roundTo9(prin * (mr * Math.pow(1 + mr, term)) / (Math.pow(1 + mr, term) - 1));
}

function transferToInv() {
    const sel = feedVehicles.filter(v => selectedIds.has(v.id));
    if (!sel.length) return toast('Select vehicles');
    
    const rate = +document.getElementById('globalRate').value || 6.9;
    const term = +document.getElementById('globalTerm').value || 72;
    const down = +document.getElementById('globalDown').value || 3999;
    
    sel.forEach(fv => {
        vehicles.push({
            year: fv.year, make: fv.make, model: fv.model, trim: fv.series,
            stock: fv.stock, price: fv.price,
            payment: calcPay(fv.price, rate, term, down), down,
            days: fv.days ?? 0, imageUrl: fv.imageUrl, imageObj: null,
            overrideBadge: '', overrideHighlight: '', overrideAccentColor: '',
            hidePayment: false
        });
    });
    
    saveStorage();
    selectedIds = new Set();
    renderFeed();
    renderInv();
    updatePanel();
    toast('Added ' + sel.length);
}

// STORAGE
function saveStorage() {
    const data = {
        vehicles: vehicles.map(v => ({ ...v, imageObj: null })),
        logoIdx, slideTheme, visibility, typo, colors
    };
    localStorage.setItem('slideshower2001', JSON.stringify(data));
}

function loadStorage() {
    const s = localStorage.getItem('slideshower2001');
    if (s) {
        try {
            const d = JSON.parse(s);
            vehicles = (d.vehicles || []).map(v => ({ ...v, imageObj: null }));
            logoIdx = d.logoIdx ?? 4;
            slideTheme = d.slideTheme || 'dark';
            if (d.visibility) visibility = { ...visibility, ...d.visibility };
            if (d.typo) typo = { ...typo, ...d.typo };
            if (d.colors) colors = { ...colors, ...d.colors };
        } catch (e) {}
    }
}

// LAYOUTS
async function saveLayout() {
    if (!window.firebaseReady || !currentUser) return toast('Not signed in');
    const name = document.getElementById('layoutName').value.trim();
    if (!name) return toast('Enter name');
    
    try {
        await window.fbHelpers.setDoc(
            window.fbHelpers.doc(window.db, 'users', currentUser.uid, 'layouts', name.toLowerCase().replace(/\s+/g, '-')),
            { name, slideTheme, logoIdx, visibility, typo, colors, createdAt: new Date().toISOString() }
        );
        document.getElementById('layoutName').value = '';
        loadLayouts();
        toast('Layout saved');
    } catch (e) { toast('Failed to save'); }
}

async function loadLayouts() {
    if (!window.firebaseReady || !currentUser) {
        document.getElementById('savedLayouts').textContent = 'Sign in to save layouts';
        return;
    }
    
    try {
        const snap = await window.fbHelpers.getDocs(
            window.fbHelpers.collection(window.db, 'users', currentUser.uid, 'layouts')
        );
        if (snap.empty) {
            document.getElementById('savedLayouts').textContent = 'No layouts saved';
            return;
        }
        document.getElementById('savedLayouts').innerHTML = snap.docs.map(d => {
            const data = d.data();
            return `<div style="padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="loadLayout('${d.id}')">
                <span><strong>${data.name}</strong> <span style="color:var(--text3)">${data.slideTheme}</span></span>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteLayout('${d.id}')">x</button>
            </div>`;
        }).join('');
    } catch (e) {
        document.getElementById('savedLayouts').textContent = 'Error loading';
    }
}

async function loadLayout(id) {
    try {
        const snap = await window.fbHelpers.getDoc(
            window.fbHelpers.doc(window.db, 'users', currentUser.uid, 'layouts', id)
        );
        if (snap.exists()) {
            const d = snap.data();
            slideTheme = d.slideTheme || 'dark';
            logoIdx = d.logoIdx ?? 4;
            if (d.visibility) visibility = { ...visibility, ...d.visibility };
            if (d.typo) typo = { ...typo, ...d.typo };
            if (d.colors) colors = { ...colors, ...d.colors };
            saveStorage();
            loadTypoUI();
            loadColorsUI();
            renderThemes();
            renderLogos();
            updatePreview();
            toast('Layout loaded');
        }
    } catch (e) { toast('Failed to load'); }
}

async function deleteLayout(id) {
    if (!confirm('Delete layout?')) return;
    try {
        await window.fbHelpers.deleteDoc(
            window.fbHelpers.doc(window.db, 'users', currentUser.uid, 'layouts', id)
        );
        loadLayouts();
        toast('Deleted');
    } catch (e) { toast('Failed'); }
}

// IMPORT/EXPORT
function handleImport(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    
    if (f.name.endsWith('.json')) {
        const r = new FileReader();
        r.onload = e => {
            try {
                const d = JSON.parse(e.target.result);
                vehicles = (d.vehicles || []).map(v => ({ ...v, imageObj: null }));
                logoIdx = d.logoIdx ?? 4;
                slideTheme = d.slideTheme || 'dark';
                if (d.visibility) visibility = { ...visibility, ...d.visibility };
                if (d.typo) typo = { ...typo, ...d.typo };
                if (d.colors) colors = { ...colors, ...d.colors };
                saveStorage();
                loadTypoUI();
                loadColorsUI();
                renderInv();
                updatePanel();
                renderThemes();
                renderLogos();
                closeModal('importModal');
                toast('Imported ' + vehicles.length);
            } catch (err) { toast('Error'); }
        };
        r.readAsText(f);
    } else if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')) {
        feedUploadDate = new Date().toISOString();
        if (f.name.endsWith('.csv')) {
            const r = new FileReader();
            r.onload = e => {
                try {
                    parseCSV(e.target.result);
                    saveFeedToFirebase();
                    closeModal('importModal');
                } catch (err) { toast('Error'); }
            };
            r.readAsText(f);
        } else {
            const r = new FileReader();
            r.onload = e => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    parseCSV(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
                    saveFeedToFirebase();
                    closeModal('importModal');
                } catch (err) { toast('Error'); }
            };
            r.readAsArrayBuffer(f);
        }
    }
    ev.target.value = '';
}

function exportProject() {
    const data = {
        version: '2001',
        vehicles: vehicles.map(v => ({ ...v, imageObj: null })),
        logoIdx, slideTheme, visibility, typo, colors
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `slideshow-${Date.now()}.json`;
    a.click();
    toast('Exported');
}

// PREVIEW & VIDEO
function previewSlideshow() {
    if (!vehicles.length) return toast('Add vehicles');
    let idx = 0;
    const show = () => {
        currentIdx = idx;
        updatePanel();
        updatePreview();
        idx = (idx + 1) % vehicles.length;
    };
    show();
    setInterval(show, (+document.getElementById('slideDur')?.value || 8) * 1000);
    toast('Previewing');
}

async function generateVideo() {
    if (!vehicles.length) return toast('Add vehicles');
    
    showModal('progressModal');
    document.getElementById('progressTitle').textContent = 'Generating...';
    document.getElementById('progressText').textContent = 'Loading images...';
    document.getElementById('progressBar').style.width = '5%';
    
    for (let i = 0; i < vehicles.length; i++) {
        await loadImg(vehicles[i]);
        document.getElementById('progressBar').style.width = (5 + (i / vehicles.length) * 35) + '%';
    }
    
    const res = (document.getElementById('videoRes')?.value || '1920x1080').split('x');
    const W = +res[0], H = +res[1];
    const fps = +document.getElementById('fps')?.value || 30;
    const slideDur = +document.getElementById('slideDur')?.value || 8;
    const transDur = +document.getElementById('transDur')?.value || 1;
    const transType = document.getElementById('transType')?.value || 'slideLeft';
    
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(fps);
    const chunks = [];
    
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
        a.download = `slideshow-${Date.now()}.webm`;
        a.click();
        document.getElementById('progressBar').style.width = '100%';
        document.getElementById('progressText').textContent = 'Done!';
        setTimeout(() => { closeModal('progressModal'); toast('Downloaded'); }, 1000);
    };
    
    rec.start(100);
    document.getElementById('recording').classList.add('active');
    
    const fPS = Math.floor(slideDur * fps);
    const fPT = Math.floor(transDur * fps);
    const total = vehicles.length * (fPS + fPT);
    let frame = 0;
    
    for (let i = 0; i < vehicles.length; i++) {
        const curr = vehicles[i];
        const next = vehicles[(i + 1) % vehicles.length];
        
        for (let f = 0; f < fPS; f++) {
            drawSlide(ctx, curr, W, H, 1, i);
            await new Promise(r => setTimeout(r, 1000 / fps));
            frame++;
            if (f % 5 === 0) {
                document.getElementById('progressBar').style.width = (40 + frame / total * 55) + '%';
                document.getElementById('progressText').textContent = 'Slide ' + (i + 1) + '/' + vehicles.length;
            }
        }
        
        for (let f = 0; f < fPT; f++) {
            const t = f / fPT;
            ctx.clearRect(0, 0, W, H);
            if (transType === 'slideLeft') {
                ctx.save();
                ctx.translate(-W * t, 0);
                drawSlide(ctx, curr, W, H, 1, i);
                ctx.translate(W, 0);
                drawSlide(ctx, next, W, H, 1, i + 1);
                ctx.restore();
            } else if (transType === 'fade') {
                drawSlide(ctx, curr, W, H, 1 - t, i);
                drawSlide(ctx, next, W, H, t, i + 1);
            } else {
                drawSlide(ctx, next, W, H, 1, i + 1);
            }
            await new Promise(r => setTimeout(r, 1000 / fps));
            frame++;
        }
    }
    
    document.getElementById('recording').classList.remove('active');
    rec.stop();
}

function downloadSlide() {
    const canvas = document.getElementById('mainCanvas');
    const v = vehicles[currentIdx];
    const a = document.createElement('a');
    a.download = v ? `${v.year}-${v.make}-${v.model}.png` : 'slide.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('Exported');
}

// UI HELPERS
function showModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }

function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Initialize visibility toggles on page load (after auth)
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.key === 'Escape') closeAllModals();
        if (e.key === 'ArrowLeft') prevVehicle();
        if (e.key === 'ArrowRight') nextVehicle();
    });
});
