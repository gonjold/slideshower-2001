// app.js - Slideshower 2001 Application Logic

// State
let slideTheme = 'dark';
let logoIdx = 4;
let logoImg = null;
let zoom = 0.5;
let vehicles = [];
let currentIdx = 0;
let feedVehicles = [];
let selectedIds = new Set();
let feedSort = { col: 'days', dir: 'asc' };

let visibility = {
    showBadge: true,
    showStock: true,
    showYear: true,
    showTrim: true,
    showPriceLabel: true,
    showHighlight: true,
    showPayment: true,
    showDown: false,
    showDisclaimer: true
};

let typo = {
    yearFont: 'Barlow Condensed', yearSize: 30, yearGap: 5,
    makeFont: 'Bebas Neue', makeSize: 66, makeGap: -15,
    modelFont: 'Bebas Neue', modelSize: 66, modelGap: -15,
    trimFont: 'DM Sans', trimSize: 26, trimGap: 50,
    priceFont: 'Bebas Neue', priceSize: 70, priceGap: 30,
    hlFont: 'Barlow Condensed', hlSize: 44, hlPad: 14,
    payFont: 'Bebas Neue', paySize: 60, payPad: 25,
    marginOuter: 80, cardPad: 24, infoOffset: 50, headerTop: 50
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStorage();
    loadTypoUI();
    renderThemes();
    renderLogos();
    renderFeed();
    renderInv();
    updatePanel();
    
    document.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.key === 'Escape') closeAllModals();
        if (e.key === 'ArrowLeft') prevVehicle();
        if (e.key === 'ArrowRight') nextVehicle();
    });
    
    // Load Firebase layouts
    setTimeout(loadLayouts, 500);
});

// Typography UI
function loadTypoUI() {
    const fonts = FONTS.display;
    const bodyFonts = FONTS.body;
    
    // Populate font dropdowns with Toyota Type included
    ['yearFont', 'makeFont', 'modelFont', 'priceFont', 'hlFont', 'payFont'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = fonts.map(f => `<option value="${f}">${f}</option>`).join('');
        }
    });
    
    ['trimFont'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = bodyFonts.map(f => `<option value="${f}">${f}</option>`).join('');
        }
    });
    
    // Set values
    document.getElementById('yearFont').value = typo.yearFont;
    document.getElementById('yearSize').value = typo.yearSize;
    document.getElementById('yearGap').value = typo.yearGap;
    document.getElementById('makeFont').value = typo.makeFont;
    document.getElementById('makeSize').value = typo.makeSize;
    document.getElementById('makeGap').value = typo.makeGap;
    document.getElementById('modelFont').value = typo.modelFont;
    document.getElementById('modelSize').value = typo.modelSize;
    document.getElementById('modelGap').value = typo.modelGap;
    document.getElementById('trimFont').value = typo.trimFont;
    document.getElementById('trimSize').value = typo.trimSize;
    document.getElementById('trimGap').value = typo.trimGap;
    document.getElementById('priceFont').value = typo.priceFont;
    document.getElementById('priceSize').value = typo.priceSize;
    document.getElementById('priceGap').value = typo.priceGap;
    document.getElementById('hlFont').value = typo.hlFont;
    document.getElementById('hlSize').value = typo.hlSize;
    document.getElementById('hlPad').value = typo.hlPad;
    document.getElementById('payFont').value = typo.payFont;
    document.getElementById('paySize').value = typo.paySize;
    document.getElementById('payPad').value = typo.payPad;
    document.getElementById('marginOuter').value = typo.marginOuter;
    document.getElementById('cardPad').value = typo.cardPad;
    document.getElementById('infoOffset').value = typo.infoOffset;
    document.getElementById('headerTop').value = typo.headerTop;
    updateSliderVals();
}

function saveTypo() {
    typo.yearFont = document.getElementById('yearFont').value;
    typo.yearSize = +document.getElementById('yearSize').value;
    typo.yearGap = +document.getElementById('yearGap').value;
    typo.makeFont = document.getElementById('makeFont').value;
    typo.makeSize = +document.getElementById('makeSize').value;
    typo.makeGap = +document.getElementById('makeGap').value;
    typo.modelFont = document.getElementById('modelFont').value;
    typo.modelSize = +document.getElementById('modelSize').value;
    typo.modelGap = +document.getElementById('modelGap').value;
    typo.trimFont = document.getElementById('trimFont').value;
    typo.trimSize = +document.getElementById('trimSize').value;
    typo.trimGap = +document.getElementById('trimGap').value;
    typo.priceFont = document.getElementById('priceFont').value;
    typo.priceSize = +document.getElementById('priceSize').value;
    typo.priceGap = +document.getElementById('priceGap').value;
    typo.hlFont = document.getElementById('hlFont').value;
    typo.hlSize = +document.getElementById('hlSize').value;
    typo.hlPad = +document.getElementById('hlPad').value;
    typo.payFont = document.getElementById('payFont').value;
    typo.paySize = +document.getElementById('paySize').value;
    typo.payPad = +document.getElementById('payPad').value;
    typo.marginOuter = +document.getElementById('marginOuter').value;
    typo.cardPad = +document.getElementById('cardPad').value;
    typo.infoOffset = +document.getElementById('infoOffset').value;
    typo.headerTop = +document.getElementById('headerTop').value;
    updateSliderVals();
    saveStorage();
}

function updateSliderVals() {
    document.getElementById('marginOuterVal').textContent = typo.marginOuter;
    document.getElementById('cardPadVal').textContent = typo.cardPad;
    document.getElementById('infoOffsetVal').textContent = typo.infoOffset;
    document.getElementById('headerTopVal').textContent = typo.headerTop;
}

// View Switching
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
    if (v === 'inventory') renderInv();
}

// Themes
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

// Logos
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

// Canvas - FIXED viewport calculation using transform scale
function initCanvas() {
    const container = document.getElementById('canvasArea');
    const wrap = document.getElementById('canvasWrap');
    const canvas = document.getElementById('mainCanvas');
    if (!container || !wrap || !canvas) return;
    
    const rect = container.getBoundingClientRect();
    const availW = rect.width - 40; // padding
    const availH = rect.height - 40;
    
    // Calculate zoom to fit while maintaining 16:9 aspect ratio
    const scaleW = availW / 1920;
    const scaleH = availH / 1080;
    zoom = Math.min(scaleW, scaleH, 1);
    zoom = Math.max(0.25, zoom); // minimum zoom
    
    // Set wrapper size to scaled dimensions
    const displayW = Math.floor(1920 * zoom);
    const displayH = Math.floor(1080 * zoom);
    wrap.style.width = displayW + 'px';
    wrap.style.height = displayH + 'px';
    
    // Canvas stays at full resolution but CSS scales it
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
}

function zoomIn() { zoom = Math.min(1, zoom + 0.1); updateZoom(); }
function zoomOut() { zoom = Math.max(0.2, zoom - 0.1); updateZoom(); }
function zoomFit() { initCanvas(); }

function updateZoom() {
    const wrap = document.getElementById('canvasWrap');
    const canvas = document.getElementById('mainCanvas');
    const displayW = Math.floor(1920 * zoom);
    const displayH = Math.floor(1080 * zoom);
    wrap.style.width = displayW + 'px';
    wrap.style.height = displayH + 'px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
}

// Preview
let updateTO;
function updatePreview() {
    clearTimeout(updateTO);
    updateTO = setTimeout(() => {
        const ctx = document.getElementById('mainCanvas').getContext('2d');
        const v = vehicles[currentIdx] || {
            year: '2025', make: 'Toyota', model: 'Camry', trim: 'XSE',
            stock: 'T12345', price: 34999, payment: 499, down: 3999,
            days: 0, imageUrl: '', imageObj: null
        };
        loadImg(v).then(() => drawSlide(ctx, v, 1920, 1080, 1, currentIdx));
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

// Rounded rectangle helper
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

// Draw Slide
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
    const accent = v.overrideAccentColor || null;
    const badgeTxt = v.overrideBadge || S.badge;
    const hlTxt = v.overrideHighlight || S.highlight;
    const showPay = visibility.showPayment && !v.hidePayment && v.payment > 0;
    
    const badgeBg = accent || T.badge.bg;
    const hlBg = accent || T.hl.bg;
    const payBg = accent || T.payBox.bg;
    const yearC = accent || T.year;
    const lineC = accent || T.line;
    
    let imgR = S.imgPos === 'right';
    if (S.imgPos === 'alternate') imgR = idx % 2 === 1;
    const badgeL = S.badgePos === 'top-left';
    
    ctx.globalAlpha = opacity;
    
    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, T.bg[0]);
    bg.addColorStop(1, T.bg[1]);
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
        ctx.font = '700 22px "Montserrat", sans-serif';
        const bW = ctx.measureText(badgeTxt).width + 36;
        const bH = 44;
        const bX = badgeL ? M : W - M - bW;
        const bY = M - 8;
        ctx.fillStyle = badgeBg;
        rr(ctx, bX, bY, bW, bH, 4);
        ctx.fill();
        ctx.fillStyle = T.badge.text;
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
    
    ctx.fillStyle = T.card;
    rr(ctx, cX, cY, cW, cH, 16);
    ctx.fill();
    
    if (S.cardStyle === 'border') {
        ctx.strokeStyle = accent || T.line;
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
        ctx.fillStyle = T.textSub;
        ctx.textBaseline = 'middle';
        ctx.fillText(sTxt, infoX + infoW - sW + 10, Y + sH / 2);
        ctx.textBaseline = 'alphabetic';
    }
    Y += 55;
    
    // Year
    if (visibility.showYear) {
        ctx.font = `700 ${TY.yearSize}px "${TY.yearFont}", sans-serif`;
        ctx.fillStyle = yearC;
        ctx.fillText(v.year, infoX, Y);
        Y += TY.yearSize + TY.yearGap;
    }
    
    // Make
    let fs = TY.makeSize;
    ctx.font = `400 ${fs}px "${TY.makeFont}", sans-serif`;
    while (ctx.measureText(v.make.toUpperCase()).width > infoW - 20 && fs > 30) {
        fs -= 2;
        ctx.font = `400 ${fs}px "${TY.makeFont}", sans-serif`;
    }
    ctx.fillStyle = T.text;
    ctx.fillText(v.make.toUpperCase(), infoX, Y);
    Y += fs + TY.makeGap;
    
    // Model
    fs = TY.modelSize;
    ctx.font = `400 ${fs}px "${TY.modelFont}", sans-serif`;
    while (ctx.measureText(v.model.toUpperCase()).width > infoW - 20 && fs > 30) {
        fs -= 2;
        ctx.font = `400 ${fs}px "${TY.modelFont}", sans-serif`;
    }
    ctx.fillText(v.model.toUpperCase(), infoX, Y);
    Y += fs + TY.modelGap;
    
    // Trim
    if (visibility.showTrim) {
        ctx.font = `600 ${TY.trimSize}px "${TY.trimFont}", sans-serif`;
        ctx.fillStyle = T.trim;
        ctx.fillText(v.trim.toUpperCase(), infoX, Y);
        Y += TY.trimGap;
    } else {
        Y += 15;
    }
    
    // Price label
    if (visibility.showPriceLabel) {
        ctx.font = '600 18px "DM Sans", sans-serif';
        ctx.fillStyle = T.priceLabel;
        ctx.fillText(S.priceLabel.toUpperCase(), infoX, Y);
        Y += 28;
    }
    
    // Price
    ctx.font = `400 ${TY.priceSize}px "${TY.priceFont}", sans-serif`;
    ctx.fillStyle = T.price;
    const pTxt = '$' + v.price.toLocaleString();
    const pW = ctx.measureText(pTxt).width;
    ctx.fillText(pTxt, infoX, Y + TY.priceSize * 0.75);
    
    // Highlight
    if (visibility.showHighlight) {
        ctx.font = `700 ${TY.hlSize}px "${TY.hlFont}", sans-serif`;
        const hlW = ctx.measureText(hlTxt).width + TY.hlPad * 2;
        const hlH = TY.hlSize + 16;
        const hlX = infoX + pW + 24;
        const hlY = Y + (TY.priceSize * 0.75) / 2 - hlH / 2 + 10;
        ctx.fillStyle = hlBg;
        rr(ctx, hlX, hlY, hlW, hlH, 4);
        ctx.fill();
        ctx.fillStyle = T.hl.text;
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
        ctx.fillStyle = accent || T.payLabel;
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
        ctx.font = `400 ${TY.paySize}px "${TY.payFont}", sans-serif`;
        const payW = ctx.measureText(payTxt).width;
        const boxW = payW + TY.payPad * 2;
        const boxH = TY.paySize + 26;
        
        ctx.fillStyle = payBg;
        rr(ctx, infoX, Y, boxW, boxH, 8);
        ctx.fill();
        ctx.fillStyle = T.payBox.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(payTxt, infoX + boxW / 2, Y + boxH / 2 + 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        if (visibility.showDown && v.down > 0) {
            ctx.font = '500 16px "DM Sans", sans-serif';
            ctx.fillStyle = T.textSub;
            ctx.fillText('with $' + v.down.toLocaleString() + ' down', infoX, Y + boxH + 24);
        }
    }
    
    // Disclaimer
    if (visibility.showDisclaimer && S.disc) {
        ctx.font = '400 18px "Inter", sans-serif';
        ctx.fillStyle = T.disc;
        ctx.textAlign = 'center';
        ctx.fillText(S.disc, W / 2, H - M + 24);
        ctx.textAlign = 'left';
    }
    
    ctx.globalAlpha = 1;
}

// Visibility Toggle
function toggleVis(el) {
    const k = el.id;
    visibility[k] = !visibility[k];
    el.classList.toggle('active', visibility[k]);
    saveStorage();
    updatePreview();
}

// Panel Update
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

// Navigation
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

// Days Filter - now accepts any number
function filterDays(v, minDays) {
    if (!minDays || minDays === '' || minDays === 0) return true;
    const d = v.days ?? 0;
    return d >= minDays;
}

// Inventory
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

// Feed
function loadFeedFile(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    
    const isXL = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
    if (isXL) {
        const r = new FileReader();
        r.onload = e => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                parseCSV(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
                toast('Loaded');
            } catch (err) { toast('Error'); }
        };
        r.readAsArrayBuffer(f);
    } else {
        const r = new FileReader();
        r.onload = e => {
            try {
                parseCSV(e.target.result);
                toast('Loaded');
            } catch (err) { toast('Error'); }
        };
        r.readAsText(f);
    }
    ev.target.value = '';
}

async function loadFeedUrl() {
    const url = document.getElementById('feedUrl').value.trim();
    if (!url) return toast('Enter URL');
    
    let fetchUrl = url;
    if (url.includes('docs.google.com/spreadsheets')) {
        const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (m) fetchUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
    }
    
    try {
        let res = await fetch(fetchUrl);
        if (!res.ok) res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`);
        if (res.ok) {
            parseCSV(await res.text());
            toast('Loaded');
        } else toast('Failed');
    } catch (e) { toast('Failed'); }
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

// Storage
function saveStorage() {
    const data = {
        vehicles: vehicles.map(v => ({ ...v, imageObj: null })),
        logoIdx, slideTheme, visibility, typo
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
        } catch (e) {}
    }
}

// Firebase Layouts
async function saveLayout() {
    if (!window.firebaseReady) return toast('Firebase not ready');
    const name = document.getElementById('layoutName').value.trim();
    if (!name) return toast('Enter name');
    
    try {
        await window.fbHelpers.setDoc(
            window.fbHelpers.doc(window.db, 'layouts', name.toLowerCase().replace(/\s+/g, '-')),
            { name, slideTheme, logoIdx, visibility, typo, createdAt: new Date().toISOString() }
        );
        document.getElementById('layoutName').value = '';
        loadLayouts();
        toast('Saved');
    } catch (e) { toast('Failed'); }
}

async function loadLayouts() {
    if (!window.firebaseReady) {
        document.getElementById('savedLayouts').textContent = 'Connecting...';
        return;
    }
    
    try {
        const snap = await window.fbHelpers.getDocs(window.fbHelpers.collection(window.db, 'layouts'));
        if (snap.empty) {
            document.getElementById('savedLayouts').textContent = 'No layouts';
            return;
        }
        document.getElementById('savedLayouts').innerHTML = snap.docs.map(d => {
            const data = d.data();
            return `<div style="padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:4px;cursor:pointer" onclick="loadLayout('${d.id}')">
                <strong>${data.name}</strong> <span style="color:var(--text3)">${data.slideTheme}</span>
            </div>`;
        }).join('');
    } catch (e) {
        document.getElementById('savedLayouts').textContent = 'Error loading';
    }
}

async function loadLayout(id) {
    try {
        const snap = await window.fbHelpers.getDoc(window.fbHelpers.doc(window.db, 'layouts', id));
        if (snap.exists()) {
            const d = snap.data();
            slideTheme = d.slideTheme || 'dark';
            logoIdx = d.logoIdx ?? 4;
            if (d.visibility) visibility = { ...visibility, ...d.visibility };
            if (d.typo) typo = { ...typo, ...d.typo };
            saveStorage();
            loadTypoUI();
            renderThemes();
            renderLogos();
            updatePreview();
            toast('Loaded');
        }
    } catch (e) { toast('Failed'); }
}

// Import/Export
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
                saveStorage();
                loadTypoUI();
                renderInv();
                updatePanel();
                renderThemes();
                renderLogos();
                closeModal('importModal');
                toast('Imported ' + vehicles.length);
            } catch (err) { toast('Error'); }
        };
        r.readAsText(f);
    } else if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        const r = new FileReader();
        r.onload = e => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                parseCSV(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
                closeModal('importModal');
            } catch (err) { toast('Error'); }
        };
        r.readAsArrayBuffer(f);
    } else {
        const r = new FileReader();
        r.onload = e => {
            try {
                parseCSV(e.target.result);
                closeModal('importModal');
            } catch (err) { toast('Error'); }
        };
        r.readAsText(f);
    }
    ev.target.value = '';
}

function exportProject() {
    const data = {
        version: '2001',
        vehicles: vehicles.map(v => ({ ...v, imageObj: null })),
        logoIdx, slideTheme, visibility, typo
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `slideshow-${Date.now()}.json`;
    a.click();
    toast('Exported');
}

// Preview & Video
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

// UI Helpers
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
