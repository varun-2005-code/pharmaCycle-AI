import '@testing-library/jest-dom';

// Polyfill scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = function () {};
