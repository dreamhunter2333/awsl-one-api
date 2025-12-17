// ===== Channel Management Module =====
import { toggleModal, showNotification, showLoading, hideLoading } from './utils.js';

let channelEditMode = 'form'; // 'form' or 'json'
let currentEditingKey = null;

// Add model mapper row
export function addMapperRow() {
    const tbody = document.getElementById('channelMapperTable');
    if (!tbody) return;

    // Remove empty message if exists
    if (tbody.querySelector('.text-center')) {
        tbody.innerHTML = '';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="padding: 12px;">
            <input type="text" class="input" placeholder="例如: gpt-4" style="padding: 0.5rem;">
        </td>
        <td style="padding: 12px;">
            <input type="text" class="input" placeholder="例如: gpt-4-deployment" style="padding: 0.5rem;">
        </td>
        <td style="padding: 12px; text-align: center;">
            <button type="button" class="btn btn-danger btn-sm" onclick="window.removeMapperRow(this)">🗑️ 删除</button>
        </td>
    `;
    tbody.appendChild(row);
}

// Remove model mapper row
export function removeMapperRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
    }

    // If no rows left, show empty message
    const tbody = document.getElementById('channelMapperTable');
    if (tbody && tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">暂无映射，点击上方按钮添加</td></tr>';
    }
}

// Display mapper table
function displayMapperTable(mapper) {
    const tbody = document.getElementById('channelMapperTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!mapper || Object.keys(mapper).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">暂无映射，点击上方按钮添加</td></tr>';
        return;
    }

    Object.entries(mapper).forEach(([requestModel, deploymentModel]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 12px;">
                <input type="text" class="input" value="${requestModel}" placeholder="例如: gpt-4" style="padding: 0.5rem;">
            </td>
            <td style="padding: 12px;">
                <input type="text" class="input" value="${deploymentModel}" placeholder="例如: gpt-4-deployment" style="padding: 0.5rem;">
            </td>
            <td style="padding: 12px; text-align: center;">
                <button type="button" class="btn btn-danger btn-sm" onclick="window.removeMapperRow(this)">🗑️ 删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Collect mapper table data
function collectMapperTableData() {
    const tbody = document.getElementById('channelMapperTable');
    const mapper = {};

    if (!tbody) return mapper;

    Array.from(tbody.children).forEach((row) => {
        // Skip empty message row
        if (row.querySelector('.text-center')) return;

        const inputs = row.querySelectorAll('input');
        if (inputs.length < 2) return;

        const requestModel = inputs[0].value.trim();
        const deploymentModel = inputs[1].value.trim();

        if (requestModel && deploymentModel) {
            mapper[requestModel] = deploymentModel;
        }
    });

    return mapper;
}

// Load channels from API
export async function loadChannels() {
    const adminToken = localStorage.getItem('adminToken');
    showLoading('加载频道列表...');
    try {
        const response = await fetch('/api/admin/channel', {
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            const result = await response.json();
            const channels = result.data || [];
            displayChannels(channels);
        }
    } catch (error) {
        console.error('Failed to load channels:', error);
        showNotification('加载频道失败', 'error');
    } finally {
        hideLoading();
    }
}

// Display channels in the list
function displayChannels(channels) {
    const container = document.getElementById('channelsList');
    if (!container) return;

    if (!channels || channels.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem 1rem; color: hsl(var(--muted-foreground));">📂 暂无频道数据</div>';
        return;
    }

    container.innerHTML = channels.map(item => {
        let parsedValue = {};
        try {
            parsedValue = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
        } catch {
            parsedValue = { name: 'Invalid JSON', type: 'unknown', endpoint: '' };
        }

        const name = parsedValue.name || 'No name';
        const type = parsedValue.type || 'Unknown';
        const endpoint = parsedValue.endpoint || '';
        const endpointDisplay = endpoint.length > 50 ? endpoint.substring(0, 50) + '...' : endpoint;
        const modelCount = Object.keys(parsedValue.deployment_mapper || {}).length;

        return `
            <div class="item">
                <div class="item-info">
                    <div class="item-key">${name}</div>
                    <div class="item-details">
                        ${item.key} | 类型: ${type} | 端点: ${endpointDisplay} | ${modelCount} 个模型
                    </div>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" onclick="window.editChannel('${item.key}')">✏️ 编辑</button>
                    <button class="btn btn-danger" onclick="window.deleteChannel('${item.key}')">🗑️ 删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// Show channel list view
export function showChannelList() {
    document.getElementById('channelListView').style.display = 'block';
    document.getElementById('channelFormView').style.display = 'none';
    loadChannels();
}

// Show channel form for adding
export function showChannelForm() {
    currentEditingKey = null;
    document.getElementById('channelFormTitle').textContent = '添加频道';
    document.getElementById('channelListView').style.display = 'none';
    document.getElementById('channelFormView').style.display = 'block';
    clearChannelForm();
    // Reset to form mode
    channelEditMode = 'form';
    document.getElementById('channelFormMode').style.display = 'block';
    document.getElementById('channelJsonMode').style.display = 'none';
    document.getElementById('channelModeToggle').textContent = '📝 切换到JSON模式';

    // Channel key should be editable when creating
    document.getElementById('channelKey').disabled = false;
    document.getElementById('channelKey').placeholder = '例如: azure-openai-1';
}

// Edit existing channel
export async function editChannel(key) {
    currentEditingKey = key;
    document.getElementById('channelFormTitle').textContent = '编辑频道';
    document.getElementById('channelListView').style.display = 'none';
    document.getElementById('channelFormView').style.display = 'block';

    const adminToken = localStorage.getItem('adminToken');
    showLoading('加载频道数据...');
    try {
        const response = await fetch('/api/admin/channel', {
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            const result = await response.json();
            const channels = result.data || [];
            const channel = channels.find(c => c.key === key);

            if (channel) {
                const config = typeof channel.value === 'string' ? JSON.parse(channel.value) : channel.value;
                fillChannelForm(key, config);

                // Set channel key as readonly when editing
                document.getElementById('channelKey').disabled = true;
            }
        }
    } catch (error) {
        showNotification('加载频道数据失败', 'error');
    } finally {
        hideLoading();
    }
}

// Fill form with channel data
function fillChannelForm(key, config) {
    document.getElementById('channelKey').value = key;
    // Don't change disabled state here - it's set by editChannel
    document.getElementById('channelName').value = config.name || '';
    document.getElementById('channelType').value = config.type || 'azure-openai';
    document.getElementById('channelEndpoint').value = config.endpoint || '';
    document.getElementById('channelApiKey').value = config.api_key || '';
    document.getElementById('channelApiVersion').value = config.api_version || '';

    // Display mapper table
    displayMapperTable(config.deployment_mapper || {});

    // Update JSON mode
    document.getElementById('channelValueJson').value = JSON.stringify(config, null, 2);
}

// Clear form
function clearChannelForm() {
    document.getElementById('channelKey').value = '';
    document.getElementById('channelKey').disabled = false;
    document.getElementById('channelName').value = '';
    document.getElementById('channelType').value = 'azure-openai';
    document.getElementById('channelEndpoint').value = '';
    document.getElementById('channelApiKey').value = '';
    document.getElementById('channelApiVersion').value = '';

    // Clear mapper table
    const tbody = document.getElementById('channelMapperTable');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">暂无映射，点击上方按钮添加</td></tr>';
    }

    document.getElementById('channelValueJson').value = '';
}

// Toggle between form and JSON mode
export function toggleChannelEditMode() {
    if (channelEditMode === 'form') {
        // Switch to JSON mode - collect form data and show in JSON
        const formData = collectChannelFormData();
        if (formData) {
            document.getElementById('channelValueJson').value = JSON.stringify(formData, null, 2);
        }
        document.getElementById('channelFormMode').style.display = 'none';
        document.getElementById('channelJsonMode').style.display = 'block';
        document.getElementById('channelModeToggle').textContent = '📋 切换到表单模式';
        channelEditMode = 'json';
    } else {
        // Switch to form mode - parse JSON and fill form
        try {
            const jsonValue = document.getElementById('channelValueJson').value;
            if (jsonValue) {
                const config = JSON.parse(jsonValue);
                document.getElementById('channelName').value = config.name || '';
                document.getElementById('channelType').value = config.type || 'azure-openai';
                document.getElementById('channelEndpoint').value = config.endpoint || '';
                document.getElementById('channelApiKey').value = config.api_key || '';
                document.getElementById('channelApiVersion').value = config.api_version || '';

                // Display mapper table
                displayMapperTable(config.deployment_mapper || {});
            }
        } catch (error) {
            showNotification('JSON格式错误', 'error');
            return;
        }
        document.getElementById('channelFormMode').style.display = 'block';
        document.getElementById('channelJsonMode').style.display = 'none';
        document.getElementById('channelModeToggle').textContent = '📝 切换到JSON模式';
        channelEditMode = 'form';
    }
}

// Collect form data
function collectChannelFormData() {
    const name = document.getElementById('channelName').value;
    const type = document.getElementById('channelType').value;
    const endpoint = document.getElementById('channelEndpoint').value;
    const apiKey = document.getElementById('channelApiKey').value;
    const apiVersion = document.getElementById('channelApiVersion').value;

    if (!name || !endpoint || !apiKey) {
        return null;
    }

    // Collect mapper data from table
    const deploymentMapper = collectMapperTableData();

    const config = {
        name,
        type,
        endpoint,
        api_key: apiKey,
        deployment_mapper: deploymentMapper
    };

    if (apiVersion) {
        config.api_version = apiVersion;
    }

    return config;
}

// Save channel (add or update)
export async function saveChannel() {
    const key = document.getElementById('channelKey').value || currentEditingKey;
    if (!key) {
        showNotification('请填写频道标识', 'error');
        return;
    }

    let config;
    if (channelEditMode === 'form') {
        config = collectChannelFormData();
        if (!config) {
            showNotification('请填写所有必填字段（频道名称、端点、API密钥）', 'error');
            return;
        }
    } else {
        const jsonValue = document.getElementById('channelValueJson').value;
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

    showLoading('保存频道...');
    try {
        const response = await fetch(`/api/admin/channel/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification(currentEditingKey ? '频道更新成功' : '频道添加成功', 'success');
            clearChannelForm();
            showChannelList();
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

// Delete channel
export async function deleteChannel(key) {
    if (!confirm(`确定要删除频道 "${key}" 吗？`)) return;

    const adminToken = localStorage.getItem('adminToken');

    showLoading('删除频道...');
    try {
        const response = await fetch(`/api/admin/channel/${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            showNotification('频道已删除', 'success');
            loadChannels();
        } else {
            showNotification('删除失败', 'error');
        }
    } catch (error) {
        showNotification('删除失败：' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
