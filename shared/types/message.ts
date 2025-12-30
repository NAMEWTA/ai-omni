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
  PING: 'ping',
  PONG: 'pong',
  SHOW_INFO: 'showInfo',
  SHOW_ERROR: 'showError',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
