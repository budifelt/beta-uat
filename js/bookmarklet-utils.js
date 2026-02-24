// Copy manual script to clipboard
function copyManualScript() {
    const textarea = document.getElementById('manual-script');
    const btn = document.getElementById('copy-script-btn');
    const originalHTML = btn.innerHTML;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textarea.value)
            .then(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Copied!</span>';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            })
            .catch(() => fallbackCopy(textarea.value));
    } else {
        fallbackCopy(textarea.value);
    }
    
    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Copied!</span>';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            btn.innerHTML = '<i class="fa-solid fa-times"></i><span>Failed!</span>';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }
        
        document.body.removeChild(textarea);
    }
}

// Search and Filter Functionality - Optimized
function clearSearch() {
    document.getElementById('bookmarkletSearch').value = '';
    filterBookmarklets();
}

// Cache DOM elements for better performance
let bookmarkletCards = null;
let noResults = null;

function filterBookmarklets() {
    // Lazy initialization of cached elements
    if (!bookmarkletCards) {
        bookmarkletCards = document.querySelectorAll('.bookmarklet-card');
    }
    if (!noResults) {
        noResults = document.getElementById('noResults');
    }
    
    const searchTerm = document.getElementById('bookmarkletSearch').value.toLowerCase();
    let visibleCount = 0;
    
    // Use requestAnimationFrame for smoother filtering
    requestAnimationFrame(() => {
        bookmarkletCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
                // Remove animation to reduce CPU load
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide no results message
        noResults.style.display = visibleCount === 0 && searchTerm !== '' ? 'block' : 'none';
    });
}

// Toggle view mode
function toggleView(btn) {
    const grid = document.getElementById('bookmarklet-grid');
    if (grid.classList.contains('grid-view')) {
        grid.classList.remove('grid-view');
        grid.classList.add('list-view');
        btn.innerHTML = '<i class="fa-solid fa-list"></i> List';
    } else {
        grid.classList.remove('list-view');
        grid.classList.add('grid-view');
        btn.innerHTML = '<i class="fa-solid fa-grip"></i> Grid';
    }
}

// Add search input event listener
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('bookmarkletSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterBookmarklets);
    }
});
