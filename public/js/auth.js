// ===== Authentication Module =====
import { toggleModal, showNotification, showLoading, hideLoading } from './utils.js';

export function toggleAuthModal() {
    const adminToken = localStorage.getItem('adminToken');

    if (adminToken) {
        // Logout
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('adminToken');
            onLogout();
        }
    } else {
        toggleModal('authModal');
    }
}

export async function authenticate(event) {
    event.preventDefault();
    const token = document.getElementById('adminToken').value;

    showLoading('验证令牌...');
    try {
        const response = await fetch('/api/admin/channel', {
            headers: { 'x-admin-token': token }
        });

        if (response.ok) {
            localStorage.setItem('adminToken', token);
            toggleModal('authModal');
            onAuthenticated();
            showNotification('登录成功', 'success');
        } else {
            showAuthError('管理员令牌无效');
        }
    } catch (error) {
        showAuthError('认证失败：' + error.message);
    } finally {
        hideLoading();
    }
}

function showAuthError(message) {
    document.getElementById('authError').classList.remove('hidden');
    document.getElementById('authErrorMessage').textContent = message;
}

function onAuthenticated() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.remove('hidden');
    });
    document.getElementById('loginPrompt').classList.add('hidden');
    const authButton = document.getElementById('authButton');
    authButton.textContent = '🚪 退出登录';
    authButton.style.color = 'hsl(var(--destructive))';
    authButton.style.borderColor = 'hsl(var(--destructive))';
}

function onLogout() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById('loginPrompt').classList.remove('hidden');
    const authButton = document.getElementById('authButton');
    authButton.textContent = '🔑 管理员登录';
    authButton.style.color = '';
    authButton.style.borderColor = '';

    if (window.switchTab) {
        window.switchTab('dashboard');
    }
}

// Initialize on page load
export function initAuth() {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        onAuthenticated();
    }
}
