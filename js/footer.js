/**
 * Footer Global JavaScript
 * Handles footer modal functionality across all pages
 */

document.addEventListener('DOMContentLoaded', () => {
  // Update footer year
  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // Footer modal toggle functionality
  const footerToggle = document.getElementById('footer-toggle');
  const footerModal = document.getElementById('footer-modal');
  const footerModalClose = document.getElementById('footer-modal-close');

  if (footerToggle && footerModal) {
    let escapeHandler = null;

    // Function to open modal
    const openModal = () => {
      footerModal.classList.add('active');
      footerModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      footerModalClose?.focus();

      // Add Escape key handler only when modal is open
      escapeHandler = (e) => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      document.addEventListener('keydown', escapeHandler);
    };

    // Function to close modal
    const closeModal = () => {
      footerModal.classList.remove('active');
      footerModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = 'hidden';
      document.body.style.scrollbarWidth = 'none';
      document.body.style.msOverflowStyle = 'none';
      footerToggle.focus();

      // Remove Escape key handler when modal is closed
      if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
      }
    };

    // Open modal when toggle button is clicked
    footerToggle.addEventListener('click', openModal);

    // Close modal when close button is clicked
    if (footerModalClose) {
      footerModalClose.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside the modal content
    footerModal.addEventListener('click', (e) => {
      if (e.target === footerModal) {
        closeModal();
      }
    });

    // Set initial ARIA state
    footerModal.setAttribute('aria-hidden', 'true');
  }
});
