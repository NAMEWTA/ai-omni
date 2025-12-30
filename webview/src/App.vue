<template>
  <div class="app-container">
    <div class="header">
      <h1>🤖 AI Omni</h1>
      <p class="subtitle">Copilot API 转发服务</p>
    </div>

    <!-- 状态指示器 -->
    <div class="status-card" :class="{ running: serverStatus.running }">
      <div class="status-indicator">
        <span class="status-dot" :class="{ active: serverStatus.running }"></span>
        <span class="status-text">{{ serverStatus.running ? '运行中' : '已停止' }}</span>
      </div>
      <div v-if="serverStatus.running" class="status-url">
        {{ serverStatus.url }}
      </div>
    </div>

    <!-- 模型选择 -->
    <div class="card">
      <h2>📦 选择模型</h2>
      <div class="form-group">
        <select 
          v-model="selectedModelId" 
          :disabled="serverStatus.running || models.length === 0"
          class="select-input"
        >
          <option value="" disabled>
            {{ models.length === 0 ? '加载模型中...' : '请选择模型' }}
          </option>
          <option v-for="model in models" :key="model.id" :value="model.id">
            {{ model.name }} ({{ model.vendor }})
          </option>
        </select>
      </div>
      <div v-if="selectedModel" class="model-info">
        <p><strong>ID:</strong> {{ selectedModel.id }}</p>
        <p><strong>厂商:</strong> {{ selectedModel.vendor }}</p>
        <p><strong>最大输入:</strong> {{ selectedModel.maxInputTokens }} tokens</p>
        <p><strong>最大输出:</strong> {{ selectedModel.maxOutputTokens }} tokens</p>
      </div>
    </div>

    <!-- 端口配置 -->
    <div class="card">
      <h2>🔌 端口配置</h2>
      <div class="form-group">
        <label for="port">监听端口:</label>
        <input 
          id="port"
          type="number" 
          v-model.number="port" 
          :disabled="serverStatus.running"
          min="1024"
          max="65535"
          class="number-input"
        />
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="card">
      <h2>🎮 服务控制</h2>
      <div class="button-group">
        <button 
          v-if="!serverStatus.running" 
          @click="startServer"
          :disabled="!selectedModelId"
          class="btn-primary"
        >
          ▶️ 启动服务
        </button>
        <button 
          v-else 
          @click="stopServer"
          class="btn-danger"
        >
          ⏹️ 停止服务
        </button>
        <button @click="refreshModels" class="btn-secondary">
          🔄 刷新模型
        </button>
      </div>
    </div>

    <!-- API 端点信息 -->
    <div v-if="serverStatus.running" class="card">
      <h2>📡 API 端点</h2>
      <div class="endpoints">
        <div class="endpoint">
          <span class="method">GET</span>
          <code>{{ serverStatus.url }}/v1/models</code>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span>
          <code>{{ serverStatus.url }}/v1/chat/completions</code>
          <span class="tag">OpenAI</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span>
          <code>{{ serverStatus.url }}/v1/messages</code>
          <span class="tag anthropic">Anthropic</span>
        </div>
        <div class="endpoint">
          <span class="method">GET</span>
          <code>{{ serverStatus.url }}/health</code>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-card">
      <p>❌ {{ errorMessage }}</p>
      <button @click="errorMessage = ''" class="btn-small">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { vscode } from './api/vscode';
import type { WebviewMessage, ModelsListPayload, ServerStatusPayload, ConfigPayload } from '@shared/types/message';
import type { CopilotModel, ServerStatus } from '@shared/types/api';
import { MessageTypes } from '@shared/types/message';

// 状态
const models = ref<CopilotModel[]>([]);
const selectedModelId = ref<string>('');
const port = ref<number>(11435);
const serverStatus = ref<ServerStatus>({
  running: false,
  port: 11435,
  selectedModel: null,
  url: null,
});
const errorMessage = ref<string>('');

// 计算属性
const selectedModel = computed(() => 
  models.value.find(m => m.id === selectedModelId.value)
);

// 方法
function startServer() {
  if (!selectedModelId.value) {
    errorMessage.value = '请先选择一个模型';
    return;
  }
  vscode.postMessage({
    type: MessageTypes.START_SERVER,
    payload: {
      port: port.value,
      modelId: selectedModelId.value,
    },
  });
}

function stopServer() {
  vscode.postMessage({
    type: MessageTypes.STOP_SERVER,
  });
}

function refreshModels() {
  vscode.postMessage({
    type: MessageTypes.GET_MODELS,
  });
}

function selectModel(modelId: string) {
  vscode.postMessage({
    type: MessageTypes.SELECT_MODEL,
    payload: { modelId },
  });
}

// 监听模型选择变化
watch(selectedModelId, (newId) => {
  if (newId && !serverStatus.value.running) {
    selectModel(newId);
  }
});

// 初始化
onMounted(() => {
  // 监听来自 Extension 的消息
  window.addEventListener('message', (event: MessageEvent<WebviewMessage>) => {
    const message = event.data;
    console.log('Received message:', message);

    switch (message.type) {
      case MessageTypes.MODELS_LIST:
        const modelsPayload = message.payload as ModelsListPayload;
        models.value = modelsPayload.models;
        break;

      case MessageTypes.SERVER_STATUS:
        const statusPayload = message.payload as ServerStatusPayload;
        serverStatus.value = statusPayload;
        if (statusPayload.selectedModel) {
          selectedModelId.value = statusPayload.selectedModel;
        }
        break;

      case MessageTypes.CONFIG_UPDATE:
        const configPayload = message.payload as ConfigPayload;
        port.value = configPayload.defaultPort;
        if (configPayload.lastSelectedModel) {
          selectedModelId.value = configPayload.lastSelectedModel;
        }
        break;

      case MessageTypes.MODEL_SELECTED:
        if (!message.payload.success) {
          errorMessage.value = message.payload.error || '选择模型失败';
        }
        break;

      case MessageTypes.SHOW_ERROR:
        errorMessage.value = message.payload;
        break;
    }
  });

  // 请求初始状态
  vscode.postMessage({ type: MessageTypes.GET_MODELS });
  vscode.postMessage({ type: MessageTypes.GET_SERVER_STATUS });
  vscode.postMessage({ type: MessageTypes.GET_CONFIG });
});
</script>

<style scoped>
.app-container {
  max-width: 100%;
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  color: var(--vscode-foreground);
  font-size: 20px;
  margin-bottom: 4px;
}

.subtitle {
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
  margin: 0;
}

.status-card {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-card.running {
  border-color: var(--vscode-charts-green);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vscode-errorForeground);
}

.status-dot.active {
  background: var(--vscode-charts-green);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-weight: 600;
  color: var(--vscode-foreground);
}

.status-url {
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  color: var(--vscode-textLink-foreground);
}

.card {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.card h2 {
  margin: 0 0 12px 0;
  color: var(--vscode-foreground);
  font-size: 14px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  color: var(--vscode-foreground);
  font-size: 13px;
}

.select-input,
.number-input {
  width: 100%;
  padding: 8px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  font-size: 13px;
}

.select-input:disabled,
.number-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-info {
  background: var(--vscode-textBlockQuote-background);
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.model-info p {
  margin: 4px 0;
  font-size: 12px;
  color: var(--vscode-foreground);
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground);
}

.btn-danger {
  background: var(--vscode-errorForeground);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-widget-border);
}

.endpoints {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.endpoint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  flex-wrap: wrap;
}

.method {
  background: var(--vscode-charts-green);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  font-size: 10px;
}

.method.post {
  background: var(--vscode-charts-blue);
}

.endpoint code {
  background: var(--vscode-textCodeBlock-background);
  padding: 4px 8px;
  border-radius: 3px;
  font-family: var(--vscode-editor-font-family);
  flex: 1;
  word-break: break-all;
}

.tag {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.tag.anthropic {
  background: var(--vscode-charts-orange);
}

.error-card {
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-card p {
  margin: 0;
  color: var(--vscode-errorForeground);
  font-size: 13px;
}
</style>
