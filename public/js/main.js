// ===== Main Entry Point =====
import { toggleModal, switchTab, toggleTheme, showNotification, copyToClipboard } from './utils.js';
import { toggleAuthModal, authenticate, initAuth } from './auth.js';
import { updateRequestTemplate, testAPI } from './api-test.js';
import { loadChannels, showChannelList, showChannelForm, editChannel, saveChannel, toggleChannelEditMode, deleteChannel, addMapperRow, removeMapperRow } from './channels.js';
import { loadTokens, showTokenList, showTokenForm, editToken, saveToken, generateTokenKey, toggleTokenEditMode, deleteToken, setQuotaValue, toggleChannelDropdown, toggleChannelSelection, filterChannels, handleChannelCheckboxChange } from './tokens.js';
import { loadPricing, savePricing, addPricingModel, removePricingRow, togglePricingEditMode } from './pricing.js';
import { initDatabase } from './database.js';

// Expose functions to global scope for onclick handlers
window.toggleModal = toggleModal;
window.switchTab = switchTab;
window.toggleTheme = toggleTheme;
window.copyToClipboard = copyToClipboard;
window.toggleAuthModal = toggleAuthModal;
window.authenticate = authenticate;
window.updateRequestTemplate = updateRequestTemplate;
window.testAPI = testAPI;
window.loadChannels = loadChannels;
window.showChannelList = showChannelList;
window.showChannelForm = showChannelForm;
window.editChannel = editChannel;
window.saveChannel = saveChannel;
window.toggleChannelEditMode = toggleChannelEditMode;
window.deleteChannel = deleteChannel;
window.addMapperRow = addMapperRow;
window.removeMapperRow = removeMapperRow;
window.loadTokens = loadTokens;
window.showTokenList = showTokenList;
window.showTokenForm = showTokenForm;
window.editToken = editToken;
window.saveToken = saveToken;
window.generateTokenKey = generateTokenKey;
window.setQuotaValue = setQuotaValue;
window.toggleTokenEditMode = toggleTokenEditMode;
window.deleteToken = deleteToken;
window.toggleChannelDropdown = toggleChannelDropdown;
window.toggleChannelSelection = toggleChannelSelection;
window.handleChannelCheckboxChange = handleChannelCheckboxChange;
window.filterChannels = filterChannels;
window.loadPricing = loadPricing;
window.savePricing = savePricing;
window.addPricingModel = addPricingModel;
window.removePricingRow = removePricingRow;
window.togglePricingEditMode = togglePricingEditMode;
window.initDatabase = initDatabase;

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').textContent = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').textContent = '🌙';
    }

    // Initialize authentication
    initAuth();

    // Initialize API test template
    updateRequestTemplate();
});
