// ===== API Test Module =====
import { showNotification } from './utils.js';

// API Test Template
export function updateRequestTemplate() {
    const endpoint = document.getElementById('testEndpoint').value;
    const requestBody = document.getElementById('testRequestBody');

    const templates = {
        '/v1/chat/completions': {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: "你好，请介绍一下你自己。" }
            ],
            temperature: 0.7,
            max_tokens: 1024
        },
        '/v1/messages': {
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            messages: [
                { role: "user", content: "你好，请介绍一下你自己。" }
            ]
        },
        '/v1/completions': {
            model: "gpt-3.5-turbo-instruct",
            prompt: "你好，请介绍一下你自己。",
            max_tokens: 1024,
            temperature: 0.7
        }
    };

    requestBody.value = JSON.stringify(templates[endpoint], null, 2);
}

export async function testAPI(event) {
    event.preventDefault();

    const endpoint = document.getElementById('testEndpoint').value;
    const token = document.getElementById('testApiToken').value;
    const requestBodyText = document.getElementById('testRequestBody').value;

    const resultDiv = document.getElementById('testResult');
    const resultContent = document.getElementById('testResultContent');
    const statusBadge = document.getElementById('testStatusBadge');
    const timeBadge = document.getElementById('testTimeBadge');
    const submitBtn = document.getElementById('testSubmitBtn');

    // Validate JSON
    let requestBody;
    try {
        requestBody = JSON.parse(requestBodyText);
    } catch (error) {
        showNotification('JSON 格式错误：' + error.message, 'error');
        return;
    }

    resultDiv.classList.remove('hidden');
    resultContent.textContent = '发送请求中...';
    statusBadge.textContent = '请求中';
    statusBadge.className = 'badge badge-warning';
    submitBtn.disabled = true;

    const startTime = Date.now();

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        timeBadge.textContent = `${duration}ms`;

        if (response.ok) {
            statusBadge.textContent = '成功';
            statusBadge.className = 'badge badge-success';
        } else {
            statusBadge.textContent = `失败 ${response.status}`;
            statusBadge.className = 'badge badge-destructive';
        }

        // Handle streaming vs non-streaming
        const isStreaming = requestBody.stream === true;

        if (isStreaming) {
            resultContent.textContent = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                resultContent.textContent += chunk;
            }
        } else {
            const data = await response.json();
            resultContent.textContent = JSON.stringify(data, null, 2);
        }

        if (!response.ok) {
            showNotification('API 请求失败', 'error');
        }
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        timeBadge.textContent = `${duration}ms`;

        statusBadge.textContent = '错误';
        statusBadge.className = 'badge badge-destructive';
        resultContent.textContent = '错误：' + error.message;
        showNotification('请求失败：' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}
