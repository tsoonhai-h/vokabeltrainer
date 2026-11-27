import './style.css';
import Alpine from 'alpinejs';
import { vokabeltrainer } from './app.js';

window.Alpine = Alpine;
Alpine.data('vokabeltrainer', vokabeltrainer);
Alpine.start();
