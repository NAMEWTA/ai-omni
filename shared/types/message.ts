import { CopilotModel, ServerStatus } from './api';

/**
 * 前后端通信消息类型
 */
export interface WebviewMessage<T = any> {
  type: string;
  payload?: T;
}

/**
 * 预定义的消息类型
 */
export const MessageTypes = {
  // 基础消息
  PING: 'ping',
  PONG: 'pong',
  SHOW_INFO: 'showInfo',
  SHOW_ERROR: 'showError',
  
  // 模型相关
  GET_MODELS: 'getModels',
  MODELS_LIST: 'modelsList',
  SELECT_MODEL: 'selectModel',
  MODEL_SELECTED: 'modelSelected',
  
  // 服务控制
  START_SERVER: 'startServer',
  STOP_SERVER: 'stopServer',
  GET_SERVER_STATUS: 'getServerStatus',
  SERVER_STATUS: 'serverStatus',
  
  // 配置
  GET_CONFIG: 'getConfig',
  CONFIG_UPDATE: 'configUpdate',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

/**
 * 获取模型列表响应
 */
export interface ModelsListPayload {
  models: CopilotModel[];
}

/**
 * 选择模型请求
 */
export interface SelectModelPayload {
  modelId: string;
}

/**
 * 启动服务器请求
 */
export interface StartServerPayload {
  port: number;
  modelId: string;
}

/**
 * 服务器状态响应
 */
export interface ServerStatusPayload extends ServerStatus {}

/**
 * 配置信息
 */
export interface ConfigPayload {
  defaultPort: number;
  lastSelectedModel?: string;
}
