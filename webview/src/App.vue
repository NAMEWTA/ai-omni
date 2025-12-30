<template>
  <div class="app-container">
    <h1>🎉 Welcome to My VSCode Extension</h1>
    <p class="subtitle">Vue 3 + Vite + TypeScript</p>

    <div class="card">
      <h2>Extension ↔ Webview 通信测试</h2>
      <div class="button-group">
        <button @click="sendPing">发送 Ping</button>
        <button @click="showMessage">显示消息</button>
      </div>
      <div v-if="lastMessage" class="message-box">
        <strong>最后收到的消息：</strong>
        <pre>{{ lastMessage }}</pre>
      </div>
    </div>

    <div class="card">
      <h2>项目信息</h2>
      <ul>
        <li>✅ Extension 后端 (TypeScript)</li>
        <li>✅ Webview 前端 (Vue 3 + Vite)</li>
        <li>✅ Shared 共享层 (类型定义)</li>
        <li>✅ 前后端通信机制</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { vscode } from './api/vscode';
import type { WebviewMessage } from '@shared/types/message';

const lastMessage = ref<string>('');

function sendPing() {
  vscode.postMessage({
    type: 'ping',
    payload: 'Hello from Webview!'
  });
}

function showMessage() {
  vscode.postMessage({
    type: 'showInfo',
    payload: '这是来自 Webview 的消息！'
  });
}

onMounted(() => {
  // 监听来自 Extension 的消息
  window.addEventListener('message', (event: MessageEvent<WebviewMessage>) => {
    const message = event.data;
    lastMessage.value = JSON.stringify(message, null, 2);
    console.log('Received message from extension:', message);
  });
});
</script>

<style scoped>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: var(--vscode-foreground);
  text-align: center;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 24px;
}

.card {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.card h2 {
  margin-top: 0;
  color: var(--vscode-foreground);
  font-size: 16px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

button {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: var(--vscode-button-hoverBackground);
}

.message-box {
  background: var(--vscode-textBlockQuote-background);
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.message-box pre {
  margin: 8px 0 0 0;
  font-size: 12px;
  white-space: pre-wrap;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  padding: 6px 0;
  color: var(--vscode-foreground);
}
</style>
