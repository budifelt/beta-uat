/**
 * Version Configuration
 * Contains app version and build information
 */

// App version
const APP_VERSION = '1.0.0';

// Build information
const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: new Date().toISOString(),
  environment: 'development'
};

// Export for global access
window.APP_VERSION = APP_VERSION;
window.BUILD_INFO = BUILD_INFO;

// Log version on load
console.log(`eDM Helper v${APP_VERSION} - Loaded on ${new Date().toLocaleDateString()}`);
