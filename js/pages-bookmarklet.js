// Bookmarklet Tools - Regular JavaScript Version
class BookmarkletTools {
    constructor() {
        this.init();
    }
    
    init() {
        // Add event listeners for bookmarklet buttons
        this.setupEventListeners();
        this.initBookmarklets();
        this.initSearch();
        this.initViewToggle();
    }
    
    setupEventListeners() {
        // Copy Page Source
        document.getElementById('copy-source')?.addEventListener('click', () => {
            this.copyPageSource();
        });
        
        // Extract Links
        document.getElementById('extract-links')?.addEventListener('click', () => {
            this.extractLinks();
        });
        
        // Extract Images
        document.getElementById('extract-images')?.addEventListener('click', () => {
            this.extractImages();
        });
        
        // View Meta Tags
        document.getElementById('view-meta')?.addEventListener('click', () => {
            this.viewMetaTags();
        });
        
        // Remove Element
        document.getElementById('remove-element')?.addEventListener('click', () => {
            this.enableRemoveElement();
        });
        
        // Page Info
        document.getElementById('page-info')?.addEventListener('click', () => {
            this.showPageInfo();
        });
    }
    
    // Create bookmarklet links
    createBookmarklet(toolName, code) {
        // Minify the code for bookmarklet
        const minified = code.replace(/\s+/g, ' ').trim();
        const encoded = encodeURIComponent(minified);
        return `javascript:(function(){${encoded}})();`;
    }
    
    // Bookmarklet scripts
    getBookmarkletScripts() {
        return {
            'Copy Page Source': `(function(){
                fetch(location.href)
                .then(res => res.text())
                .then(source => {
                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(source)
                            .then(() => alert('✅ Source berhasil disalin!'))
                            .catch(() => fallbackCopy(source));
                    } else {
                        fallbackCopy(source);
                    }
                    
                    function fallbackCopy(text){
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        try {
                            document.execCommand('copy');
                            alert('✅ Source berhasil disalin!');
                        } catch(err) {
                            console.error('Gagal menyalin:', err);
                            prompt('Copy manual:', text);
                        }
                        document.body.removeChild(ta);
                    }
                })
                .catch(err => console.error('❌ Gagal mengambil source:', err));
            })();`,
            
            'Extract All Links': `(function(){
                const links = Array.from(document.querySelectorAll('a')).map(a => ({
                    text: a.innerText.trim(),
                    href: a.href,
                    target: a.target || '_self'
                }));
                
                const result = links.map((link, i) => 
                    \`\${i+1}. \${link.text}\\n   URL: \${link.href}\\n   Target: \${link.target}\`
                ).join('\\n\\n');
                
                const w = window.open('', '_blank');
                w.document.write(\`
                    <html>
                    <head><title>Extracted Links</title></head>
                    <body>
                        <pre>\${result}</pre>
                        <button onclick="navigator.clipboard.writeText(\\'\${result.replace(/'/g, "\\\\'")}\\').then(() => alert('Copied!'))">Copy to Clipboard</button>
                    </body>
                    </html>
                \`);
            })();`,
            
            'Extract Images': `(function(){
                const images = Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src);
                
                const result = images.map((src, i) => \`\${i+1}. \${src}\`).join('\\n');
                
                const w = window.open('', '_blank');
                w.document.write(\`
                    <html>
                    <head><title>Extracted Images</title></head>
                    <body>
                        <pre>\${result}</pre>
                        <button onclick="navigator.clipboard.writeText(\\'\${result.replace(/'/g, "\\\\'")}\\').then(() => alert('Copied!'))">Copy to Clipboard</button>
                    </body>
                    </html>
                \`);
            })();`,
            
            'View Meta Tags': `(function(){
                const metas = Array.from(document.querySelectorAll('meta'));
                let output = '=== META TAGS ===\\n\\n';
                
                metas.forEach(meta => {
                    const name = meta.name || meta.property || meta.httpEquiv || 'charset';
                    const content = meta.content || meta.charset || '';
                    output += \`\${name}: \${content}\\n\`;
                });
                
                const w = window.open('', '_blank');
                w.document.write(\`
                    <html>
                    <head><title>Meta Tags</title></head>
                    <body>
                        <pre>\${output}</pre>
                        <button onclick="navigator.clipboard.writeText(\\'\${output.replace(/'/g, "\\\\'")}\\').then(() => alert('Copied!'))">Copy to Clipboard</button>
                    </body>
                    </html>
                \`);
            })();`,
            
            'Remove Element': `(function(){
                document.body.style.cursor = 'crosshair';
                
                function removeElement(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    if (e.target === document.body) return;
                    
                    e.target.remove();
                    
                    document.body.style.cursor = '';
                    document.removeEventListener('click', removeElement, true);
                    alert('Element removed!');
                }
                
                document.addEventListener('click', removeElement, true);
                
                const instruction = document.createElement('div');
                instruction.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #333;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    z-index: 10000;
                    font-size: 14px;
                \`;
                instruction.textContent = 'Click any element to remove it';
                document.body.appendChild(instruction);
                
                setTimeout(() => instruction.remove(), 3000);
            })();`,
            
            'Page Info': `(function(){
                const info = {
                    title: document.title,
                    url: location.href,
                    domain: location.hostname,
                    protocol: location.protocol,
                    path: location.pathname,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    cookies: document.cookie ? 'Enabled' : 'Disabled',
                    localStorage: Object.keys(localStorage).length + ' items',
                    sessionStorage: Object.keys(sessionStorage).length + ' items'
                };
                
                const output = Object.entries(info)
                    .map(([key, value]) => \`\${key.charAt(0).toUpperCase() + key.slice(1)}: \${value}\`)
                    .join('\\n');
                
                const w = window.open('', '_blank');
                w.document.write(\`
                    <html>
                    <head><title>Page Information</title></head>
                    <body>
                        <pre>\${output}</pre>
                        <button onclick="navigator.clipboard.writeText(\\'\${output.replace(/'/g, "\\\\'")}\\').then(() => alert('Copied!'))">Copy to Clipboard</button>
                    </body>
                    </html>
                \`);
            });`
        };
    }
    
    // Initialize bookmarklet buttons
    initBookmarklets() {
        const buttons = document.querySelectorAll('.bookmarklet-btn');
        const scripts = this.getBookmarkletScripts();
        
        buttons.forEach(button => {
            const toolName = button.getAttribute('data-tool');
            if (toolName && scripts[toolName]) {
                // Create bookmarklet href
                const bookmarkletUrl = this.createBookmarklet(toolName, scripts[toolName]);
                
                // Make the button draggable
                button.setAttribute('href', bookmarkletUrl);
                button.setAttribute('draggable', 'true');
                
                // Add drag event listeners
                button.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/uri-list', bookmarkletUrl);
                    e.dataTransfer.setData('text/plain', bookmarkletUrl);
                    e.dataTransfer.effectAllowed = 'copy';
                });
                
                // Prevent default click behavior
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Show instructions
                    this.showBookmarkletInstructions(toolName, bookmarkletUrl);
                });
            }
        });
    }
    
    // Show bookmarklet instructions
    showBookmarkletInstructions(toolName, url) {
        const modal = document.createElement('div');
        modal.className = 'bookmarklet-instructions-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                <h3 style="margin-top: 0;">How to install ${toolName} bookmarklet</h3>
                <p style="margin-bottom: 20px;">Drag the button below to your bookmark bar:</p>
                <a href="${url}" draggable="true" style="
                    display: inline-block;
                    padding: 10px 20px;
                    background: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    cursor: move;
                    margin-bottom: 20px;
                ">${toolName}</a>
                <p style="font-size: 14px; color: #666;">Or right-click and choose "Add to Bookmarks"</p>
                <button onclick="this.closest('.bookmarklet-instructions-modal').remove()" style="
                    padding: 8px 16px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Make the bookmarklet in modal draggable
        const bookmarkletLink = modal.querySelector('a[href^="javascript:"]');
        if (bookmarkletLink) {
            bookmarkletLink.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/uri-list', url);
                e.dataTransfer.setData('text/plain', url);
                e.dataTransfer.effectAllowed = 'copy';
            });
        }
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Search functionality
    initSearch() {
        const searchInput = document.getElementById('bookmarkletSearch');
        const clearBtn = document.querySelector('.clear-search-btn');
        const cards = document.querySelectorAll('.bookmarklet-card');
        const noResults = document.getElementById('noResults');
        
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            let visibleCount = 0;
            
            cards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(query) || description.includes(query)) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Show/hide no results message
            if (noResults) {
                noResults.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        });
        
        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            });
        }
    }
    
    // Grid/List view toggle
    initViewToggle() {
        const toggleBtn = document.querySelector('.toggle-view-btn');
        const grid = document.getElementById('bookmarkletsGrid');
        
        if (!toggleBtn || !grid) return;
        
        toggleBtn.addEventListener('click', () => {
            if (toggleBtn.textContent.includes('Grid')) {
                grid.classList.remove('list-view');
                toggleBtn.innerHTML = '<i class="fa-solid fa-grip"></i> Grid';
            } else {
                grid.classList.add('list-view');
                toggleBtn.innerHTML = '<i class="fa-solid fa-list"></i> List';
            }
        });
    }
    
    // Copy manual script
    copyManualScript() {
        const textarea = document.getElementById('manual-script');
        if (!textarea) return;
        
        textarea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copy-script-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }
    }
    
    // Copy Page Source
    async copyPageSource() {
        try {
            const response = await fetch(location.href);
            const source = await response.text();
            
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(source);
                this.showToast('Source code copied to clipboard!', 'success');
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = source;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('Source code copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error copying source:', error);
            this.showToast('Failed to copy source code', 'error');
        }
    }
    
    // Extract All Links
    extractLinks() {
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href,
            target: a.target || '_self'
        }));
        
        const result = links.map((link, i) => 
            `${i+1}. ${link.text}\n   URL: ${link.href}\n   Target: ${link.target}`
        ).join('\n\n');
        
        this.showResult('Extracted Links', result);
    }
    
    // Extract Images
    extractImages() {
        const images = Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src);
        
        const result = images.map((src, i) => 
            `${i+1}. ${src}`
        ).join('\n');
        
        this.showResult('Extracted Images', result);
    }
    
    // View Meta Tags
    viewMetaTags() {
        const metas = Array.from(document.querySelectorAll('meta'));
        let output = '=== META TAGS ===\n\n';
        
        metas.forEach(meta => {
            const name = meta.name || meta.property || meta.httpEquiv || 'charset';
            const content = meta.content || meta.charset || '';
            output += `${name}: ${content}\n`;
        });
        
        this.showResult('Meta Tags', output);
    }
    
    // Enable Remove Element Mode
    enableRemoveElement() {
        document.body.style.cursor = 'crosshair';
        
        function removeElement(e) {
            e.stopPropagation();
            e.preventDefault();
            
            if (e.target === document.body) return;
            
            e.target.remove();
            
            // Clean up
            document.body.style.cursor = '';
            document.removeEventListener('click', removeElement, true);
            
            if (window.showToast) {
                window.showToast('success', 'Element Removed', 'Element removed successfully!');
            } else {
                alert('Element removed!');
            }
        }
        
        document.addEventListener('click', removeElement, true);
        
        // Add cancel instruction
        const instruction = document.createElement('div');
        instruction.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
        `;
        instruction.textContent = 'Click any element to remove it';
        document.body.appendChild(instruction);
        
        setTimeout(() => instruction.remove(), 3000);
    }
    
    // Show Page Info
    showPageInfo() {
        const info = {
            title: document.title,
            url: location.href,
            domain: location.hostname,
            protocol: location.protocol,
            path: location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookies: document.cookie ? 'Enabled' : 'Disabled',
            localStorage: Object.keys(localStorage).length + ' items',
            sessionStorage: Object.keys(sessionStorage).length + ' items'
        };
        
        const output = Object.entries(info)
            .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
            .join('\n');
        
        this.showResult('Page Information', output);
    }
    
    // Show result in modal or alert
    showResult(title, content) {
        // Check if modal exists
        const modal = document.getElementById('result-modal');
        if (modal) {
            document.getElementById('result-title').textContent = title;
            document.getElementById('result-content').textContent = content;
            modal.classList.add('active');
        } else {
            // Fallback to console
            console.log(`${title}:\n\n${content}`);
            
            // Try to copy to clipboard
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(content);
                this.showToast('Result copied to clipboard!', 'success');
            } else {
                // Show in alert as last resort
                alert(`${title}:\n\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`);
            }
        }
    }
    
    // Show toast notification - using global toast manager
    showToast(message, type = 'info') {
        // Use global toast system if available
        if (type === 'success' && window.toastSuccess) {
            window.toastSuccess(message, 'Bookmarklet');
            return;
        } else if (type === 'error' && window.toastError) {
            window.toastError(message, 'Bookmarklet');
            return;
        } else if (type === 'warning' && window.toastWarning) {
            window.toastWarning(message, 'Bookmarklet');
            return;
        } else if (window.toastInfo) {
            window.toastInfo(message, 'Bookmarklet');
            return;
        }
        
        // Fallback - create simple toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize bookmarklet tools
    window.bookmarkletTools = new BookmarkletTools();
    
    // Expose copyManualScript globally
    window.copyManualScript = () => window.bookmarkletTools.copyManualScript();
    
    // Track bookmarklet usage analytics
    const trackBookmarkletClick = (toolName) => {
        console.log(`Bookmarklet tool clicked: ${toolName}`);
    };
    
    // Add click tracking to bookmarklet buttons
    const bookmarkletBtns = document.querySelectorAll('.bookmarklet-btn, .tool-btn');
    bookmarkletBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const toolName = this.getAttribute('data-tool') || this.closest('.bookmarklet-card, .tool-card')?.querySelector('h3')?.textContent || 'Unknown';
            trackBookmarkletClick(toolName);
        });
        
        // Prevent default drag behavior
        btn.addEventListener('dragstart', function(e) {
            // Allow default drag behavior for bookmarklets
        });
    });
});