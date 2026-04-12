/**
 * SPA Configuration & Constants
 * Centralized configuration for the entire application
 */

window.APP_CONFIG = {
  // Environment Detection
  ENV: {
    isGitHubPages: window.location.hostname === 'budife.github.io',
    isLocal: window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  },

  // Base Path Configuration
  BASE_PATH: window.location.hostname === 'budife.github.io' ? '/beta-uat/' : '/',

  // API Endpoints
  API: {
    fragments: (page) => `${window.APP_CONFIG.BASE_PATH}fragments/${page}.html`,
    css: (page) => `${window.APP_CONFIG.BASE_PATH}css/pages/${page}.css`,
    js: (page) => page === 'index' 
      ? `${window.APP_CONFIG.BASE_PATH}js/pages/index.js`
      : `${window.APP_CONFIG.BASE_PATH}js/pages/pages-${page}.js`
  },

  // Page Configuration
  PAGES: {
    index: { name: 'Home', title: 'eDM Helper - Tools for Email Marketing & Productivity' },
    bookmarklet: { name: 'Bookmarklet', title: 'Bookmarklet - eDM Helper' },
    'campaign-counter': { name: 'Campaign Counter', title: 'Campaign Counter - eDM Helper' },
    'database-checker': { name: 'Database Checker', title: 'Database Checker - eDM Helper' },
    'database-generator': { name: 'Database Generator', title: 'Database Generator - eDM Helper' },
    'layout-checker': { name: 'Layout Checker', title: 'Layout Checker - eDM Helper' },
    'link-checker': { name: 'Link Checker', title: 'Link Checker - eDM Helper' },
    'wfh-tracker': { name: 'WFH Tracker', title: 'WFH Tracker - eDM Helper' },
    config: { name: 'Config eDM', title: 'Config eDM - eDM Helper' }
  }
};
