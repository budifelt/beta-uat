
// ---- Extracted scripts from inline <script> blocks ----
// Initialize CodeMirror editor for htmlInput textarea
  const textarea = document.getElementById('htmlInput');
  const editor = CodeMirror.fromTextArea(textarea, {
    mode: 'htmlmixed',
    theme: 'material',
    lineNumbers: true,
    lineWrapping: true,
    autoCloseTags: true,
    matchBrackets: true,
  });

const originalUrlInput = document.getElementById('originalUrlInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const manualPasteBtn = document.getElementById('manualPasteBtn');
  const textModeBtn = document.getElementById('textModeBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  // const toggleKrhredBtn = document.getElementById('toggleKrhredBtn'); // REMOVED

  // Toast notification - using global toast manager
  function showToast(message, type = 'info') {
    if (type === 'success' && window.toastSuccess) {
      window.toastSuccess(message);
    } else if (type === 'error' && window.toastError) {
      window.toastError(message);
    } else if (type === 'warning' && window.toastWarning) {
      window.toastWarning(message);
    } else if (window.toastInfo) {
      window.toastInfo(message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Helper function to validate URL
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper function to validate URLholders <%[KRHRED_Unit_XX]|%> with textbox values or remove if empty
    const inputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    let hasValidKrhred = false;
    
    inputs.forEach(input => {
      const num = input.id.replace('krhred_unit_', '');
      const regex = new RegExp(`<%\\[KRHRED_Unit_${num}\\]\\|%>`, 'g');
      if (input.value && input.value.trim() !== '') {
        content = content.replace(regex, input.value);
        hasValidKrhred = true;
      } else {
        // Remove empty KRHRED placeholders completely
        content = content.replace(regex, '');
      }
    });
    
    if (!hasValidKrhred) {
      showToast('No KRHRED values to apply. Please fill in KRHRED values first.', 'warning');
      return;
    }
    
    // Fix image URLs to absolute URLs if original URL is provided
    const originalUrlValue = document.getElementById('originalUrlInput').value.trim();
    
    // Convert relative image URLs to absolute URLs
    let processedContent = content;
    if (originalUrlValue) {
      try {
        const baseUrl = new URL(originalUrlValue);
        const baseUrlString = baseUrl.origin + baseUrl.pathname.replace(/\/[^\/]*$/, '/');
        
        // Convert relative URLs to absolute
        processedContent = content.replace(/src="(?!https?:\/\/)([^"]+)"/g, (match, p1) => {
          const relativePath = p1.replace(/"/g, '');
          // Don't convert if already absolute, data URL, or protocol-relative
          if (!relativePath.match(/^(https?:\/\/|data:|\/\/)/)) {
            return `src="${baseUrlString}${relativePath}"`;
          }
          return match;
        });
        
        // Convert href attributes
        processedContent = processedContent.replace(/href="(?!https?:\/\/)([^"]+)"/g, (match, p1) => {
          const relativePath = p1.replace(/"/g, '');
          // Don't convert if already absolute, data URL, or protocol-relative
          if (!relativePath.match(/^(https?:\/\/|data:|\/\/)/)) {
            return `href="${baseUrlString}${relativePath}"`;
          }
          return match;
        });
      } catch (error) {
        console.log('Error processing URLs:', error);
        processedContent = content; // Fallback to original content
      }
    }
    
    // Save content as a Blob and open in new tab
    const blob = new Blob([processedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    if (statusDiv) { statusDiv.textContent = ''; statusDiv.id = ''; }
  });

  addKrhredBtn.addEventListener('click', () => {
    // Find the highest current krhred_unit number
    const inputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    let maxNum = 29;
    inputs.forEach(input => {
      const num = parseInt(input.id.replace('krhred_unit_', ''), 10);
      if (num > maxNum) maxNum = num;
    });
    const newNum = maxNum + 1;

    // Get input grid container
    const inputGrid = krhredUnitsContainer.querySelector('#inputGrid');
    if (!inputGrid) return;

    // Calculate position for 4 columns, unlimited rows
    const totalExisting = inputs.length; // Should be 8 initially
    const columnIndex = totalExisting % 4; // Which column (0-3)
    const rowIndex = Math.floor(totalExisting / 4); // Which row (0, 1, 2, etc.)

    // Create new input
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'flex-start';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `krhred_unit_${newNum}`;
    input.name = `krhred_unit_${newNum}`;
    input.placeholder = newNum.toString();
    div.appendChild(input);

    // Insert in correct position for 4 columns layout
    const existingDivs = inputGrid.querySelectorAll('div');
    const insertIndex = rowIndex * 4 + columnIndex;
    
    if (insertIndex < existingDivs.length) {
      inputGrid.insertBefore(div, existingDivs[insertIndex]);
    } else {
      inputGrid.appendChild(div);
    }

    // Add input color feedback
    input.addEventListener('input', () => {
      const length = input.value.trim().length;
      if (length > 60) {
        input.style.backgroundColor = 'red';
      } else if (length > 0) {
        input.style.backgroundColor = 'lightgreen';
      } else {
        input.style.backgroundColor = '';
      }
      saveState();
    });

    // Add auto-save event listener
    input.addEventListener('input', saveState);

    // Show success message
    showToast(`Added krhred_unit_${newNum} in 4-column layout`, 'success');
  });

  // Input color feedback for existing inputs
  const existingInputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
  existingInputs.forEach(input => {
    input.addEventListener('input', () => {
      const length = input.value.trim().length;
      if (length > 60) {
        input.style.backgroundColor = 'red';
      } else if (length > 0) {
        input.style.backgroundColor = 'lightgreen';
      } else {
        input.style.backgroundColor = '';
      }
    });
  });

  // Show/hide download button based on URL input
  originalUrlInput.addEventListener('input', () => {
    if (originalUrlInput.value.trim()) {
      downloadBtn.style.display = 'flex';
      manualPasteBtn.style.display = 'flex';
      textModeBtn.style.display = 'flex';
      // Auto-trigger download after a short delay if URL looks valid
      const url = originalUrlInput.value.trim();
      if (isValidUrl(url)) {
        setTimeout(() => {
          if (originalUrlInput.value.trim() === url) {
            downloadBtn.click();
          }
        }, 0);
      }
    } else {
      downloadBtn.style.display = 'none';
      manualPasteBtn.style.display = 'none';
      textModeBtn.style.display = 'none';
    }
  });

  // Manual paste button functionality
  manualPasteBtn.addEventListener('click', () => {
    const url = originalUrlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL first.', 'error');
      return;
    }
    
    // Open URL in new tab and show instructions
    window.open(url, '_blank');
    localStorage.setItem('layoutCheckerURL', url);
    showToast('Page opened in new tab. Please copy source code (Ctrl+U or Right-click → View Page Source) and paste it here.', 'info');
    
    // Focus HTML editor
    editor.focus();
  });

  // Toggle Manual functionality - REMOVED but button kept for future
  // toggleKrhredBtn.addEventListener('click', () => {
  //   const container = krhredUnitsContainer;
  //   const inputGrid = container.querySelector('.input-grid');
  //   
  //   if (inputGrid.style.display === 'none') {
  //     inputGrid.style.display = 'grid';
  //     toggleKrhredBtn.innerHTML = `
  //       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
  //         <path d="M12 15.5A3.5 3.5 0 0 1 5 0l-3.5-3.5z"/>
  //       </svg>
  //       Hide Manual
  //     `;
  //     showToast('Manual mode enabled', 'success');
  //   } else {
  //     inputGrid.style.display = 'none';
  //     toggleKrhredBtn.innerHTML = `
  //       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
  //         <path d="M12 15.5A3.5 3.5 0 0 1 5 0l-3.5-3.5z"/>
  //       </svg>
  //       Show Manual
  //     `;
  //     showToast('Manual mode disabled', 'info');
  //   }
  // });

  // Text mode button functionality
  textModeBtn.addEventListener('click', () => {
    const url = originalUrlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL first.', 'error');
      return;
    }
    
    // Try to fetch as plain text (some servers allow this)
    showToast('Attempting to fetch as plain text...', 'info');
    
    fetch(url, {
      headers: {
        'Accept': 'text/plain,text/html,*/*;q=0.8'
      }
    }).then(response => {
      if (response.ok) {
        return response.text();
      }
      throw new Error('Failed to fetch');
    }).then(content => {
      if (content && content.includes('<html')) {
        editor.setValue(content);
        // generateKrhredColumns will be called by editor.on('change') event
        showToast('Content fetched successfully in text mode!', 'success');
      } else {
        throw new Error('Invalid content received');
      }
    }).catch(error => {
      showToast('Text mode failed. Please use manual paste option.', 'warning');
      console.log('Text mode error:', error);
    });
  });

  // Helper function to validate URL
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Function to detect krhred_unit_xx in HTML and generate columns
  function generateKrhredColumns(htmlContent) {
    // DEBUG: Log function start
    console.log('=== generateKrhredColumns START ===');
    console.log('HTML content length:', htmlContent.length);
    console.log('HTML content preview:', htmlContent.substring(0, 200) + '...');
    
    // Find all krhred_unit_xx patterns in HTML
    const regex = /<%\[KRHRED_Unit_(\d+)\]\|%>/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(htmlContent)) !== null) {
      const unitNumber = parseInt(match[1], 10);
      if (!matches.includes(unitNumber)) {
        matches.push(unitNumber);
      }
    }
    
    // DEBUG: Log regex matches
    console.log('Regex matches found:', matches);
    console.log('Matches sorted:', matches.sort((a, b) => a - b));
    
    // Sort matches
    matches.sort((a, b) => a - b);
    
    // Get input grid container
    const inputGrid = krhredUnitsContainer.querySelector('#inputGrid');
    if (!inputGrid) {
      console.log('ERROR: inputGrid not found!');
      return;
    }
    
    // DEBUG: Log grid container
    console.log('Input grid container found:', inputGrid);
    
    // Get existing krhred inputs (don't clear them)
    const currentInputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    const existingNumbers = Array.from(currentInputs).map(input => 
      parseInt(input.id.replace('krhred_unit_', ''), 10)
    );
    
    // DEBUG: Log existing inputs
    console.log('Existing inputs found:', existingNumbers);
    console.log('Existing input elements:', currentInputs.length);
    
    // Remove units that are not in the HTML (including default units if not in HTML)
    currentInputs.forEach(input => {
      const unitNumber = parseInt(input.id.replace('krhred_unit_', ''), 10);
      if (!matches.includes(unitNumber)) {
        console.log(`Removing unit ${unitNumber} - not in HTML`);
        input.parentElement.remove();
      }
    });
    
    // Add new units that are in HTML but don't exist
    matches.forEach((unitNumber, index) => {
      if (!existingNumbers.includes(unitNumber)) {
        // DEBUG: Log each unit creation
        console.log(`Creating unit ${unitNumber} at index ${index}`);
        
        // Calculate position for 4x2 grid (8 units per row)
        const rowPosition = Math.floor(index / 8); // Which row (0-indexed)
        const columnPosition = index % 8; // Which position in row (0-7)
        const gridColumn = Math.floor(columnPosition / 2); // Which column (0-3)
        const gridRow = Math.floor(columnPosition / 2); // Which row in column (0-1)
        
        // DEBUG: Log positioning calculation
        console.log(`Unit ${unitNumber}: rowPosition=${rowPosition}, columnPosition=${columnPosition}, gridColumn=${gridColumn}, gridRow=${gridRow}`);
        
        // Create new input
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `krhred_unit_${unitNumber}`;
        input.name = `krhred_unit_${unitNumber}`;
        input.placeholder = unitNumber.toString();
        div.appendChild(input);
        inputGrid.appendChild(div);
        
        // Add input color feedback
        input.addEventListener('input', () => {
          const length = input.value.trim().length;
          if (length > 60) {
            input.style.backgroundColor = 'red';
          } else if (length > 0) {
            input.style.backgroundColor = 'lightgreen';
          } else {
            input.style.backgroundColor = '';
          }
          saveState();
        });
        
        // Add auto-save event listener
        input.addEventListener('input', saveState);
      } else {
        // DEBUG: Log skipped units
        console.log(`Skipping unit ${unitNumber} - already exists`);
      }
    });
    
    // DEBUG: Log final state
    const finalInputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    console.log('Final input count:', finalInputs.length);
    console.log('=== generateKrhredColumns END ===');
    
    // Show combined toast notification for HTML fetch and KRHRED units found
    if (matches.length > 0) {
      console.log(`Generated ${matches.length} krhred_unit columns:`, matches);
      showToast(`HTML fetched! Found ${matches.length} KRHRED units: ${matches.join(', ')}`, 'success');
    } else {
      showToast('HTML fetched! No KRHRED units found. Showing default layout.', 'info');
    }
  }

  // Download and auto-paste HTML source code
  downloadBtn.addEventListener('click', async () => {
    const url = originalUrlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL first.', 'error');
      return;
    }

    try {
      // Show loading state
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; animation: spin 1s linear infinite;"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>Fetching...';

      // List of working CORS proxy servers - prioritized by reliability
      const corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://r.jina.ai/http://', // Jina AI proxy - very reliable
        'https://r.jina.ai/https://', // Jina AI proxy for HTTPS
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=', // Alternative allorigins endpoint
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/'
      ];

      let htmlContent = null;
      let usedProxy = null;
      let lastError = null;

      // Try direct fetch first with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          htmlContent = await response.text();
          usedProxy = 'direct';
        }
      } catch (directError) {
        console.log('Direct fetch failed, trying proxies...');
        lastError = directError;
      }

      // If direct fetch failed, try CORS proxies sequentially (not parallel to avoid rate limits)
      if (!htmlContent) {
        for (let i = 0; i < corsProxies.length; i++) {
          const proxy = corsProxies[i];
          
          try {
            console.log(`Trying proxy ${i + 1}/${corsProxies.length}: ${proxy}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per proxy
            
            let proxyUrl;
            let response;
            
            // Special handling for different proxy formats
            if (proxy.includes('r.jina.ai')) {
              // Jina AI proxy - remove protocol from URL first
              const cleanUrl = url.replace(/^https?:\/\//, '');
              proxyUrl = proxy + cleanUrl;
              response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
            } else if (proxy.includes('raw?url=')) {
              // Raw endpoint
              proxyUrl = proxy + encodeURIComponent(url);
              response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
            } else {
              // Standard proxy
              proxyUrl = proxy + encodeURIComponent(url);
              response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
            }
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              let content;
              if (proxy.includes('allorigins')) {
                const data = await response.json();
                content = data.contents || data.contents;
              } else {
                content = await response.text();
              }
              
              // Validate content
              if (content && content.length > 100 && (content.includes('<') || content.includes('<html'))) {
                htmlContent = content;
                usedProxy = proxy;
                console.log(`Success with proxy: ${proxy}`);
                break;
              } else {
                console.log(`Proxy returned invalid content (${content?.length || 0} chars): ${proxy}`);
              }
            } else {
              console.log(`Proxy returned status ${response.status}: ${proxy}`);
              // If proxy returns 403, it might be blocked for this domain
              if (response.status === 403) {
                console.log(`Proxy blocked for this domain: ${proxy}`);
              }
            }
          } catch (proxyError) {
            console.log(`Proxy ${proxy} failed:`, proxyError.message);
            lastError = proxyError;
            continue;
          }
        }
      }

      if (htmlContent) {
        editor.setValue(htmlContent);
        // generateKrhredColumns will be called by editor.on('change') event
        
        // No toast here - generateKrhredColumns will show the notification
      } else {
        throw new Error(lastError?.message || 'All fetch attempts failed');
      }

    } catch (error) {
      console.error('Error fetching HTML:', error);
      
      // Try to open in new tab as fallback
      try {
        window.open(url, '_blank');
        localStorage.setItem('layoutCheckerURL', url);
        showToast('Unable to fetch automatically. Page opened in new tab. Please copy the source code manually.\n\nTip: Right-click → View Page Source or press Ctrl+U', 'warning');
      } catch (fallbackError) {
        showToast('Error: Unable to fetch the HTML content. Please copy the source code manually from the URL and paste it here.', 'error');
      }
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Download';
    }
  });

  // Apply krhred values functionality
  const applyKrhredBtn = document.getElementById('applyKrhredBtn');
  const krhredInput = document.getElementById('krhredInput');

  applyKrhredBtn.addEventListener('click', () => {
    const krhredText = krhredInput.value.trim();
    if (!krhredText) {
      showToast('Please paste krhred values first.', 'error');
      return;
    }

    // Parse krhred values in new format: attr:KRHRED_Unit_XX : <next line value>
    const lines = krhredText.split('\n');
    const krhredValues = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('attr:KRHRED_Unit_')) {
        const key = line.replace('attr:', '').replace(' :', '');
        const value = lines[i + 1] ? lines[i + 1].trim() : '';
        krhredValues[key] = value;
        i++; // skip value line
      }
    }

    // Apply values to corresponding input fields
    Object.keys(krhredValues).forEach(key => {
      const unitNumber = key.replace('KRHRED_Unit_', '');
      const inputField = document.getElementById(`krhred_unit_${unitNumber}`);
      if (inputField) {
        inputField.value = krhredValues[key];
        inputField.dispatchEvent(new Event('input')); // color update
      }
    });

    saveState();
  });

  // Clear All functionality
  clearAllBtn.addEventListener('click', () => {
    showConfirmModal(
      'Are you sure you want to clear all data? This action cannot be undone.',
      () => {
        performClearAll();
        showToast('All data cleared successfully!', 'success');
      },
      () => {
        showToast('Clear action cancelled.', 'info');
      }
    );
  });

  function performClearAll() {
    // Reset krhredUnitsContainer to initial state
    const inputGrid = krhredUnitsContainer.querySelector('#inputGrid');
    if (inputGrid) {
      // Clear all inputs completely
      inputGrid.innerHTML = '';
      
      // Recreate initial 8 units (30-37) with proper structure
      const initialUnits = [
        { id: 30, placeholder: '30' },
        { id: 31, placeholder: '31' },
        { id: 32, placeholder: '32' },
        { id: 33, placeholder: '33' },
        { id: 34, placeholder: '34' },
        { id: 35, placeholder: '35' },
        { id: 36, placeholder: '36' },
        { id: 37, placeholder: '37' }
      ];
      
      initialUnits.forEach((unit, index) => {
        // Create wrapper div
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        
        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `krhred_unit_${unit.id}`;
        input.name = `krhred_unit_${unit.id}`;
        input.placeholder = unit.placeholder;
        
        // Add to DOM
        div.appendChild(input);
        inputGrid.appendChild(div);
        
        // Add input color feedback
        input.addEventListener('input', () => {
          const length = input.value.trim().length;
          if (length > 60) {
            input.style.backgroundColor = 'red';
          } else if (length > 0) {
            input.style.backgroundColor = 'lightgreen';
          } else {
            input.style.backgroundColor = '';
          }
          saveState();
        });
        
        // Add auto-save event listener
        input.addEventListener('input', saveState);
      });
    }

    // Clear krhred textarea and HTML editor
    document.getElementById('krhredInput').value = '';
    editor.setValue('');

    // Clear URL & hide download button
    document.getElementById('originalUrlInput').value = '';
    document.getElementById('downloadBtn').style.display = 'none';
    document.getElementById('manualPasteBtn').style.display = 'none';
    document.getElementById('textModeBtn').style.display = 'none';

    // Remove saved state
    localStorage.removeItem('layoutChecker_state');
    localStorage.removeItem('layoutCheckerSource');
    localStorage.removeItem('layoutCheckerURL');
  }

  // Handle F5 refresh with confirmation
  let refreshTimer;
  window.addEventListener('beforeunload', (e) => {
    const hasData = editor.getValue().trim() || 
                   document.getElementById('krhredInput').value.trim() ||
                   document.querySelectorAll('input[id^="krhred_unit_"]').some(input => input.value.trim());
    
    if (hasData) {
      e.preventDefault();
      e.returnValue = 'You have unsaved data. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  // Handle keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    // F5 or Ctrl+R
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      const hasData = editor.getValue().trim() || 
                     document.getElementById('krhredInput').value.trim() ||
                     document.querySelectorAll('input[id^="krhred_unit_"]').some(input => input.value.trim());
      
      if (hasData) {
        e.preventDefault();
        showConfirmModal(
          'You have unsaved data. Are you sure you want to refresh and clear everything?',
          () => {
            performClearAll();
            showToast('Data cleared. Refreshing page...', 'info');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          },
          () => {
            showToast('Refresh cancelled.', 'info');
          }
        );
      }
    }
  });

  // Check for stored source when page loads
  window.addEventListener('load', () => {
    const storedSource = localStorage.getItem('layoutCheckerSource');
    const storedURL = localStorage.getItem('layoutCheckerURL');

    if (storedSource) {
      editor.setValue(storedSource);
      // generateKrhredColumns will be called by editor.on('change') event
      if (storedURL) {
        originalUrlInput.value = storedURL;
        downloadBtn.style.display = 'flex';
        manualPasteBtn.style.display = 'flex';
      }
      showToast('Source code automatically pasted from previous page!', 'success');
    }
    localStorage.removeItem('layoutCheckerSource');
    localStorage.removeItem('layoutCheckerURL');
  });

  // State persistence - simple approach
  function saveState() {
    const state = {
      htmlContent: editor.getValue(),
      originalUrl: document.getElementById('originalUrlInput').value,
      krhredValues: {}
    };
    const krhredInputs = document.querySelectorAll('input[id^="krhred_unit_"]');
    krhredInputs.forEach(input => {
      state.krhredValues[input.id] = input.value;
    });
    localStorage.setItem('layoutChecker_state', JSON.stringify(state));
  }

  function loadState() {
    const saved = localStorage.getItem('layoutChecker_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.htmlContent) { 
          editor.setValue(state.htmlContent);
          // generateKrhredColumns will be called by editor.on('change') event
        }
        if (state.originalUrl) {
          document.getElementById('originalUrlInput').value = state.originalUrl;
          document.getElementById('downloadBtn').style.display = 'flex';
          document.getElementById('manualPasteBtn').style.display = 'flex';
        }
        if (state.krhredValues) {
          Object.keys(state.krhredValues).forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
              input.value = state.krhredValues[inputId];
              input.dispatchEvent(new Event('input'));
            }
          });
        }
      } catch (e) {
        console.error('Error loading state:', e);
      }
    }
  }

  // Auto-save on input changes
  editor.on('change', () => {
    const content = editor.getValue();
    if (content.trim()) {
      generateKrhredColumns(content);
    }
    saveState();
  });
  document.getElementById('originalUrlInput').addEventListener('input', saveState);
  document.getElementById('krhredInput').addEventListener('input', saveState);

  // Profile dropdown functionality
  function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (menu.style.visibility === 'visible') {
      menu.style.opacity = '0';
      menu.style.visibility = 'hidden';
      menu.style.transform = 'translateY(-10px)';
    } else {
      menu.style.opacity = '1';
      menu.style.visibility = 'visible';
      menu.style.transform = 'translateY(0)';
    }
  }
  
  // Note: Login modal functions are now handled by modal-manager.js

  // Tab switching functionality
  function showLoginTab() {
    // Hide create user tab
    document.getElementById('create-user-tab').classList.remove('active');
    document.getElementById('create-user-tab-btn').classList.remove('active');
    
    // Show login tab
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('login-tab-btn').classList.add('active');
  }

  function showCreateUserTab() {
    // Hide login tab
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('login-tab-btn').classList.remove('active');
    
    // Show create user tab
    document.getElementById('create-user-tab').classList.add('active');
    document.getElementById('create-user-tab-btn').classList.add('active');
  }

  // Settings modal functionality - Optimized
  function showSettingsModal() {
    const modal = document.getElementById('modal-settings');
    const modalContent = modal.querySelector('div');
    
    // Show modal with animation
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modalContent.style.transform = 'scale(1)';
    });
    
    loadSettingsData();
    showSettingsSection('general'); // Show general section by default
  }

  function hideSettingsModal() {
    const modal = document.getElementById('modal-settings');
    const modalContent = modal.querySelector('div');
    
    // Hide modal with animation
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    modalContent.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }

  // Show specific settings section - Optimized
  function showSettingsSection(section) {
    // Use requestAnimationFrame for smooth transitions
    requestAnimationFrame(() => {
      // Hide all content sections
      const contents = document.querySelectorAll('.settings-section');
      contents.forEach(content => {
        content.style.display = 'none';
        content.style.opacity = '0';
      });
      
      // Remove active class from all tabs
      const tabs = document.querySelectorAll('.settings-tab-btn');
      tabs.forEach(tab => tab.classList.remove('active'));
      
      // Show selected section and activate tab
      const selectedContent = document.getElementById(section + '-content');
      const selectedTab = document.getElementById('tab-' + section);
      
      if (selectedContent) {
        selectedContent.style.display = 'block';
        requestAnimationFrame(() => {
          selectedContent.style.opacity = '1';
        });
      }
      
      if (selectedTab) {
        selectedTab.classList.add('active');
      }
      
      // Update title with icon
      const titles = {
        'general': { icon: 'fa-globe', text: 'Pengaturan Umum' },
        'appearance': { icon: 'fa-palette', text: 'Pengaturan Tampilan' },
        'account': { icon: 'fa-user', text: 'Pengaturan Akun' },
        'notifications': { icon: 'fa-bell', text: 'Pengaturan Notifikasi' },
        'privacy': { icon: 'fa-shield-halved', text: 'Pengaturan Privasi' },
        'advanced': { icon: 'fa-cog', text: 'Pengaturan Lanjutan' }
      };
      
      // Define buttons for each section
      const buttons = {
        'general': { icon: 'fa-palette', action: 'showSettingsSection(\'appearance\')' },
        'appearance': { icon: 'fa-user', action: 'showSettingsSection(\'account\')' },
        'account': { icon: 'fa-bell', action: 'showSettingsSection(\'notifications\')' },
        'notifications': { icon: 'fa-shield-halved', action: 'showSettingsSection(\'privacy\')' },
        'privacy': { icon: 'fa-cog', action: 'showSettingsSection(\'advanced\')' },
        'advanced': { icon: 'fa-cog', action: 'showSettingsSection(\'general\')' }
      };
      
      // Keep close button as is, don't change it
      // The close button will always be available in the header
      
      const titleElement = document.getElementById('settings-title');
      if (titleElement && titles[section]) {
        console.log('Updating title for section:', section);
        console.log('New title:', titles[section]);
        titleElement.innerHTML = `<i class="fa-solid ${titles[section].icon}"></i> ${titles[section].text}`;
        console.log('Title updated to:', titleElement.innerHTML);
      } else {
        console.log('Title element not found or section not in titles:', section, titleElement);
      }
    });
  }

  // Handle login
  function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    // Simple authentication logic (you can replace with real authentication)
    if (username && password) {
      // Store user data
      const userData = {
        username: username,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        role: 'user',
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('authToken', 'mock-token-' + Date.now());
      
      // Update UI
      updateProfileDisplay();
      hideLoginModal();
      
      showToast(`Welcome back, ${userData.name}!`, 'success');
    } else {
      showToast('Please enter username and password', 'error');
    }
  }

  // Handle logout
  function handleLogout() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      showToast(`Goodbye, ${user.name || user.username}!`, 'info');
    }
    
    // Clear any stored user data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    
    // Update UI
    updateProfileDisplay();
    
    // Close dropdown if open
    const menu = document.getElementById('profile-menu');
    menu.style.opacity = '0';
    menu.style.visibility = 'hidden';
    menu.style.transform = 'translateY(-10px)';
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.profile-section');
    if (!dropdown.contains(e.target)) {
      const menu = document.getElementById('profile-menu');
      if (menu) {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        menu.style.transform = 'translateY(-10px)';
      }
    }
  });

  // Check for logged in user and update profile display
  function updateProfileDisplay() {
    const currentUser = localStorage.getItem('currentUser');
    const loginBtn = document.getElementById('login-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileName = document.getElementById('profile-name');
    const menuProfileName = document.getElementById('menu-profile-name');
    
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        
        // Show profile dropdown, hide login button
        if (loginBtn) loginBtn.style.display = 'none';
        if (profileDropdown) {
          profileDropdown.style.display = 'block';
          profileDropdown.classList.remove('hidden');
        }
        
        // Update profile names
        if (profileName) profileName.textContent = user.name || user.username || 'User';
        if (menuProfileName) menuProfileName.textContent = user.name || user.username || 'User';
      } catch (e) {
        console.log('Error parsing user data:', e);
        // Fallback to guest state
        if (loginBtn) loginBtn.style.display = 'flex';
        if (profileDropdown) {
          profileDropdown.style.display = 'none';
          profileDropdown.classList.add('hidden');
        }
      }
    } else {
      // Show login button, hide profile dropdown
      if (loginBtn) loginBtn.style.display = 'flex';
      if (profileDropdown) {
        profileDropdown.style.display = 'none';
        profileDropdown.classList.add('hidden');
      }
      
      // Reset profile names
      if (profileName) profileName.textContent = 'Guest';
      if (menuProfileName) menuProfileName.textContent = 'Guest Account';
    }
  }

  // Initialize profile display on page load
  updateProfileDisplay();

  // Auto-save for existing krhred inputs
  const existingKrhredInputs = document.querySelectorAll('input[id^="krhred_unit_"]');
  existingKrhredInputs.forEach(input => {
    input.addEventListener('input', saveState);
  });

  // Make sure settings functions are available globally
  if (typeof window !== 'undefined') {
    window.showSettingsSection = showSettingsSection;
    window.hideSettingsModal = hideSettingsModal;
    
    // Define missing functions
    window.saveSettings = function() {
      console.log('Saving settings...');
      // Add save logic here
      hideSettingsModal();
    };
    
    window.resetSettings = function() {
      console.log('Resetting settings...');
      // Add reset logic here
      if (confirm('Are you sure you want to reset all settings to default?')) {
        // Reset logic
        showSettingsSection('general');
      }
    };
  }

  // Initialize settings on page load
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing settings...');
    // Show general section by default if settings modal exists
    if (document.getElementById('modal-settings')) {
      showSettingsSection('general');
    }
  });

  // Load state when page loads
  window.addEventListener('load', loadState);

  // Save state before leaving page
  window.addEventListener('beforeunload', saveState);
