// ===== Pricing Management Module =====
import { showNotification, showLoading, hideLoading } from './utils.js';

let pricingEditMode = 'table'; // 'table' or 'json'

export async function loadPricing() {
    const adminToken = localStorage.getItem('adminToken');
    showLoading('加载定价配置...');
    try {
        const response = await fetch('/api/admin/pricing', {
            headers: { 'x-admin-token': adminToken }
        });

        if (response.ok) {
            const data = await response.json();
            const pricing = data.data || {};

            if (pricingEditMode === 'table') {
                displayPricingTable(pricing);
                const addBtn = document.getElementById('addPricingModelBtn');
                if (addBtn) addBtn.style.display = 'block';
            } else {
                document.getElementById('pricingConfigJson').value = JSON.stringify(pricing, null, 2);
                const addBtn = document.getElementById('addPricingModelBtn');
                if (addBtn) addBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to load pricing:', error);
        showNotification('加载定价失败', 'error');
    } finally {
        hideLoading();
    }
}

function displayPricingTable(pricing) {
    const tbody = document.getElementById('pricingTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // 如果没有定价数据，添加一个空行
    if (!pricing || Object.keys(pricing).length === 0) {
        addPricingModel();
        return;
    }

    // 为每个模型创建一行
    Object.entries(pricing).forEach(([modelName, modelPricing]) => {
        const row = document.createElement('tr');
        const inputPrice = modelPricing.input || 0;
        const outputPrice = modelPricing.output || 0;

        row.innerHTML = `
            <td style="padding: 12px;">
                <input type="text" class="input" value="${modelName}" placeholder="例如: gpt-4">
            </td>
            <td style="padding: 12px;">
                <input type="number" class="input" value="${inputPrice}" step="0.000001" min="0" placeholder="0.001">
            </td>
            <td style="padding: 12px;">
                <input type="number" class="input" value="${outputPrice}" step="0.000001" min="0" placeholder="0.002">
            </td>
            <td style="padding: 12px; text-align: center;">
                <button class="btn btn-danger btn-sm" onclick="window.removePricingRow(this)">🗑️ 删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

export function addPricingModel() {
    const tbody = document.getElementById('pricingTableBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="padding: 12px;">
            <input type="text" class="input" placeholder="例如: gpt-4">
        </td>
        <td style="padding: 12px;">
            <input type="number" class="input" step="0.000001" min="0" placeholder="0.001">
        </td>
        <td style="padding: 12px;">
            <input type="number" class="input" step="0.000001" min="0" placeholder="0.002">
        </td>
        <td style="padding: 12px; text-align: center;">
            <button class="btn btn-danger btn-sm" onclick="window.removePricingRow(this)">🗑️ 删除</button>
        </td>
    `;
    tbody.appendChild(row);
}

export function removePricingRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
    }
}

function collectPricingTableData() {
    const tbody = document.getElementById('pricingTableBody');
    const config = {};

    if (!tbody) return config;

    Array.from(tbody.children).forEach((row) => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length < 3) return;

        const modelName = inputs[0].value.trim();
        const inputPrice = parseFloat(inputs[1].value) || 0;
        const outputPrice = parseFloat(inputs[2].value) || 0;

        if (modelName) {
            config[modelName] = {
                input: inputPrice,
                output: outputPrice
            };
        }
    });

    return config;
}

export function togglePricingEditMode() {
    if (pricingEditMode === 'table') {
        // Switch to JSON mode - collect table data and show in JSON
        const config = collectPricingTableData();
        document.getElementById('pricingConfigJson').value = JSON.stringify(config, null, 2);
        document.getElementById('pricingTableMode').style.display = 'none';
        document.getElementById('pricingJsonMode').style.display = 'block';
        document.getElementById('pricingModeToggle').textContent = '📊 切换到表格模式';
        const addBtn = document.getElementById('addPricingModelBtn');
        if (addBtn) addBtn.style.display = 'none';
        pricingEditMode = 'json';
    } else {
        // Switch to table mode - parse JSON and display table
        try {
            const jsonValue = document.getElementById('pricingConfigJson').value;
            const config = jsonValue ? JSON.parse(jsonValue) : {};
            displayPricingTable(config);
        } catch (error) {
            showNotification('JSON格式错误', 'error');
            return;
        }
        document.getElementById('pricingTableMode').style.display = 'block';
        document.getElementById('pricingJsonMode').style.display = 'none';
        document.getElementById('pricingModeToggle').textContent = '📝 切换到JSON模式';
        const addBtn = document.getElementById('addPricingModelBtn');
        if (addBtn) addBtn.style.display = 'block';
        pricingEditMode = 'table';
    }
}

export async function savePricing(event) {
    if (event) event.preventDefault();

    const adminToken = localStorage.getItem('adminToken');
    let config;

    try {
        if (pricingEditMode === 'table') {
            // Validate table data
            config = collectPricingTableData();
            if (Object.keys(config).length === 0) {
                showNotification('请至少添加一个模型定价', 'error');
                return;
            }
        } else {
            // Validate JSON
            const configText = document.getElementById('pricingConfigJson').value;
            if (!configText) {
                showNotification('请填写定价配置', 'error');
                return;
            }
            config = JSON.parse(configText);
        }

        // Save to API
        showLoading('保存定价配置...');
        const response = await fetch('/api/admin/pricing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('定价配置已保存', 'success');
            loadPricing();
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
