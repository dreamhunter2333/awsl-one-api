// ===== Database Management Module =====
import { showNotification, showLoading, hideLoading } from './utils.js';

export async function initDatabase() {
    const adminToken = localStorage.getItem('adminToken');
    showLoading('初始化数据库...');
    try {
        const response = await fetch('/api/admin/db_initialize', {
            method: 'POST',
            headers: { 'x-admin-token': adminToken }
        });

        const data = await response.json();
        document.getElementById('dbResult').classList.remove('hidden');
        document.getElementById('dbResultContent').textContent = JSON.stringify(data, null, 2);

        if (response.ok) {
            showNotification('数据库初始化成功', 'success');
        } else {
            showNotification('数据库初始化失败', 'error');
        }
    } catch (error) {
        showNotification('初始化失败：' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
