// ===== Utility Functions =====

// Modal Management
export function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.toggle('active');
}

// Tab Switching
export function switchTab(tabName) {
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': '仪表盘',
        'api-test': 'API 测试',
        'channels': '频道管理',
        'tokens': '令牌管理',
        'pricing': '定价管理',
        'database': '数据库管理'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || tabName;

    // Load data for specific tabs if authenticated
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        // Reset to list view and reload data for management pages
        if (tabName === 'channels') {
            window.showChannelList && window.showChannelList();
        }
        if (tabName === 'tokens') {
            window.showTokenList && window.showTokenList();
        }
        if (tabName === 'pricing') {
            window.loadPricing && window.loadPricing();
        }
    }
}

// Theme Toggle
export function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        document.getElementById('themeIcon').textContent = '🌙';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }
}

// Notification System
export function showNotification(message, type = 'info') {
    const className = type === 'success' ? 'alert-success' : (type === 'error' ? 'alert-error' : 'alert-info');
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `alert ${className}`;
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 100; min-width: 300px; animation: slideIn 0.3s ease;';
    toast.innerHTML = `<strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Copy to Clipboard
export function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

// Fallback copy method for older browsers
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification('已复制到剪贴板', 'success');
        } else {
            showNotification('复制失败', 'error');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showNotification('复制失败', 'error');
    }

    document.body.removeChild(textArea);
}

// Loading Overlay
let loadingTimeout = null;

export function showLoading(message = '加载中...') {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = overlay.querySelector('.loading-text');

    if (textEl) {
        textEl.textContent = message;
    }

    // 延迟显示，避免快速请求闪烁
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        overlay.classList.add('active');
    }, 100);
}

export function hideLoading() {
    clearTimeout(loadingTimeout);
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

// Fetch wrapper with automatic loading
export async function fetchWithLoading(url, options = {}, loadingMessage = '加载中...') {
    const adminToken = localStorage.getItem('adminToken');

    // Add admin token to headers
    const headers = {
        ...options.headers,
        'x-admin-token': adminToken
    };

    // Show loading
    showLoading(loadingMessage);

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        return response;
    } finally {
        hideLoading();
    }
}

