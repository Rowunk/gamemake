'use strict';
import { el } from './dom.js';
export function makePanel() { return el('div', { class: 'panel' }); }
export function row(parent, html) { const r = el('div', {}, parent); r.innerHTML = html; return r; }
