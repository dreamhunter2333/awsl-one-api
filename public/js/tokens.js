// ===== Token Management Module =====
import { toggleModal, showNotification, showLoading, hideLoading } from './utils.js';

let tokenEditMode = 'form'; // 'form' or 'json'
let currentEditingKey = null;
let availableChannels = []; // Store available channels for select options
let selectedChannels = []; // Store selected channel keys

// Load available channels
async function loadAvailableChannels() {
    const adminToken = localStorage.getItem('adminToken');
    try {
        const response = await fetch('/api/admin/channel', {
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            const result = await response.json();
            const channels = result.data || [];
            availableChannels = channels.map(c => c.key);
            populateChannelOptions();
        }
    } catch (error) {
        console.error('Failed to load channels:', error);
    }
}

// Populate channel options in the dropdown
function populateChannelOptions() {
    const container = document.getElementById('channelOptionsContainer');
    if (!container) return;

    if (availableChannels.length === 0) {
        container.innerHTML = '<div class="multi-select-empty">暂无可用频道</div>';
    } else {
        container.innerHTML = availableChannels.map(key => `
            <div class="multi-select-option" onclick="window.toggleChannelSelection('${key}', event)">
                <input type="checkbox" id="channel_${key}" value="${key}" ${selectedChannels.includes(key) ? 'checked' : ''}>
                <label for="channel_${key}">${key}</label>
            </div>
        `).join('');
    }
    updateChannelDisplay();
}

// Toggle channel dropdown
export function toggleChannelDropdown() {
    const dropdown = document.getElementById('channelSelectDropdown');
    const trigger = document.getElementById('channelSelectTrigger');

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        trigger.classList.add('open');
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeChannelDropdownOnClickOutside);
        }, 0);
    } else {
        dropdown.classList.add('hidden');
        trigger.classList.remove('open');
        document.removeEventListener('click', closeChannelDropdownOnClickOutside);
    }
}

function closeChannelDropdownOnClickOutside(event) {
    const wrapper = document.querySelector('.multi-select-wrapper');
    if (wrapper && !wrapper.contains(event.target)) {
        const dropdown = document.getElementById('channelSelectDropdown');
        const trigger = document.getElementById('channelSelectTrigger');
        dropdown.classList.add('hidden');
        trigger.classList.remove('open');
        document.removeEventListener('click', closeChannelDropdownOnClickOutside);
    }
}

// Toggle channel selection
export function toggleChannelSelection(channelKey, event) {
    event.stopPropagation();

    const checkbox = document.getElementById(`channel_${channelKey}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }

    if (selectedChannels.includes(channelKey)) {
        selectedChannels = selectedChannels.filter(k => k !== channelKey);
    } else {
        selectedChannels.push(channelKey);
    }

    updateChannelDisplay();
}

// Update the display of selected channels
function updateChannelDisplay() {
    const valueElement = document.getElementById('channelSelectValue');
    if (!valueElement) return;

    if (selectedChannels.length === 0) {
        valueElement.textContent = '请选择频道...';
        valueElement.classList.add('placeholder');
    } else if (selectedChannels.length === 1) {
        valueElement.textContent = selectedChannels[0];
        valueElement.classList.remove('placeholder');
    } else {
        valueElement.textContent = `已选择 ${selectedChannels.length} 个频道`;
        valueElement.classList.remove('placeholder');
    }
}

// Filter channels based on search
export function filterChannels() {
    const searchInput = document.getElementById('channelSearchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const options = document.querySelectorAll('.multi-select-option');

    options.forEach(option => {
        const label = option.querySelector('label').textContent.toLowerCase();
        if (label.includes(searchTerm)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    });
}

// Load tokens from API
export async function loadTokens() {
    const adminToken = localStorage.getItem('adminToken');
    showLoading('加载令牌列表...');
    try {
        const response = await fetch('/api/admin/token', {
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            const result = await response.json();
            const tokens = result.data || [];
            displayTokens(tokens);
        }
    } catch (error) {
        console.error('Failed to load tokens:', error);
        showNotification('加载令牌失败', 'error');
    } finally {
        hideLoading();
    }
}

// Display tokens in the list
function displayTokens(tokens) {
    const container = document.getElementById('tokensList');
    if (!container) return;

    if (!tokens || tokens.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem 1rem; color: hsl(var(--muted-foreground));">🎫 暂无令牌数据</div>';
        return;
    }

    container.innerHTML = tokens.map(item => {
        let parsedValue = {};
        try {
            parsedValue = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
        } catch {
            parsedValue = { name: 'Invalid JSON', channel_keys: [], total_quota: 0 };
        }

        const name = parsedValue.name || '未命名';
        const channelKeys = parsedValue.channel_keys || [];
        const channelDisplay = channelKeys.length === 0 ? '所有频道' : channelKeys.slice(0, 2).join(', ') + (channelKeys.length > 2 ? '...' : '');
        const usage = item.usage || 0;
        const totalQuota = parsedValue.total_quota || 0;

        // 将配额转换为美元显示
        const totalQuotaValue = totalQuota || 0;
        const quotaInDollars = (totalQuotaValue / 1000000).toFixed(2);
        const usageValue = usage || 0;
        const usageInDollars = (usageValue / 1000000).toFixed(2);

        return `
            <div class="item">
                <div class="item-info">
                    <div class="item-key">${name}</div>
                    <div class="item-details">
                        频道: ${channelDisplay} | 配额: $${quotaInDollars} | 已用: $${usageInDollars}
                    </div>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" onclick="window.copyToClipboard('${item.key}')" title="复制token">📋 复制</button>
                    <button class="btn btn-secondary" onclick="window.editToken('${item.key}')">✏️ 编辑</button>
                    <button class="btn btn-danger" onclick="window.deleteToken('${item.key}')">🗑️ 删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// Show token list view
export function showTokenList() {
    document.getElementById('tokenListView').style.display = 'block';
    document.getElementById('tokenFormView').style.display = 'none';
    loadTokens();
}

// Show token form for adding
export async function showTokenForm() {
    currentEditingKey = null;
    document.getElementById('tokenFormTitle').textContent = '添加令牌';
    document.getElementById('tokenListView').style.display = 'none';
    document.getElementById('tokenFormView').style.display = 'block';
    clearTokenForm();
    // Reset to form mode
    tokenEditMode = 'form';
    document.getElementById('tokenFormMode').style.display = 'block';
    document.getElementById('tokenJsonMode').style.display = 'none';
    document.getElementById('tokenModeToggle').textContent = '📝 切换到JSON模式';

    // Token key should be editable when creating
    document.getElementById('tokenKey').disabled = false;
    document.getElementById('tokenKey').placeholder = '输入令牌标识或点击生成';

    // Enable generate button for new tokens
    const generateBtn = document.getElementById('generateTokenBtn');
    if (generateBtn) {
        generateBtn.disabled = false;
    }

    // Load available channels and auto-generate token key
    await loadAvailableChannels();
    generateTokenKey();
}

// Edit existing token
export async function editToken(key) {
    currentEditingKey = key;
    document.getElementById('tokenFormTitle').textContent = '编辑令牌';
    document.getElementById('tokenListView').style.display = 'none';
    document.getElementById('tokenFormView').style.display = 'block';

    showLoading('加载令牌数据...');
    try {
        // Load available channels first
        await loadAvailableChannels();

        const adminToken = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/token', {
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            const result = await response.json();
            const tokens = result.data || [];
            const token = tokens.find(t => t.key === key);

            if (token) {
                const config = typeof token.value === 'string' ? JSON.parse(token.value) : token.value;
                fillTokenForm(key, config, token.usage || 0);

                // Set token key as readonly when editing
                document.getElementById('tokenKey').disabled = true;

                // Disable generate button when editing
                const generateBtn = document.getElementById('generateTokenBtn');
                if (generateBtn) {
                    generateBtn.disabled = true;
                }
            }
        }
    } catch (error) {
        showNotification('加载令牌数据失败', 'error');
    } finally {
        hideLoading();
    }
}

// Fill form with token data
function fillTokenForm(key, config, usage) {
    document.getElementById('tokenKey').value = key;
    // Don't change disabled state here - it's set by editToken
    document.getElementById('tokenName').value = config.name || '';

    // Set selected channels
    selectedChannels = config.channel_keys && Array.isArray(config.channel_keys) ? config.channel_keys : [];
    populateChannelOptions();

    document.getElementById('totalQuotaInput').value = config.total_quota || 0;

    // Update JSON mode
    document.getElementById('tokenValueJson').value = JSON.stringify(config, null, 2);
}

// Clear form
function clearTokenForm() {
    document.getElementById('tokenKey').value = '';
    document.getElementById('tokenKey').disabled = false;
    document.getElementById('tokenName').value = '';

    // Clear selected channels
    selectedChannels = [];
    updateChannelDisplay();

    document.getElementById('totalQuotaInput').value = '';
    document.getElementById('tokenValueJson').value = '';
}

// Set quota value (for quick buttons)
export function setQuotaValue(value) {
    document.getElementById('totalQuotaInput').value = value;
}

// Generate random token key
export function generateTokenKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'sk-';
    for (let i = 0; i < 48; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('tokenKey').value = token;
}

// Toggle between form and JSON mode
export function toggleTokenEditMode() {
    if (tokenEditMode === 'form') {
        // Switch to JSON mode - collect form data and show in JSON
        const formData = collectTokenFormData();
        if (formData) {
            document.getElementById('tokenValueJson').value = JSON.stringify(formData, null, 2);
        }
        document.getElementById('tokenFormMode').style.display = 'none';
        document.getElementById('tokenJsonMode').style.display = 'block';
        document.getElementById('tokenModeToggle').textContent = '📋 切换到表单模式';
        tokenEditMode = 'json';
    } else {
        // Switch to form mode - parse JSON and fill form
        try {
            const jsonValue = document.getElementById('tokenValueJson').value;
            if (jsonValue) {
                const config = JSON.parse(jsonValue);
                document.getElementById('tokenName').value = config.name || '';

                // Set selected channels
                selectedChannels = config.channel_keys && Array.isArray(config.channel_keys) ? config.channel_keys : [];
                populateChannelOptions();

                document.getElementById('totalQuotaInput').value = config.total_quota || 0;
            }
        } catch (error) {
            showNotification('JSON格式错误', 'error');
            return;
        }
        document.getElementById('tokenFormMode').style.display = 'block';
        document.getElementById('tokenJsonMode').style.display = 'none';
        document.getElementById('tokenModeToggle').textContent = '📝 切换到JSON模式';
        tokenEditMode = 'form';
    }
}

// Collect form data
function collectTokenFormData() {
    const name = document.getElementById('tokenName').value;
    const totalQuota = parseFloat(document.getElementById('totalQuotaInput').value) || 0;

    if (!name) {
        return null;
    }

    return {
        name,
        channel_keys: selectedChannels,
        total_quota: totalQuota
    };
}

// Save token (add or update)
export async function saveToken() {
    const key = document.getElementById('tokenKey').value || currentEditingKey;
    if (!key) {
        showNotification('请填写令牌标识', 'error');
        return;
    }

    let config;
    if (tokenEditMode === 'form') {
        config = collectTokenFormData();
        if (!config) {
            showNotification('请填写所有必填字段（令牌名称）', 'error');
            return;
        }
    } else {
        const jsonValue = document.getElementById('tokenValueJson').value;
        if (!jsonValue) {
            showNotification('请填写配置JSON', 'error');
            return;
        }
        try {
            config = JSON.parse(jsonValue);
        } catch {
            showNotification('JSON格式错误，请检查配置格式', 'error');
            return;
        }
    }

    const adminToken = localStorage.getItem('adminToken');

    showLoading('保存令牌...');
    try {
        const response = await fetch(`/api/admin/token/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification(currentEditingKey ? '令牌更新成功' : '令牌添加成功', 'success');
            clearTokenForm();
            showTokenList();
        } else {
            const error = await response.text();
            showNotification('保存失败：' + error, 'error');
        }
    } catch (error) {
        showNotification('保存失败：' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Delete token
export async function deleteToken(key) {
    if (!confirm(`确定要删除令牌 "${key}" 吗？`)) return;

    const adminToken = localStorage.getItem('adminToken');

    showLoading('删除令牌...');
    try {
        const response = await fetch(`/api/admin/token/${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            showNotification('令牌已删除', 'success');
            loadTokens();
        } else {
            showNotification('删除失败', 'error');
        }
    } catch (error) {
        showNotification('删除失败：' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
