// ===================================
// INDEX PAGE JAVASCRIPT - Optimized for performance
// Only handles the main page body content (tool cards)
// ===================================

// Note: Login state is handled by nav.js

// Sort tool-cards by title (A→Z) - Optimized
(function(){
  // Use requestAnimationFrame to prevent blocking
  requestAnimationFrame(() => {
    const grid = document.querySelector('.grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('a.tool-card'));
    if (cards.length === 0) return;

    cards.sort((a, b) => {
      const ta = a.querySelector('.tool-title')?.textContent?.trim() ?? '';
      const tb = b.querySelector('.tool-title')?.textContent?.trim() ?? '';
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
    });

    // Re-append in sorted order
    cards.forEach(card => grid.appendChild(card));
  });
})();

// Card click without animation - Optimized
document.querySelectorAll('a.tool-card').forEach(card=>{
  card.addEventListener('click', e=>{
    // Allow normal link behavior
  }, { passive: true }); // Add passive listener for better scroll performance
});

// ---- Form Handlers for index.html ----

// Login functionality is handled by modal-login.js

// Register functionality is handled by modal-register.js

// Toggle password visibility - handled by modal-login.js

// Toggle register password visibility - handled by modal-register.js

// Make functions globally available
// window.handleLogin is handled by modal-login.js
// window.handleRegister is handled by modal-register.js
// window.togglePassword is handled by modal-login.js
// window.toggleRegisterPassword is handled by modal-register.js
// window.toggleConfirmPassword is handled by modal-register.js
// window.saveSettings is handled by modal-settings.js
// window.applyTheme is handled by modal-settings.js
// window.applyFontSize is handled by modal-settings.js
