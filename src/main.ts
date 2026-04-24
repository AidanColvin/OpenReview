/**
 * main.ts
 * Vite entry point. Imports the app bootstrap and global styles.
 */

import { boot } from './app';
import './style.css';

document.addEventListener('DOMContentLoaded', boot);
