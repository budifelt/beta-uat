// Debug script untuk memeriksa button
console.log('=== DEBUG BUTTON ===');
console.log('app:', window.app);
console.log('dbChecker:', window.dbChecker);
console.log('checkBtn element:', document.getElementById('checkBtn'));
console.log('checkBtn disabled:', document.getElementById('checkBtn')?.disabled);

// Test manual click
document.getElementById('checkBtn')?.addEventListener('click', () => {
  console.log('Button clicked!');
});
