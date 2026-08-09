// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyTokens } from './tokens.js';

// Tier color tokens flow from ONE source (tokens.js) into CSS variables —
// the stylesheet never restates a tier hex.
applyTokens();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
