// duodokutecniques-bridge.js
// duodokutecniques.js is an ES module (uses export). This tiny module
// script imports it and republishes everything on window.DuoDokuTechniques
// so the rest of the page (plain <script> tags) can use it without
// rewriting duodokutecniques.js itself.
import * as techniques from './duodokutecniques.js';

window.DuoDokuTechniques = techniques;
window.dispatchEvent(new Event('duodokutechniques-ready'));
