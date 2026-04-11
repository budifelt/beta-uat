/* ===== DOM refs ===== */
const btn = document.getElementById('checkBtn');
const input = document.getElementById('urlInput');
const result = document.getElementById('result');
const modeDirect = document.getElementById('mode-direct');
const modeProxy  = document.getElementById('mode-proxy');

const historyList = document.getElementById('historyList');
const clearListBtn = document.getElementById('clearList');
const recheckAllBtn = document.getElementById('recheckAll');
const exportCsvBtn = document.getElementById('exportCsv');
const filterInput = document.getElementById('filterInput');
const countIndicator = document.getElementById('countIndicator');

/* New UI Elements */
const liveCount = document.getElementById('liveCount');
const errorCount = document.getElementById('errorCount');
const totalCount = document.getElementById('totalCount');
const emptyState = document.getElementById('emptyState');
const autoCheckIndicator = document.getElementById('autoCheckIndicator');

/* ===== Enhanced Visual Feedback Elements ===== */
let notificationContainer = null;
let progressOverlay = null;
let previewTooltip = null;
let rippleElements = [];

/* Initialize Notification Container */
function initNotificationContainer() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(notificationContainer);
  }
}

/* Enhanced Notification System */
function showNotification(message, type = 'info', duration = 3000) {
  initNotificationContainer();
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    background: ${type === 'success' ? 'var(--link-checker-success)' : 
                  type === 'error' ? 'var(--link-checker-error)' : 
                  type === 'warning' ? 'var(--link-checker-warning)' : 
                  'var(--link-checker-primary)'};
    color: white;
    padding: 12px 20px;
    border-radius: 0;
    box-shadow: var(--link-checker-shadow-lg);
    font-weight: 500;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 400px;
    pointer-events: all;
    cursor: pointer;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  const icon = type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-xmark-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 
                'fa-info-circle';
  
  notification.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  
  notificationContainer.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  });
  
  // Click to dismiss
  notification.addEventListener('click', () => {
    removeNotification(notification);
  });
  
  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => removeNotification(notification), duration);
  }
  
  return notification;
}

function removeNotification(notification) {
  notification.style.transform = 'translateX(100%)';
  notification.style.opacity = '0';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

/* ===== Performance Optimization ===== */
const cache = new Map();
const debounceTimers = new Map();
const LINK_CHECKER_DEBOUNCE_DELAY = 300;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/* ===== state + storage ===== */
const LS_KEY = 'linkChecker.history.v1';
let historyData = []; // {id,url,title,status,code,ts,mode}

function saveLS(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(historyData)); }catch{} }
function loadLS(){ try{ historyData = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch{ historyData = []; } }

/* ===== helpers ===== */
function setStatus(state, msg){
  result.className = 'status ' + state;
  const icons = {wait:'circle-question', live:'circle-check', err:'circle-xmark'};
  result.innerHTML = `<i class="fa-solid fa-${icons[state]}"></i> ${msg}`;
}
function normalizeURL(u){
  let url = (u || '').trim();
  if(!url) return '';
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}
function toProxy(u){ return 'https://r.jina.ai/' + u; }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function decodeEntities(s){ const t=document.createElement('textarea'); t.innerHTML=s; return t.value; }

/* ===== Visual Feedback Functions ===== */
function addLoadingState(element) {
  element.classList.add('loading');
  element.disabled = true;
}

function removeLoadingState(element) {
  element.classList.remove('loading');
  element.disabled = false;
}

/* ===== Ripple Effect ===== */
function createRipple(event) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0;
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
  `;
  
  button.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/* Add ripple to all buttons */
function initRippleEffects() {
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', createRipple);
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
  });
}

/* Add CSS for ripple animation */
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

/* ===== Enhanced Progress Overlay ===== */
function createProgressOverlay(current, total) {
  if (!progressOverlay) {
    progressOverlay = document.createElement('div');
    progressOverlay.className = 'progress-overlay';
    progressOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 32px;
      border-radius: 0;
      box-shadow: var(--link-checker-shadow-lg);
      min-width: 300px;
      text-align: center;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;
    
    content.innerHTML = `
      <div class="progress-text" style="
        font-size: 14px;
        font-weight: 600;
        color: #1A1A1A;
        margin-bottom: 8px;
      ">Checking links...</div>
      <div class="progress-bar-container" style="
        width: 100%;
        height: 4px;
        background: #E5E7EB;
        border-radius: 0;
        overflow: hidden;
      ">
        <div class="progress-bar-fill" style="
          height: 100%;
          background: linear-gradient(90deg, #F18C8E 0%, #E53935 100%);
          border-radius: 0;
          transition: width 0.3s ease;
        "></div>
      </div>
      <div class="progress-count" style="
        font-size: 13px;
        font-weight: 500;
        color: #666;
        margin-top: 8px;
      ">0 / 0</div>
      <div class="progress-percentage" style="
        font-size: 12px;
        font-weight: 600;
        color: #E53935;
        margin-top: 4px;
      ">0%</div>
      <button class="btn btn-danger" style="
        margin-top: 20px;
        width: 100%;
      " onclick="cancelBulkCheck()">
        <i class="fa-solid fa-xmark"></i> Cancel
      </button>
    `;
    
    progressOverlay.appendChild(content);
    document.body.appendChild(progressOverlay);
  }
  
  progressOverlay.style.opacity = '1';
  progressOverlay.style.visibility = 'visible';
  progressOverlay.querySelector('.progress-bar-fill').style.width = `${(current / total) * 100}%`;
  progressOverlay.querySelector('.progress-count').textContent = `${current} / ${total}`;
  progressOverlay.querySelector('.progress-percentage').textContent = `${Math.round((current / total) * 100)}%`;
  progressOverlay.querySelector('div > div').style.transform = 'scale(1)';
}

function hideProgressOverlay() {
  if (progressOverlay) {
    progressOverlay.querySelector('div > div').style.transform = 'scale(0.9)';
    progressOverlay.style.opacity = '0';
    progressOverlay.style.visibility = 'hidden';
  }
}

let bulkCheckCancelled = false;
function cancelBulkCheck() {
  bulkCheckCancelled = true;
  hideProgressOverlay();
  showNotification('Bulk check cancelled', 'error');
}

/* ===== Link Preview Feature ===== */
function createPreviewTooltip() {
  if (!previewTooltip) {
    previewTooltip = document.createElement('div');
    previewTooltip.className = 'link-preview-tooltip';
    previewTooltip.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #FCA5A5;
      border-radius: 0;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 300px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    document.body.appendChild(previewTooltip);
  }
  return previewTooltip;
}

function showLinkPreview(url, element) {
  const tooltip = createPreviewTooltip();
  const rect = element.getBoundingClientRect();
  
  // Check cache first
  const cacheKey = `preview:${url}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    updatePreviewContent(tooltip, cached.data);
    positionTooltip(tooltip, rect);
    return;
  }
  
  // Show loading state
  tooltip.innerHTML = `
    <div style="color: #F18C8E; font-weight: 600;">
      <i class="fa-solid fa-spinner fa-spin"></i> Loading preview...
    </div>
  `;
  positionTooltip(tooltip, rect);
  tooltip.style.opacity = '1';
  
  // Fetch preview data
  fetchPreviewData(url).then(data => {
    cache.set(cacheKey, { data, timestamp: Date.now() });
    updatePreviewContent(tooltip, data);
  }).catch(() => {
    tooltip.innerHTML = `
      <div style="color: #EF4444; font-weight: 600;">
        <i class="fa-solid fa-xmark"></i> Preview unavailable
      </div>
    `;
  });
}

async function fetchPreviewData(url) {
  try {
    const proxyUrl = toProxy(url);
    const response = await fetch(proxyUrl, { method: 'GET' });
    const text = await response.text();
    
    const title = parseTitleFromText(text) || 'No title';
    const description = extractDescription(text) || 'No description';
    const favicon = extractFavicon(text, url);
    
    return { title, description, favicon, url };
  } catch {
    return { title: 'Error', description: 'Could not fetch preview', favicon: '', url };
  }
}

function extractDescription(text) {
  // Try og:description
  const ogDesc = text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogDesc && ogDesc[1]) return decodeEntities(ogDesc[1]).trim();
  
  // Try meta description
  const metaDesc = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (metaDesc && metaDesc[1]) return decodeEntities(metaDesc[1]).trim();
  
  // First paragraph after title
  const firstP = text.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (firstP && firstP[1]) {
    const clean = decodeEntities(firstP[1].replace(/<[^>]+>/g, '')).trim();
    if (clean.length <= 200) return clean;
  }
  
  return null;
}

function extractFavicon(text, baseUrl) {
  const faviconMatch = text.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  if (faviconMatch && faviconMatch[1]) {
    try {
      return new URL(faviconMatch[1], baseUrl).href;
    } catch {}
  }
  return `https://www.google.com/s2/favicons?domain=${new URL(baseUrl).hostname}&sz=32`;
}

function updatePreviewContent(tooltip, data) {
  tooltip.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      ${data.favicon ? `<img src="${data.favicon}" style="width: 24px; height: 24px; flex-shrink: 0;" onerror="this.style.display='none'">` : ''}
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: #1F2937; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.title}</div>
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${new URL(data.url).hostname}</div>
        <div style="font-size: 13px; color: #4B5563; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${data.description}</div>
      </div>
    </div>
  `;
}

function positionTooltip(tooltip, rect) {
  const tooltipRect = tooltip.getBoundingClientRect();
  let top = rect.bottom + 10;
  let left = rect.left;
  
  // Adjust if tooltip goes off screen
  if (top + tooltipRect.height > window.innerHeight) {
    top = rect.top - tooltipRect.height - 10;
  }
  if (left + tooltipRect.width > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  if (left < 10) left = 10;
  
  tooltip.style.top = `${top + window.scrollY}px`;
  tooltip.style.left = `${left + window.scrollX}px`;
  tooltip.style.opacity = '1';
}

function hideLinkPreview() {
  if (previewTooltip) {
    previewTooltip.style.opacity = '0';
    setTimeout(() => {
      if (previewTooltip && previewTooltip.style.opacity === '0') {
        previewTooltip.style.display = 'none';
      }
    }, 200);
  }
}

/* ===== Debounced Functions ===== */
function debounce(func, delay, key) {
  return (...args) => {
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key));
    }
    const timer = setTimeout(() => {
      func(...args);
      debounceTimers.delete(key);
    }, delay);
    debounceTimers.set(key, timer);
  };
}

/* ===== Cached Check Function ===== */
async function checkOnceCached(url, mode, onUpdate) {
  const cacheKey = `check:${url}:${mode}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    if (onUpdate) onUpdate(cached.result.ok ? 'live' : 'err', cached.result.status);
    return cached.result;
  }
  
  const result = await checkOnce(url, mode, onUpdate);
  cache.set(cacheKey, { result, timestamp: Date.now() });
  
  return result;
}

/* ===== title sanitize: hapus prefix "Title:" dkk ===== */
function cleanTitle(s){
  if(!s) return s;
  let t = s.trim();
  t = t.replace(/^\s*title\s*[:\-–]\s*/i, ''); // remove leading "Title: "
  return t.trim();
}

/* ===== content parsers ===== */
function parseTitleFromText(text){
  // <title>
  const mTitle = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (mTitle && mTitle[1]) return cleanTitle(decodeEntities(mTitle[1]).replace(/\s+/g,' ').trim());
  // og:title
  const mOg = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (mOg && mOg[1]) return cleanTitle(decodeEntities(mOg[1]).replace(/\s+/g,' ').trim());
  // Markdown H1
  const mdH1 = text.match(/^\s*#\s+(.+)\s*$/m);
  if (mdH1 && mdH1[1]) return cleanTitle(mdH1[1].replace(/\s+/g,' ').trim());
  // first meaningful short line
  const firstLine = (text.split(/\r?\n/).map(s=>s.trim()).find(s => s && s.length<=120)) || '';
  if (firstLine) return cleanTitle(firstLine);
  return '';
}

/* Heuristik deteksi error dari isi halaman (Proxy mode) */
function inferStatusFromText(text){
  const looksHtml = /<!doctype html|<html[\s>]/i.test(text);
  const title = parseTitleFromText(text) || '';
  const hay = `${title}\n${text}`.toLowerCase();

  const ERR_PATTERNS = [
    /\b(404|403|401|500|502|503|504)\b/g,
    /page\s+not\s+found/gi,
    /not\s+found/gi,
    /cannot\s+(be\s+)?found/gi,
    /forbidden/gi,
    /access\s+denied/gi,
    /unauthorized/gi,
    /doesn[’']?t\s+exist/gi,
    /bad\s+request/gi,
    /service\s+unavailable/gi,
    /maintenance/gi
  ];

  const titleErr = /\b(404|403|401|500|502|503|504)\b/.test(title.toLowerCase()) ||
                   /(not\s+found|forbidden|access\s+denied)/i.test(title);

  let matched = '';
  if (titleErr) matched = 'title-error';
  else {
    for (const re of ERR_PATTERNS){
      if (re.test(hay)){ matched = re.toString(); break; }
    }
  }

  if (matched) return { ok:false, code:'PROXY_ERR', reason:matched, title };
  if (looksHtml || title) return { ok:true, code:200, reason:'HTML_OK', title };
  if (text && text.length > 200) return { ok:true, code:200, reason:'TEXT_OK', title };
  return { ok:false, code:'PROXY_EMPTY', reason:'empty', title };
}

/* ===== Title fetch (via proxy) ===== */
async function fetchTitle(url){
  try{
    const res = await fetch(toProxy(url), { method:'GET' });
    if(!res.ok) throw new Error('proxy '+res.status);
    const text = await res.text();
    const title = parseTitleFromText(text);
    if (title) return title;
  }catch{}
  try{ return new URL(url).hostname; }catch{ return url; }
}

/* ===== history UI ===== */
function makeItemEl(rec){
  const li = document.createElement('li');
  li.className = 'history-item';
  li.dataset.id = rec.id;
  li.dataset.url = rec.url;

  const main = document.createElement('div');
  main.className = 'item-main copyable';
  main.setAttribute('data-tip', 'Click to copy URL');
  const titleEl = document.createElement('div');
  titleEl.className = 'history-title-text';
  titleEl.textContent = rec.title || 'Loading title…';
  const urlEl = document.createElement('div');
  urlEl.className = 'history-url';
  urlEl.textContent = rec.url;
  main.append(titleEl, urlEl);

  const badge = document.createElement('span');
  badge.className = 'badge ' + (
    rec.status==='live' ? 'badge-live' :
    rec.status==='err'  ? 'badge-err'  : 'badge-wait'
  );
  badge.innerHTML = (rec.status==='live'?'<i class="fa-solid fa-check"></i> ':'<i class="fa-solid fa-xmark"></i> ') + (rec.status ? rec.status.toUpperCase() : 'WAIT') +
                      (rec.code ? ` (${rec.code})` : '');

  const open = document.createElement('a');
  open.className = 'btn';
  open.href = rec.url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.title = 'Buka di tab baru';
  open.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Open`;

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.innerHTML = `
    <button class="btn recheck" title="Re-check"><i class="fa-solid fa-rotate"></i></button>
    <button class="btn remove"  title="Hapus"><i class="fa-solid fa-xmark"></i></button>
  `;

  li.append(main, badge, open, actions);
  return li;
}

function renderAll(){
  historyList.innerHTML = '';
  const q = (filterInput && filterInput.value || '').toLowerCase().trim();
  let visible = 0;
  let live = 0;
  let error = 0;
  
  // Show/hide empty state
  if (historyData.length === 0) {
    if (emptyState) emptyState.removeAttribute('hidden');
    historyList.style.display = 'none';
  } else {
    if (emptyState) emptyState.setAttribute('hidden', '');
    historyList.style.display = '';
  }
  
  for(const rec of historyData.slice().reverse()){
    const hay = `${rec.title} ${rec.url} ${rec.status} ${rec.code}`.toLowerCase();
    if(q && !hay.includes(q)) continue;
    historyList.append(makeItemEl(rec));
    visible++;
    
    // Count stats
    if(rec.status === 'live') live++;
    if(rec.status === 'err') error++;
  }
  
  // Update counters
  if (countIndicator) countIndicator.textContent = `${visible} / ${historyData.length} items`;
  if (liveCount) liveCount.textContent = live;
  if (errorCount) errorCount.textContent = error;
  if (totalCount) totalCount.textContent = historyData.length;
  
  reevaluateAuto();
}

function upsertRecord(rec){
  const idx = historyData.findIndex(r => r.id === rec.id);
  if(idx >= 0) historyData[idx] = rec; else historyData.push(rec);
  saveLS(); renderAll();
}

function updateBadge(id, state, code){
  const rec = historyData.find(r=>r.id===id);
  if(!rec) return;
  rec.status = state;
  rec.code = code || rec.code;
  rec.ts = Date.now();

  // kalau ERR dan title tidak bermakna → set pesan default
  if(state === 'err'){
    const t = (rec.title || '').trim();
    let needs = !t || /loading title/i.test(t);
    if(!needs){
      try{ needs = (t === new URL(rec.url).hostname); }catch{}
    }
    if(needs){
      rec.title = 'Link salah atau offline, cek link!';
    }
  }

  upsertRecord(rec);
}

async function ensureTitle(id){
  const rec = historyData.find(r=>r.id===id);
  if(!rec) return;
  const isPlaceholder = !rec.title || /loading title/i.test(rec.title);

  let need = isPlaceholder;
  if(!need){
    try{
      const host = new URL(rec.url).hostname;
      if(rec.title === host) need = true;
    }catch{}
  }
  if(!need) return;

  const ttl = await fetchTitle(rec.url);
  rec.title = cleanTitle(ttl || rec.title || rec.url);
  upsertRecord(rec);
}

/* ===== core check ===== */
async function checkOnce(url, mode, onUpdate){
  setStatus('wait','Sedang mengecek...');
  const direct = (mode === 'direct');

  try{
    if(direct){
      let res;
      try { res = await fetch(url, {method:'HEAD'}); }
      catch { res = await fetch(url, {method:'GET'}); }
      if (res.ok){
        setStatus('live','Link Live');
        if (onUpdate) onUpdate('live', res.status);
        return {ok:true,status:res.status};
      } else {
        setStatus('err',`Error: ${res.status || 'Unknown'}`);
        if (onUpdate) onUpdate('err', res.status || 'ERR');
        return {ok:false,status:res.status};
      }
    } else {
      const res = await fetch(toProxy(url), {method:'GET'});
      if(!res.ok){
        setStatus('err',`Error Proxy: ${res.status}`);
        if (onUpdate) onUpdate('err', res.status);
        return {ok:false,status:res.status};
      }
      const text = await res.text();
      const verdict = inferStatusFromText(text);
      if(verdict.ok){
        setStatus('live','Link Live (via Proxy)');
        if (onUpdate) onUpdate('live', verdict.code || 200);
        return {ok:true,status:200};
      }else{
        setStatus('err','Tidak bisa diakses');
        if (onUpdate) onUpdate('err', verdict.code || 'ERR');
        return {ok:false,status:0};
      }
    }
  }catch{
    setStatus('err','Tidak bisa diakses');
    if (onUpdate) onUpdate('err', 'ERR');
    return {ok:false,status:0};
  }
}

/* ===== actions ===== */
btn.addEventListener('click', async () => {
  const url = normalizeURL(input.value);
  if(!url) {
    showNotification('Please enter a URL', 'error');
    input.focus();
    return;
  }

  addLoadingState(btn);
  
  const rec = {
    id: uid(), url, title: 'Loading title…',
    status: 'wait', code: '', ts: Date.now(),
    mode: modeDirect.checked ? 'direct' : 'proxy'
  };
  upsertRecord(rec);

  try {
    await checkOnceCached(url, rec.mode, (state, code)=> updateBadge(rec.id, state, code));
    ensureTitle(rec.id);
    showNotification('Link checked successfully', 'success');
  } catch (error) {
    showNotification('Failed to check link', 'error');
  } finally {
    removeLoadingState(btn);
    input.value = '';
    input.focus();
  }
});

/* Enhanced keyboard support */
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    btn.click();
  }
});

/* ===== Keyboard Shortcuts ===== */
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    filterInput?.focus();
  }
  
  // Escape to clear filters
  if (e.key === 'Escape' && document.activeElement === filterInput) {
    filterInput.value = '';
    renderAll();
    input.focus();
  }
  
  // Ctrl/Cmd + Enter to check all
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && historyData.length > 0) {
    e.preventDefault();
    recheckAllBtn.click();
  }
  
  // Ctrl/Cmd + D to toggle mode
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    if (modeDirect.checked) {
      modeProxy.checked = true;
    } else {
      modeDirect.checked = true;
    }
    showNotification(`Switched to ${modeProxy.checked ? 'Proxy' : 'Direct'} mode`, 'info', 2000);
  }
});

/* Debounced filter */
const debouncedRender = debounce(renderAll, DEBOUNCE_DELAY, 'filter');
if (filterInput) {
  filterInput.addEventListener('input', debouncedRender);
}

/* Paste URL detection */
input.addEventListener('paste', (e) => {
  setTimeout(() => {
    const pastedText = input.value.trim();
    if (pastedText && /^https?:\/\//i.test(pastedText)) {
      input.style.borderColor = '#F18C8E';
      setTimeout(() => {
        input.style.borderColor = '';
      }, 500);
    }
  }, 10);
});

/* klik item untuk copy + action buttons */
historyList.addEventListener('click', async (e)=>{
  const li = e.target.closest('.history-item');
  if(!li) return;
  const id = li.dataset.id;
  const rec = historyData.find(r=>r.id===id);
  if(!rec) return;

  if(e.target.closest('.remove')){
    historyData = historyData.filter(r=>r.id!==id);
    saveLS(); renderAll(); 
    showNotification('Item removed', 'success');
    return;
  }
  if(e.target.closest('.recheck')){
    const mode = modeDirect.checked ? 'direct' : 'proxy';
    rec.mode = mode; upsertRecord(rec);
    addLoadingState(e.target.closest('.recheck'));
    await checkOnce(rec.url, mode, (state, code)=> updateBadge(id, state, code));
    removeLoadingState(e.target.closest('.recheck'));
    ensureTitle(id); 
    return;
  }
  if(e.target.closest('a')) return;

  // klik di area main => copy URL
  const main = e.target.closest('.item-main');
  if(main){
    try{
      await navigator.clipboard.writeText(rec.url);
      const oldTip = main.getAttribute('data-tip') || 'Click to copy URL';
      main.setAttribute('data-tip','Copied!');
      showNotification('URL copied to clipboard', 'success', 2000);
      setTimeout(()=> main.setAttribute('data-tip', oldTip), 900);
    }catch{}
  }
});

/* ===== Hover Preview for History Items ===== */
historyList.addEventListener('mouseover', (e) => {
  const urlEl = e.target.closest('.history-url');
  if (urlEl) {
    const url = urlEl.textContent;
    if (url && /^https?:\/\//i.test(url)) {
      showLinkPreview(url, urlEl);
    }
  }
});

historyList.addEventListener('mouseout', (e) => {
  if (e.target.closest('.history-url')) {
    hideLinkPreview();
  }
});

// clear & recheck all
clearListBtn.addEventListener('click', ()=>{
  if(!confirm('Delete all items?')) return;
  historyData = []; 
  saveLS(); 
  renderAll();
  showNotification('All items cleared', 'success');
});
recheckAllBtn.addEventListener('click', async ()=>{
  const mode = modeDirect.checked ? 'direct' : 'proxy';
  const ids = Array.from(historyList.children).map(li => li.dataset.id);
  for(const id of ids){
    const rec = historyData.find(r=>r.id===id); if(!rec) continue;
    rec.mode = mode; upsertRecord(rec);
    await checkOnceCached(rec.url, rec.mode, (state, code)=> updateBadge(rec.id, state, code));
    ensureTitle(rec.id);
  }
});

if (filterInput) {
  filterInput.addEventListener('input', renderAll);
}

/* ===== bulk ===== */
const bulk = document.getElementById('bulk');
const runBulk = document.getElementById('runBulk');
const clearBulk = document.getElementById('clearBulk');
const tbody = document.querySelector('#tbl tbody');

function rowTpl(u, status){
  const icon = status==='LIVE' ? '<i class="fa-solid fa-check"></i>' : status==='WAIT' ? '<i class="fa-solid fa-hourglass-half"></i>' : '<i class="fa-solid fa-xmark"></i>';
  return `<tr><td style="word-break:break-all">${u}</td><td>${icon} ${status}</td></tr>`;
}
if (runBulk) {
  runBulk.addEventListener('click', async()=>{
    const urls = bulk.value.split(/\n+/).map(x=>normalizeURL(x)).filter(Boolean);
    if(!urls.length) {
      showNotification('Please paste at least 1 URL', 'error');
      bulk.focus();
      return;
    }
    
    bulkCheckCancelled = false;
    createProgressOverlay(0, urls.length);
    
    tbody.innerHTML = urls.map(u=>rowTpl(u,'WAIT')).join('');
    const mode = modeDirect.checked ? 'direct' : 'proxy';
    addLoadingState(runBulk);

    // Process URLs in parallel batches of 10 to avoid overwhelming the browser
    const batchSize = 10;
    let completed = 0;
    
    for (let batchStart = 0; batchStart < urls.length; batchStart += batchSize) {
      if (bulkCheckCancelled) break;
      
      const batchEnd = Math.min(batchStart + batchSize, urls.length);
      const batch = urls.slice(batchStart, batchEnd);
      
      // Process current batch in parallel
      const batchPromises = batch.map(async (url, batchIndex) => {
        const index = batchStart + batchIndex;
        const rec = { id: uid(), url, title:'Loading title…', status:'wait', code:'', ts:Date.now(), mode };
        upsertRecord(rec);
        
        try {
          const out = await checkOnceCached(url, mode, (state, code)=> updateBadge(rec.id, state, code));
          tbody.rows[index].cells[1].innerHTML = out.ok ? '<i class="fa-solid fa-check"></i> LIVE' : `<i class="fa-solid fa-xmark"></i> ${out.status||'ERR'}`;
          ensureTitle(rec.id);
          return { success: out.ok, index };
        } catch {
          tbody.rows[index].cells[1].innerHTML = '<i class="fa-solid fa-xmark"></i> ERR';
          updateBadge(rec.id, 'err', 'ERR');
          ensureTitle(rec.id);
          return { success: false, index };
        }
      });
      
      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      completed += batchResults.length;
      
      // Update progress
      createProgressOverlay(completed, urls.length);
      
      // Small delay between batches to prevent blocking UI
      if (batchEnd < urls.length && !bulkCheckCancelled) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    hideProgressOverlay();
    removeLoadingState(runBulk);
    
    if (!bulkCheckCancelled) {
      const successCount = Array.from(tbody.rows).filter(row => 
        row.cells[1].textContent.includes('LIVE')
      ).length;
      showNotification(`Bulk check complete: ${successCount}/${urls.length} links are live`, 'success');
    }
  });
}

if (clearBulk) {
  clearBulk.addEventListener('click',()=>{ bulk.value=''; tbody.innerHTML=''; });
}

/* ===== Export CSV (sesuai filter yang tampil) ===== */
if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', ()=>{
    const q = (filterInput && filterInput.value || '').toLowerCase().trim();
    const rows = [['title','url','status','code','checked_at','mode']];
    for(const rec of historyData){
      const hay = `${rec.title} ${rec.url} ${rec.status} ${rec.code}`.toLowerCase();
      if(q && !hay.includes(q)) continue;
      rows.push([
        rec.title || '', rec.url, rec.status || '',
        String(rec.code || ''), new Date(rec.ts||Date.now()).toISOString(),
        rec.mode || ''
      ]);
    }
    const csv = rows.map(r => r.map(v=>{
      const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:T]/g,'-').slice(0,16);
    a.download = `link-history-${ts}.csv`; document.body.appendChild(a); a.click(); a.remove();
  });
}

/* ===== Auto-check: hanya item MERAH; stop bila semua hijau; start lagi jika ada merah ===== */
const AUTO_MS = 30000;
let autoTimer = null;
let autoIdx = 0;

function visibleIds(){ return Array.from(historyList.children).map(li => li.dataset.id); }
function visibleRedIds(){
  const ids = visibleIds();
  return ids.filter(id => {
    const rec = historyData.find(r=>r.id===id);
    return rec && rec.status === 'err';
  });
}
function stopAuto(){ 
  if(autoTimer){ 
    clearInterval(autoTimer); 
    autoTimer = null;
    autoCheckIndicator && autoCheckIndicator.setAttribute('hidden', '');
  }
}
function startAuto(){ 
  if(!autoTimer && visibleRedIds().length){ 
    autoTimer = setInterval(runAutoTick, AUTO_MS);
    autoCheckIndicator && autoCheckIndicator.removeAttribute('hidden');
  }
}
function reevaluateAuto(){ visibleRedIds().length ? startAuto() : stopAuto(); }

async function runAutoTick(){
  const reds = visibleRedIds();
  if(!reds.length){ stopAuto(); return; }
  const id = reds[autoIdx % reds.length]; autoIdx++;
  const rec = historyData.find(r=>r.id===id); if(!rec) return;

  const mode = modeDirect.checked ? 'direct' : 'proxy';
  rec.mode = mode; upsertRecord(rec);
  await checkOnceCached(rec.url, mode, (state, code)=> updateBadge(rec.id, state, code));
  ensureTitle(rec.id);
  reevaluateAuto();
}

/* ===== boot ===== */
(function init(){
  loadLS();
  renderAll();
  for (const rec of historyData) ensureTitle(rec.id);
  
  /* Add CSS animations */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  /* Initialize ripple effects */
  initRippleEffects();
  
  /* Focus input on load */
  input.focus();
  
  /* Show welcome notification for first time users */
  if (historyData.length === 0) {
    setTimeout(() => {
      showNotification('Welcome! Enter a URL to check if it\'s live', 'info', 5000);
    }, 500);
  }
  
  /* Initialize stats */
  renderAll();
  
  /* Add smooth scroll behavior */
  document.documentElement.style.scrollBehavior = 'smooth';
  
  /* Add page visibility handler to pause/resume auto-check */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAuto();
    } else {
      reevaluateAuto();
    }
  });
})();
