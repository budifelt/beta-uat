/* ========= Constants ========= */
const LINES_PER_PAGE   = 1000;
const MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
const MAX_RENDER_ROWS  = 2000; // batas render agar modal tetap ringan

/* ========= Regex ========= */
const unitRegex  = /^KRHRED(?:_Unit)?_\d+$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const reader  = file.stream().getReader();
    const decoder = new TextDecoder();

    try{
      while(true){
        const {done, value} = await reader.read();
        if (done) break;
        this.loadedSize += value.length;
        const text = decoder.decode(value, {stream:true});
        this.fileContent += text;
        this.updateProgress();
        if (onProgress) onProgress(this.loadedSize, this.totalSize);
        await new Promise(r=>setTimeout(r,0));
      }
    } finally { reader.releaseLock(); }

    const wrap = document.getElementById('loadingWrapper');
    if (wrap) wrap.style.visibility = 'hidden';
    this.currentLines = this.fileContent.split('\n');
    return this.currentLines;
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
    this.onScroll  = this.onScroll.bind(this);
    container.addEventListener('scroll', this.onScroll);
    this.observer = new ResizeObserver(()=>{
      if (this.content) this.update();
    });
    this.observer.observe(container);
  }
  setItems(items){
    this.items = items;
    this.content.style.height = `${items.length * this.itemHeight}px`;
    this.update();
  }
  update(){
    if (!this.content) return;
    
    const top = this.container.scrollTop;
    const h   = this.container.clientHeight;
    const start = Math.floor(top / this.itemHeight);
    const end   = Math.min(Math.ceil((top + h)/this.itemHeight), this.items.length);

    const frag = document.createDocumentFragment();
    const newSet = new Set();

    for (let i=start;i<end;i++){
      newSet.add(i);
      if (!this.visible.has(i)){
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.top = `${i * this.itemHeight}px`;
        div.style.height = `${this.itemHeight}px`;
        div.style.width = '100%';
        div.textContent = this.items[i];
        frag.appendChild(div);
      }
    }

    this.content.querySelectorAll('div').forEach(div=>{
      const idx = Math.floor(parseInt(div.style.top)/this.itemHeight);
      if (!newSet.has(idx)) div.remove();
    });

    this.content.appendChild(frag);
    this.visible = newSet;
  }
  onScroll(){ this.update(); }
  destroy(){
    this.observer.disconnect();
    this.container.removeEventListener('scroll', this.onScroll);
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

  /* ===== Check database (existing) ===== */
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
    const duplicateUnits = new Set(); // Unit dengan data duplicate
    const unitDetails = new Map();
    const chunkSize = 1000;
    this._stopRequested = false;
    
    // Track duplicates
    const seenData = new Map(); // key: unit+data, value: count

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
            
            // Simplified error checking - only add unit to error set once
            const hasError = 
              (data === '' || dataRaw !== data) ||
              (data === '.') ||
              (data.includes('  ')) ||
              (type.length > 60) ||
              (!unitRegex.test(type)) ||
              (!emailRegex.test(email)) ||
              (data.length > 60);

            if (hasError) {
              // Build error message
              const errors = [];
              if (data === '' || dataRaw !== data || data === '.' || data.includes('  ')) errors.push('Invalid data');
              if (type.length > 60) errors.push(`KRHRED too long (${type.length})`);
              if (!unitRegex.test(type)) errors.push('Invalid format');
              if (!emailRegex.test(email)) errors.push('Invalid email');
              if (data.length > 60) errors.push(`Data too long (${data.length})`);

              // Add to appropriate error sets
              if (data === '' || dataRaw !== data || data === '.' || data.includes('  ')) emptyDataUnits.add(type);
              if (type.length > 60) longKrhredUnits.add(type);
              if (!unitRegex.test(type)) invalidFormatUnits.add(type);
              if (!emailRegex.test(email)) invalidEmailUnits.add(type);
              if (data.length > 60) longDataUnits.add(type);

              // Store error details (simplified)
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
      console.error('Error opening folder:', err);
      alert('Error opening folder: ' + err.message);
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
    // Clear results panel
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-check-circle"></i>
          <p>No validation results yet</p>
        </div>
      `;
    }
    
    // Hide load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = 'none';
    }
    
    // Update quick stats
    updateQuickStats();
  }

  async loadFile(fileHandle){
    try{
      this.clearResults();
      this.showLoading(true);
      
      // Get file info
      const file = await fileHandle.getFile();
      const startTime = performance.now();
      
      // Update current path immediately
      const currentPathEl = document.getElementById('currentPath');
      if (currentPathEl) {
        currentPathEl.textContent = file.name;
      }

      // Early validation
      if (file.size === 0) {
        alert('File is empty!');
        this.showLoading(false);
        return;
      }

      if (file.size > MAX_MEMORY_USAGE){
        const ok = confirm(`This file is large (${(file.size/1024/1024).toFixed(1)}MB). Continue?`);
        if (!ok){ this.showLoading(false); return; }
      }

      // Optimized file reading with better progress
      const processor = new FileProcessor();
      
      // Add progress callback for better UX
      const onProgress = (loaded, total) => {
        const percent = Math.round((loaded / total) * 100);
        this.updateProgress(percent);
        
        // Update status with more info
        const progressText = document.getElementById('progressText');
        if (progressText) {
          const mbLoaded = (loaded / 1024 / 1024).toFixed(1);
          const mbTotal = (total / 1024 / 1024).toFixed(1);
          progressText.textContent = `${percent}% (${mbLoaded}/${mbTotal} MB)`;
        }
      };
      
      // Read file with progress tracking
      this.currentLines = await processor.readFile(file, onProgress);
      
      // Validate loaded data
      if (!this.currentLines || this.currentLines.length === 0) {
        alert('No data found in file!');
        this.showLoading(false);
        return;
      }
      
      // Filter out empty lines early
      const originalCount = this.currentLines.length;
      this.currentLines = this.currentLines.filter(line => line.trim().length > 0);
      const filteredCount = this.currentLines.length;
      
      if (originalCount !== filteredCount) {
        console.log(`Filtered ${originalCount - filteredCount} empty lines`);
      }
      
      // Display data with requestAnimationFrame for smooth UI
      requestAnimationFrame(() => {
        this.displayData();
        
        // Update stats after display
        requestAnimationFrame(() => {
          updateQuickStatsAsync();
          
          // Enable buttons after everything is loaded
          this.checkBtn.disabled = false;
          document.getElementById('openSearchModalBtn').disabled = false;
          document.getElementById('exportBtn').disabled = false;
          
          // Log performance
          const loadTime = performance.now() - startTime;
          console.log(`File loaded successfully: ${filteredCount} lines in ${loadTime.toFixed(2)}ms`);
          
          // Hide loading
          this.showLoading(false);
        });
      });
      
    } catch(err){
      console.error('Error loading file:', err);
      alert('Error loading file: ' + err.message);
      this.showLoading(false);
    }
  }

  // Stream reading for large files - optimized
  async streamReadFile(file) {
    const chunkSize = 128 * 1024; // Increased to 128KB chunks for better performance
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const lines = [];
    let totalBytes = 0;
    const fileSize = file.size;
    let lastYield = 0;
    const YIELD_INTERVAL = 50; // Yield every 50ms

    const startTime = performance.now();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process lines more efficiently
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        lines.push(buffer.substring(0, newlineIndex));
        buffer = buffer.substring(newlineIndex + 1);
      }

      // Update progress less frequently for better performance
      if (totalBytes % (512 * 1024) === 0) { // Update every 512KB
        const progress = Math.round((totalBytes / fileSize) * 100);
        this.updateProgress(progress);
      }

      // Smart yielding based on time
      const now = performance.now();
      if (now - lastYield > YIELD_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, 0));
        lastYield = now;
      }
    }

    // Add remaining buffer
    if (buffer) {
      lines.push(buffer);
    }

    const loadTime = performance.now() - startTime;
    console.log(`Loaded ${lines.length} lines in ${loadTime.toFixed(2)}ms`);
    
    return lines;
  }

  // Update progress indicator
  updateProgress(percent) {
    const progressText = document.getElementById('progressText');
    if (progressText) {
      progressText.textContent = `${percent}%`;
    }
  }

  // Optimized display with virtual rendering - improved
  displayData(){
    if (!this.currentLines.length) return;
    
    const dataContainer = document.getElementById('databaseContent');
    if (!dataContainer) return;
    
    const startTime = performance.now();
    
    // Clear container
    dataContainer.innerHTML = '';
    
    // Create table structure once
    const table = document.createElement('table');
    table.className = 'database-table';
    const tbody = document.createElement('tbody');
    
    // Optimize based on file size
    const totalLines = this.currentLines.length;
    const CHUNK_SIZE = totalLines > 10000 ? 10000 : 5000;
    
    // Pre-allocate array for better performance
    const rows = [];
    
    // Process all rows first (faster than DOM ops)
    for (let i = 0; i < totalLines; i++) {
      const line = this.currentLines[i];
      if (!line.trim()) continue;
      
      // Fast split without map for better performance
      const parts = line.split('|');
      const values = [];
      
      // Manual trim and filter
      for (let j = 0; j < parts.length; j++) {
        const trimmed = parts[j].trim();
        if (trimmed || j < parts.length - 1) {
          values.push(trimmed);
        }
      }
      
      // Remove trailing empty values
      while (values.length > 0 && values[values.length - 1] === '') {
        values.pop();
      }
      
      // Create row HTML as string (much faster)
      let rowHTML = '<tr>';
      for (let j = 0; j < values.length; j++) {
        const value = values[j];
        const title = value.length > 30 ? ` title="${value.replace(/"/g, '&quot;')}"` : '';
        rowHTML += `<td${title}>${value}</td>`;
      }
      rowHTML += '</tr>';
      
      rows.push(rowHTML);
    }
    
    // Batch insert all rows
    tbody.innerHTML = rows.join('');
    table.appendChild(tbody);
    dataContainer.appendChild(table);
    
    // Performance metrics
    const renderTime = performance.now() - startTime;
    console.log(`Rendered ${totalLines} lines in ${renderTime.toFixed(2)}ms (${(renderTime/totalLines).toFixed(4)}ms per line)`);
    
    // Hide load more button if exists
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = 'none';
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
            html += `<div class="error-line">
              Line ${error.lineNumber}: ${escapeHtml(error.lineText)}
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
    
    // Optimized for large datasets
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.length === 0) continue;
      
      // Find first pipe character instead of split for better performance
      const pipeIndex = line.indexOf('|');
      if (pipeIndex === -1) continue;
      
      const cmpg = line.substring(0, pipeIndex).trim();
      if (cmpg) s.add(cmpg);
      
      // Yield to browser every 50000 lines to prevent blocking
      if (i % 50000 === 0 && i > 0) {
        // This allows UI to remain responsive
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
    // Use setTimeout to prevent blocking on large datasets
    setTimeout(() => {
      const uniqueCMPG = window.dbChecker.countUniqueCMPGIDs(window.dbChecker.currentLines);
      if (totalRowsEl) {
        totalRowsEl.textContent = uniqueCMPG.toLocaleString();
      }
    }, 0);
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
window.addEventListener('beforeunload', ()=>app.vs.destroy());
