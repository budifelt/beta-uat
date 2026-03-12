/* ========= Constants ========= */
const LINES_PER_PAGE   = 1000;
const MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
const MAX_RENDER_ROWS  = 2000; // batas render agar modal tetap ringan
const VIRTUAL_BUFFER_SIZE = 50; // Extra rows to render outside viewport
const OBJECT_POOL_SIZE = 500; // Pool of reusable row elements

/* ========= Regex ========= */
const unitRegex  = /^KRHRED(?:_Unit)?_\d+$/i;

/* ========= File reader ========= */
class FileProcessor {
  constructor(){ this.reset(); }
  reset(){
    this.currentFile = null;
    this.fileContent = '';
    this.currentLines = [];
    this.totalSize = 0;
    this.loadedSize = 0;
  }
  updateProgress(){
    const percent = (this.loadedSize / this.totalSize) * 100;
    const wrap = document.getElementById('loadingWrapper');
    if (wrap){
      wrap.style.visibility = 'visible';
      document.getElementById('progressText').textContent = `${Math.round(percent)}%`;
    }
  }
  async readFile(file, onProgress){
    this.reset();
    this.currentFile = file;
    this.totalSize = file.size;

    // Use streaming with chunked processing for better performance
    const chunkSize = 64 * 1024; // 64KB chunks
    const reader  = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const lines = [];
    let lineCount = 0;
    
    // Pre-allocate array if we know the approximate size
    const estimatedLines = Math.floor(file.size / 50); // Rough estimate
    if (estimatedLines > 10000) {
      // For large files, use a more memory-efficient approach
      this.currentLines = new Array(estimatedLines);
      this.currentLines.length = 0;
    }

    try{
      while(true){
        const {done, value} = await reader.read();
        if (done) break;
        
        this.loadedSize += value.length;
        const text = decoder.decode(value, {stream:true});
        buffer += text;
        
        // Process lines in chunks to avoid blocking
        const lastNewline = buffer.lastIndexOf('\n');
        if (lastNewline !== -1) {
          const chunk = buffer.substring(0, lastNewline);
          const chunkLines = chunk.split('\n');
          
          // Use push with spread for better performance on smaller chunks
          if (chunkLines.length < 1000) {
            lines.push(...chunkLines);
          } else {
            // For large chunks, append individually to avoid call stack limits
            for (const line of chunkLines) {
              lines.push(line);
            }
          }
          
          lineCount += chunkLines.length;
          
          buffer = buffer.substring(lastNewline + 1);
        }
        
        this.updateProgress();
        if (onProgress) onProgress(this.loadedSize, this.totalSize);
        
        // Yield control more frequently for better responsiveness
        if (lineCount % 10000 === 0) {
          await new Promise(r=>setTimeout(r,0));
        }
      }
      
      // Add remaining content
      if (buffer) {
        lines.push(buffer);
      }
    } finally { 
      reader.releaseLock(); 
    }

    const wrap = document.getElementById('loadingWrapper');
    if (wrap) wrap.style.visibility = 'hidden';
    this.currentLines = lines;
    return lines;
  }
}

/* ========= File reader ========= */
class VirtualScroller {
  constructor(container, itemHeight = 20){
    this.container = container;
    // Cari virtual-scroll-content atau data-container
    this.content   = container.querySelector('.virtual-scroll-content') || container.querySelector('.data-container');
    if (!this.content) {
      // Buat div inner jika tidak ada
      this.content = document.createElement('div');
      this.content.className = 'virtual-scroll-content';
      container.innerHTML = '';
      container.appendChild(this.content);
    }
    this.itemHeight= itemHeight;
    this.items     = [];
    this.visible   = new Set();
    this.renderedElements = new Map(); // Cache rendered elements
    this.lastScrollTop = 0;
    this.scrollTimeout = null;
    this.setItemsTimeout = null;
    
    // Object pool for row elements
    this.elementPool = [];
    this.initObjectPool();
    
    // Use IntersectionObserver for better performance
    this.initIntersectionObserver();
    
    this.onScroll  = this.onScrollThrottled.bind(this);
    container.addEventListener('scroll', this.onScroll, { passive: true });
    this.observer = new ResizeObserver(()=>{
      if (this.content) this.update();
    });
    this.observer.observe(container);
  }
  
  initObjectPool() {
    for (let i = 0; i < OBJECT_POOL_SIZE; i++) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.width = '100%';
      div.style.display = 'none'; // Hide initially
      this.elementPool.push(div);
    }
  }
  
  getElementFromPool() {
    if (this.elementPool.length > 0) {
      return this.elementPool.pop();
    }
    // Pool exhausted, create new element
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.width = '100%';
    return div;
  }
  
  returnElementToPool(element) {
    if (this.elementPool.length < OBJECT_POOL_SIZE) {
      element.style.display = 'none';
      element.textContent = '';
      this.elementPool.push(element);
    } else {
      element.remove();
    }
  }
  
  initIntersectionObserver() {
    // Fallback to scroll-based approach if IntersectionObserver not available
    if (!('IntersectionObserver' in window)) return;
    
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-index'));
        if (entry.isIntersecting) {
          // Element is visible, ensure content is rendered
          if (!entry.target.textContent && this.items[index]) {
            entry.target.textContent = this.items[index];
          }
        }
      });
    }, {
      root: this.container,
      rootMargin: '50px'
    });
  }
  setItems(items){
    // Debounce setItems to avoid multiple rapid updates
    if (this.setItemsTimeout) {
      clearTimeout(this.setItemsTimeout);
    }
    
    this.setItemsTimeout = setTimeout(() => {
      this.setItemsImmediate(items);
      this.setItemsTimeout = null;
    }, 16); // ~60fps
  }
  
  setItemsImmediate(items){
    // Clear existing elements efficiently
    this.clearAllElements();
    
    this.items = items;
    this.content.style.height = `${items.length * this.itemHeight}px`;
    this.update();
  }
  
  clearAllElements() {
    // Return all elements to pool
    this.renderedElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.returnElementToPool(element);
    });
    this.renderedElements.clear();
    this.visible.clear();
  }
  update(){
    if (!this.content) return;
    
    const top = this.container.scrollTop;
    const h   = this.container.clientHeight;
    const start = Math.max(0, Math.floor(top / this.itemHeight) - VIRTUAL_BUFFER_SIZE);
    const end   = Math.min(this.items.length, Math.ceil((top + h)/this.itemHeight) + VIRTUAL_BUFFER_SIZE);

    // Use DocumentFragment for batch DOM operations
    const frag = document.createDocumentFragment();
    const newSet = new Set();
    const toRemove = [];

    // Check which elements need to be added or updated
    for (let i=start;i<end;i++){
      newSet.add(i);
      if (!this.visible.has(i) || !this.renderedElements.has(i)){
        const div = this.renderedElements.get(i) || this.getElementFromPool();
        div.style.height = `${this.itemHeight}px`;
        div.style.top = `${i * this.itemHeight}px`;
        div.style.display = '';
        div.setAttribute('data-index', i);
        
        // Lazy content rendering - only set text if in viewport or near it
        const isInViewport = i >= Math.floor(top / this.itemHeight) && i <= Math.ceil((top + h) / this.itemHeight);
        if (isInViewport || !this.intersectionObserver) {
          div.textContent = this.items[i];
        } else {
          // Defer content rendering
          div.textContent = '';
          if (this.intersectionObserver) {
            this.intersectionObserver.observe(div);
          }
        }
        
        this.renderedElements.set(i, div);
        if (!this.visible.has(i)) {
          frag.appendChild(div);
        }
      }
    }

    // Find elements to remove
    this.visible.forEach(idx => {
      if (!newSet.has(idx)) {
        toRemove.push(idx);
      }
    });

    // Batch DOM updates
    if (frag.children.length > 0) {
      this.content.appendChild(frag);
    }
    
    // Remove elements outside viewport
    toRemove.forEach(idx => {
      const el = this.renderedElements.get(idx);
      if (el) {
        if (this.intersectionObserver) {
          this.intersectionObserver.unobserve(el);
        }
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        this.returnElementToPool(el);
      }
    });

    // Clean up map entries for removed elements
    toRemove.forEach(idx => this.renderedElements.delete(idx));
    
    this.visible = newSet;
  }
  
  onScrollThrottled(){
    // Throttle scroll updates using requestAnimationFrame
    if (this.scrollTimeout) {
      cancelAnimationFrame(this.scrollTimeout);
    }
    this.scrollTimeout = requestAnimationFrame(() => {
      this.update();
      this.scrollTimeout = null;
    });
  }
  
  onScroll(){ 
    this.onScrollThrottled();
  }
  destroy(){
    this.observer.disconnect();
    this.container.removeEventListener('scroll', this.onScroll);
    
    // Clear debounced timeouts
    if (this.setItemsTimeout) {
      clearTimeout(this.setItemsTimeout);
    }
    if (this.scrollTimeout) {
      cancelAnimationFrame(this.scrollTimeout);
    }
    
    // Clean up intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    // Clean up all elements and return to pool
    this.clearAllElements();
    
    // Clean up object pool
    this.elementPool.forEach(element => element.remove());
    this.elementPool = [];
  }
}

/* ========= Main App ========= */
class DatabaseChecker {
  constructor(){
    this.fp = new FileProcessor();
    this.vs = new VirtualScroller(document.getElementById('databaseContent'));
    this.currentLines = [];
    this.processedLinesCount = 0;
    this.isChecking = false;
    this.worker = null;
    
    // Initialize Web Worker if available
    this.initWorker();

    // Default schema (akan di-detect ulang saat file load)
    this.schema = { cmpgIdx:0, emailIdx:1, unitIdx:2, textIdx:3 };

    // Modal refs
    this.modal        = document.getElementById('searchModal');
    this.emailInput   = document.getElementById('emailQuery');
    this.emailInfoEl  = document.getElementById('emailMatchesInfo');
    this.rowsEl       = document.getElementById('krhredRows');
    this.schemaInfoEl = document.getElementById('schemaInfo');

    this.bindEvents();
  }
  
  initWorker() {
    try {
      // Create worker from inline blob to avoid CORS issues
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch(type) {
            case 'countUniqueCMPGIDs':
              countUniqueCMPGIDs(data);
              break;
          }
        };
        
        function countUniqueCMPGIDs({ lines }) {
          const uniqueIds = new Set();
          
          for (const line of lines) {
            if (!line || line.length === 0) continue;
            
            const pipeIndex = line.indexOf('|');
            if (pipeIndex === -1) continue;
            
            const cmpg = line.substring(0, pipeIndex).trim();
            if (cmpg) uniqueIds.add(cmpg);
          }
          
          self.postMessage({
            type: 'countResult',
            count: uniqueIds.size
          });
        }
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = (e) => {
        if (e.data.type === 'countResult') {
          this.handleWorkerCountResult(e.data.count);
        }
      };
    } catch (error) {
      console.log('Web Worker not available, using main thread');
      this.worker = null;
    }
  }
  
  handleWorkerCountResult(count) {
    const totalRowsEl = document.getElementById('totalRows');
    if (totalRowsEl) {
      totalRowsEl.textContent = count.toLocaleString();
    }
  }

  bindEvents(){
    document.getElementById('folderOpenBtn').addEventListener('click', ()=>this.openFolder());

    this.checkBtn = document.getElementById('checkBtn');
    this.checkBtn.addEventListener('click', ()=>{
      if (this.isChecking){ this.stopChecking(); } else { this.checkDatabase(); }
    });

    document.getElementById('loadMoreBtn').addEventListener('click', ()=>this.loadMore());

    // Modal & search
    document.getElementById('openSearchModalBtn').addEventListener('click', ()=>this.openSearchModal());
    document.getElementById('modalCloseBtn').addEventListener('click', ()=>this.closeSearchModal());
    document.getElementById('modalBackdrop').addEventListener('click', ()=>this.closeSearchModal());
    document.getElementById('searchEmailBtn').addEventListener('click', ()=>this.performEmailSearch());
    this.emailInput.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') this.performEmailSearch(); });

    // Selection sync (fallback)
    document.addEventListener('click', (e)=>{
      const item = e.target.closest('#fileList li, #fileList button.file');
      if (!item) return;
      document.querySelectorAll('#fileList .selected,[aria-selected="true"]').forEach(x=>{
        x.classList.remove('selected'); x.removeAttribute('aria-selected');
      });
      item.classList.add('selected'); item.setAttribute('aria-selected','true');
    });

    // Esc to close modal
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && this.modalIsOpen()) this.closeSearchModal();
    });
  }

  /* ===== Modal ===== */
  modalIsOpen(){ return this.modal && (this.modal.hasAttribute('open') || this.modal.classList.contains('show')); }
  openSearchModal(){
    if (!this.currentLines.length){ alert('Please load a file first'); return; }
    this.detectSchema();
    this.updateSchemaInfo();
    this.rowsEl.innerHTML = '';
    this.emailInfoEl.textContent = 'Masukkan email lalu tekan Search.';
    this.modal.setAttribute('open','');
    this.modal.classList.add('show');
    setTimeout(()=>this.emailInput?.focus(),0);
  }
  closeSearchModal(){
    this.modal.classList.remove('show');
    this.modal.removeAttribute('open');
  }
  updateSchemaInfo(){
    const {cmpgIdx,emailIdx,unitIdx,textIdx} = this.schema;
    this.schemaInfoEl.textContent = `Schema: CMPGID[${cmpgIdx}] • EMAIL[${emailIdx}] • KRHRED[${unitIdx}] • TEXT[${textIdx}]`;
  }

  /* ===== Schema auto-detect ===== */
  detectSchema(){
    const sample = this.currentLines.slice(0, Math.min(600, this.currentLines.length));
    const votes = { email: new Map(), unit: new Map(), atSign: new Map() };
    let maxCols = 0;

    for (const line of sample){
      const parts = line.split('|');
      maxCols = Math.max(maxCols, parts.length);
      parts.forEach((f, idx)=>{
        const field = (f||'').trim();
        // email vote (strict)
        const isEmailStrict = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(field);
        if (isEmailStrict) votes.email.set(idx, (votes.email.get(idx)||0)+1);
        // fallback: contains '@'
        if (field.includes('@')) votes.atSign.set(idx, (votes.atSign.get(idx)||0)+1);
        // unit vote
        if (unitRegex.test(field)) votes.unit.set(idx, (votes.unit.get(idx)||0)+1);
      });
    }
    const maxKey = (m, def)=> m.size ? [...m.entries()].sort((a,b)=>b[1]-a[1])[0][0] : def;

    let emailIdx = maxKey(votes.email, undefined);
    if (emailIdx === undefined) emailIdx = maxKey(votes.atSign, 1); // fallback kalau email tidak valid
    const unitIdx  = maxKey(votes.unit, 2);

    let textIdx = unitIdx + 1;
    if (textIdx >= maxCols) textIdx = Math.max(3, maxCols - 1);
    const cmpgIdx = 0;

    this.schema = { cmpgIdx, emailIdx, unitIdx, textIdx };
  }

  /* ===== Search & render per-entry list ===== */
  performEmailSearch(){
    if (!this.currentLines.length){ alert('Please load a file first'); return; }
    const q = (this.emailInput.value || '').trim().toLowerCase();
    const { emailIdx, unitIdx, textIdx } = this.schema;

    const entries = []; // {unit, text, chars}
    let totalMatches = 0;

    for (let i=0;i<this.currentLines.length;i++){
      const parts = this.currentLines[i].split('|');
      const email = (parts[emailIdx]||'').trim().toLowerCase();
      const unit  = (parts[unitIdx]  ||'').trim();
      const text  = (parts[textIdx]  ||'').trim();

      if (q && !email.includes(q)) continue; // filter email jika ada
      if (!unitRegex.test(unit)) continue;

      totalMatches++;
      const normalizedUnit = unit.replace(/^krhred(?:_unit)?_/i, 'KRHRED_Unit_');
      entries.push({ unit: normalizedUnit, text, chars: text.length });
    }

    // Info
    this.emailInfoEl.textContent = q
      ? `Email match: ${totalMatches.toLocaleString()} baris`
      : `Semua baris: ${this.currentLines.length.toLocaleString()} (berisi KRHRED: ${entries.length.toLocaleString()})`;

    // Render (batasi agar ringan)
    this.rowsEl.innerHTML = '';
    if (!entries.length){
      this.rowsEl.innerHTML = `<div class="muted">Tidak ada KRHRED untuk filter ini.</div>`;
      return;
    }

    const toRender = entries.slice(0, MAX_RENDER_ROWS);
    const frag = document.createDocumentFragment();
    for (const e of toRender){
      const row = document.createElement('div');
      row.className = 'krhred-row';
      row.innerHTML = `<code>attr:${e.unit}</code><span class="input value${e.text.length > 60 ? ' value-long' : ''}">${escapeHtml(e.text)}</span>`;
      frag.appendChild(row);
    }
    this.rowsEl.appendChild(frag);

    if (entries.length > toRender.length){
      const more = document.createElement('div');
      more.className = 'muted';
      more.style.marginTop = '8px';
      more.textContent = `Showing ${toRender.length.toLocaleString()} of ${entries.length.toLocaleString()} entries. Refine email filter to narrow results.`;
      this.rowsEl.appendChild(more);
    }
  }

  /* ========= Check database (optimized with full validation) ===== */
  async checkDatabase(){
    if (!this.currentLines.length){ alert('Please load a file first'); return; }
    this.isChecking = true; this.updateCheckButton(); this.showLoading(true);

    const unitsSet = new Set();
    const emptyDataUnits = new Set();
    const longKrhredUnits = new Set(); // Unit dengan KRHRED > 60 chars
    const invalidFormatUnits = new Set(); // Unit dengan format tidak valid
    const invalidEmailUnits = new Set(); // Unit dengan email tidak valid
    const longDataUnits = new Set(); // Unit dengan data terlalu panjang
    const missingFieldUnits = new Set(); // Unit dengan field kosong
    const unitDetails = new Map();
    const chunkSize = 1000;
    this._stopRequested = false;

    for (let i=0;i<this.currentLines.length;i+=chunkSize){
      if (this._stopRequested) break;
      const chunk = this.currentLines.slice(i, Math.min(i+chunkSize, this.currentLines.length));

      chunk.forEach((line, index)=>{
        const parts = line.split('|');
        if (parts.length >= 4){
          const id = (parts[0] || '').trim();
          const email = (parts[1] || '').trim();
          const type = (parts[2] || '').trim();
          const dataRaw = parts[3] || '';
          const data = dataRaw.trim();

          // Check missing required fields
          if (!id || !email || !type) {
            const missingFields = [];
            if (!id) missingFields.push('ID');
            if (!email) missingFields.push('Email');
            if (!type) missingFields.push('Type');
            
            missingFieldUnits.add(type || 'UNKNOWN');
            if (!unitDetails.has(type || 'UNKNOWN')) unitDetails.set(type || 'UNKNOWN', []);
            unitDetails.get(type || 'UNKNOWN').push({ 
              lineNumber: i+index+1, 
              lineText: line,
              error: `Missing fields: ${missingFields.join(', ')}`
            });
          }

          // Check if it's a KRHRED type
          if (type.toLowerCase().startsWith('krhred')) {
            unitsSet.add(type);
            
            // Check all error conditions
            const errors = [];
            
            // Check for empty data or trailing/leading spaces
            if (data === '' || dataRaw !== dataRaw.trim()) {
              errors.push('Invalid data');
              emptyDataUnits.add(type);
            }
            
            // Check for single dot
            if (data === '.') {
              errors.push('Invalid data');
              emptyDataUnits.add(type);
            }
            
            // Check for double spaces within data
            if (data.includes('  ')) {
              errors.push('Invalid data');
              emptyDataUnits.add(type);
            }
            
            // Check KRHRED length
            if (type.length > 60) {
              errors.push(`KRHRED too long (${type.length})`);
              longKrhredUnits.add(type);
            }
            
            // Check KRHRED format
            if (!unitRegex.test(type)) {
              errors.push('Invalid format');
              invalidFormatUnits.add(type);
            }
            
            // Check email format
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) {
              errors.push('Invalid email');
              invalidEmailUnits.add(type);
            }
            
            // Check data length
            if (data.length > 60) {
              errors.push(`Data too long (${data.length})`);
              longDataUnits.add(type);
            }

            // Store error details if any errors found
            if (errors.length > 0) {
              if (!unitDetails.has(type)) unitDetails.set(type, []);
              unitDetails.get(type).push({ 
                lineNumber: i+index+1, 
                lineText: line,
                error: errors.join(', ')
              });
            }
          }
        }
      });

      this.updatePercent(Math.min(i+chunkSize, this.currentLines.length), this.currentLines.length);
      await new Promise(r=>setTimeout(r,0));
    }

    // Combine all errors
    const allErrorUnits = new Set([...emptyDataUnits, ...longKrhredUnits, ...invalidFormatUnits, ...invalidEmailUnits, ...longDataUnits, ...missingFieldUnits]);
    this.renderResults(unitsSet, allErrorUnits, unitDetails);
    this.showLoading(false); this.isChecking = false; this.updateCheckButton();
  }

  stopChecking(){
    this._stopRequested = true;
    this.isChecking = false;
    this.updateCheckButton();
    this.showLoading(false);
  }

  updateCheckButton(){
    if (this.isChecking){
      this.checkBtn.innerHTML = `<i class="fa-solid fa-stop"></i><span>Stop</span>`;
      document.getElementById('loadingIndicator').style.display = 'none';
    } else {
      this.checkBtn.innerHTML = `<i class="fa-solid fa-list-check"></i><span>Check</span>`;
      document.getElementById('loadingIndicator').style.display = 'inline-block';
    }
  }
  showLoading(show){
    const wrap = document.getElementById('loadingWrapper');
    if (wrap) wrap.style.visibility = show ? 'visible' : 'hidden';
  }
  updatePercent(current, total){
    const percent = (current/total)*100;
    const wrap = document.getElementById('loadingWrapper');
    if (wrap){
      wrap.style.visibility = 'visible';
      document.getElementById('progressText').textContent = `${Math.round(percent)}%`;
    }
  }

  /* ===== Folder & file ===== */
  async openFolder(){
    try{
      const dirHandle = await window.showDirectoryPicker();
      await this.buildFileTree(dirHandle);
    } catch(err){
      if (err.name === 'AbortError') {
        // User cancelled the dialog - don't show an error
        console.log('Folder selection cancelled by user');
      } else if (err.name === 'NotAllowedError') {
        alert('Permission denied. Please allow access to select a folder.');
      } else if (err.name === 'NotFoundError') {
        alert('The selected folder was not found.');
      } else {
        console.error('Error opening folder:', err);
        alert('Error opening folder: ' + err.message);
      }
    }
  }

  async buildFileTree(dirHandle, parentUl = document.querySelector('#fileList ul')){
    parentUl.innerHTML = '';
    const entries = [];
    for await (const entry of dirHandle.values()) entries.push(entry);
    entries.sort((a,b)=>a.name.localeCompare(b.name));

    const frag = document.createDocumentFragment();
    for (const entry of entries){
      if (entry.kind === 'file' && entry.name.includes('CustAttr.txt')){
        const li = document.createElement('li');
        li.className = 'file';
        li.textContent = entry.name;
        li.title = entry.name;
        li.addEventListener('click', async (e)=>{
          e.stopPropagation();
          await this.loadFile(entry);
          document.querySelectorAll('#fileList li').forEach(el=>el.classList.remove('selected'));
          li.classList.add('selected');
        });
        frag.appendChild(li);
      }
    }
    parentUl.appendChild(frag);
  }

  clearResults(){
    document.getElementById('resultsContainer').innerHTML = '';
    const detailsDiv = document.getElementById('krhredDetails');
    if (detailsDiv) detailsDiv.innerHTML = '';
    document.getElementById('loadMoreBtn').style.display = 'none';
  }

  async loadFile(fileHandle){
    try{
      this.clearResults();
      this.showLoading(true);
      const file = await fileHandle.getFile();

      if (file.size > MAX_MEMORY_USAGE){
        const ok = confirm(`This file is large (${(file.size/1024/1024).toFixed(1)}MB). Continue?`);
        if (!ok){ this.showLoading(false); return; }
      }

      // Load file with optimized streaming
      this.currentLines = await this.fp.readFile(file, (loaded,total)=>this.updatePercent(loaded,total));
      this.processedLinesCount = Math.min(this.currentLines.length, LINES_PER_PAGE);
      
      // Use requestAnimationFrame for non-blocking UI updates
      requestAnimationFrame(() => {
        this.vs.setItems([]); // clear
        this.vs.setItems(this.currentLines.slice(0, this.processedLinesCount));
        
        document.getElementById('loadMoreBtn').style.display =
          this.currentLines.length > LINES_PER_PAGE ? 'inline-flex' : 'none';
        
        // detect schema once file loaded
        this.detectSchema();
        
        // Enable buttons
        this.checkBtn.disabled = false;
        document.getElementById('openSearchModalBtn').disabled = false;
        document.getElementById('exportBtn').disabled = false;
      });

    } catch(err){
      console.error('Error loading file:', err);
      alert('Error loading file: ' + err.message);
    } finally {
      this.showLoading(false);
    }
  }

  loadMore(){
    const next = this.currentLines.slice(this.processedLinesCount, this.processedLinesCount + LINES_PER_PAGE);
    if (next.length){
      this.processedLinesCount += next.length;
      
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        this.vs.setItems(this.currentLines.slice(0, this.processedLinesCount));
        document.getElementById('loadMoreBtn').style.display =
          this.processedLinesCount < this.currentLines.length ? 'inline-flex' : 'none';
      });
    }
  }

  renderResults(unitsSet, errorUnits, unitDetails){
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) return;

    const totalDB = this.countUniqueCMPGIDs(this.currentLines);
    
    // Clear and build results HTML
    let html = '<div class="validation-results">';
    
    // Summary section - error count will be calculated later
    html += '<div class="results-summary">';
    html += `<h4>Validation Results</h4>`;
    html += `<p>Database Total: ${totalDB}</p>`;
    
    // Show all KRHRED units found
    if (unitsSet.size > 0) {
      html += '<div class="krhred-list">';
      html += '<h5>KRHRED Units Found:</h5>';
      const sortedUnits = Array.from(unitsSet).sort((a,b)=>{
        const aNum = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const bNum = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return aNum - bNum;
      });
      
      sortedUnits.forEach(unit => {
        const hasError = errorUnits.has(unit);
        const statusClass = hasError ? 'error' : 'valid';
        html += `<span class="krhred-unit ${statusClass}">${unit}</span>`;
      });
      html += '</div>';
    }
    html += '</div>';
    
    // Error details section - grouped by error type
    if (errorUnits.size > 0){
      html += '<div class="results-details">';
      html += '<h4>Error Summary</h4>';
      
      // Group errors by type with details
      const errorGroups = {
        'Missing Required Fields': [],
        'Invalid Data': [],
        'KRHRED Too Long (>60 chars)': [],
        'Invalid KRHRED Format': [],
        'Invalid Email': [],
        'Data Too Long (>60 chars)': []
      };
      
      // Collect all errors with their details
      Array.from(errorUnits).forEach(unit => {
        const details = unitDetails.get(unit) || [];
        if (details.length > 0) {
          details.forEach(item => {
            const errorType = this.getErrorType(item.error);
            if (errorGroups[errorType]) {
              errorGroups[errorType].push({
                unit: unit,
                lineNumber: item.lineNumber,
                lineText: item.lineText,
                error: item.error
              });
            }
          });
        }
      });
      
      // Count total errors (not units)
      let totalErrors = 0;
      Object.values(errorGroups).forEach(errors => {
        totalErrors += errors.length;
      });
      
      // Add error count to summary
      html = html.replace(
        `<p>Database Total: ${totalDB}</p>`,
        `<p>Database Total: ${totalDB}</p><p class="${totalErrors > 0 ? 'error-count' : 'success-count'}">${totalErrors} total errors</p>`
      );
      
      // Display each error category with all items
      Object.entries(errorGroups).forEach(([errorType, errors]) => {
        if (errors.length > 0) {
          html += `<div class="error-category">
            <h5><i class="fa-solid fa-exclamation-triangle"></i> ${errorType} (${errors.length})</h5>`;
          
          errors.forEach(error => {
            html += `<div class="error-item">
              <strong>${error.unit}</strong> - Line ${error.lineNumber}: ${escapeHtml(error.lineText)}
            </div>`;
          });
          
          html += '</div>';
        }
      });
      
      html += '</div>';
    }
    
    html += '</div>';
    resultsContainer.innerHTML = html;
    
    // Update stats
    updateQuickStats();
  }

  // Helper to determine error type
  getErrorType(errorMsg) {
    if (errorMsg.includes('Missing fields')) {
      return 'Missing Required Fields';
    } else if (errorMsg.includes('Invalid data')) {
      return 'Invalid Data';
    } else if (errorMsg.includes('KRHRED too long')) {
      return 'KRHRED Too Long (>60 chars)';
    } else if (errorMsg.includes('Invalid format')) {
      return 'Invalid KRHRED Format';
    } else if (errorMsg.includes('Invalid email')) {
      return 'Invalid Email';
    } else if (errorMsg.includes('Data too long')) {
      return 'Data Too Long (>60 chars)';
    }
    return 'Other';
  }

  countUniqueCMPGIDs(lines){
    const s = new Set();
    
    // Optimized for large datasets with chunked processing
    const CHUNK_SIZE = 10000;
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      
      // Process chunk
      for (const line of chunk) {
        if (!line || line.length === 0) continue;
        
        // Find first pipe character instead of split for better performance
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) continue;
        
        const cmpg = line.substring(0, pipeIndex).trim();
        if (cmpg) s.add(cmpg);
      }
      
      // Yield to browser every chunk to prevent blocking
      if (i + CHUNK_SIZE < lines.length) {
        if (typeof setImmediate !== 'undefined') {
          setImmediate(() => {});
        } else {
          setTimeout(() => {}, 0);
        }
      }
    }
    
    return s.size;
  }

  // Async version with chunked processing
  async countUniqueCMPGIDsAsync(lines) {
    const s = new Set();
    const CHUNK_SIZE = 50000; // Process 50k lines at a time
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      
      // Process chunk
      for (const line of chunk) {
        if (!line || line.length === 0) continue;
        
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) continue;
        
        const cmpg = line.substring(0, pipeIndex).trim();
        if (cmpg) s.add(cmpg);
      }
      
      // Yield to browser after each chunk
      if (i + CHUNK_SIZE < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return s.size;
  }
}

/* ========= Utils ========= */
function escapeHtml(str){
  return (str ?? '').replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

/* ========= Floating Action Button ========= */
document.addEventListener('DOMContentLoaded', () => {
  const fabMenu = document.getElementById('fabMenu');
  const fabContainer = document.querySelector('.fab-container');
  const fabRefresh = document.getElementById('fabRefresh');
  const fabSettings = document.getElementById('fabSettings');
  const fabHelp = document.getElementById('fabHelp');
  
  // Toggle FAB menu
  if (fabMenu) {
    fabMenu.addEventListener('click', () => {
      fabContainer.classList.toggle('active');
    });
  }
  
  // Close FAB menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!fabContainer.contains(e.target)) {
      fabContainer.classList.remove('active');
    }
  });
  
  // FAB item actions
  if (fabRefresh) {
    fabRefresh.addEventListener('click', () => {
      location.reload();
    });
  }
  
  if (fabSettings) {
    fabSettings.addEventListener('click', () => {
      alert('Settings feature coming soon!');
    });
  }
  
  if (fabHelp) {
    fabHelp.addEventListener('click', () => {
      alert('Help: \n1. Open folder with database files\n2. Select a file to view\n3. Click "Check Data" to validate\n4. View results in the right panel');
    });
  }
  
  // Update quick stats
  updateQuickStats();
});

/* ========= Quick Stats Update ========= */
function updateQuickStats() {
  const totalRowsEl = document.getElementById('totalRows');
  const errorCountEl = document.getElementById('errorCount');
  
  // Update based on current data - count unique CMPG_ID
  if (window.dbChecker && window.dbChecker.currentLines) {
    // Use Web Worker if available for large datasets
    if (window.dbChecker.worker && window.dbChecker.currentLines.length > 50000) {
      window.dbChecker.worker.postMessage({
        type: 'countUniqueCMPGIDs',
        data: { lines: window.dbChecker.currentLines }
      });
    } else {
      // Fallback to main thread with setTimeout for smaller datasets
      setTimeout(() => {
        const uniqueCMPG = window.dbChecker.countUniqueCMPGIDs(window.dbChecker.currentLines);
        if (totalRowsEl) {
          totalRowsEl.textContent = uniqueCMPG.toLocaleString();
        }
      }, 0);
    }
  } else {
    if (totalRowsEl) {
      totalRowsEl.textContent = '0';
    }
  }
  
  // Count errors from results
  const resultsContainer = document.getElementById('resultsContainer');
  if (resultsContainer) {
    const errorElements = resultsContainer.querySelectorAll('.error-item');
    if (errorCountEl) {
      errorCountEl.textContent = errorElements.length;
    }
  }
}

// Async version for large datasets
async function updateQuickStatsAsync() {
  const totalRowsEl = document.getElementById('totalRows');
  const errorCountEl = document.getElementById('errorCount');
  
  // Update based on current data - count unique CMPG_ID with async yielding
  if (window.dbChecker && window.dbChecker.currentLines) {
    const uniqueCMPG = await window.dbChecker.countUniqueCMPGIDsAsync(window.dbChecker.currentLines);
    if (totalRowsEl) {
      totalRowsEl.textContent = uniqueCMPG.toLocaleString();
    }
  } else {
    if (totalRowsEl) {
      totalRowsEl.textContent = '0';
    }
  }
  
  // Count errors from results
  const resultsContainer = document.getElementById('resultsContainer');
  if (resultsContainer) {
    const errorElements = resultsContainer.querySelectorAll('.error-item');
    if (errorCountEl) {
      errorCountEl.textContent = errorElements.length;
    }
  }
}

/* ========= Boot ========= */
const app = new DatabaseChecker();
window.dbChecker = app; // Make app globally accessible
window.addEventListener('beforeunload', ()=>{
  app.vs.destroy();
  // Clean up Web Worker
  if (app.worker) {
    app.worker.terminate();
  }
});
