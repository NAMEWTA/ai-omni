import type { WebviewMessage } from '@shared/types/message';

/**
 * VS Code API 包装器
 * 用于与 Extension 进行通信
 */
interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

class VSCodeAPIWrapper {
  private readonly vsCodeApi: VsCodeApi | undefined;

  constructor() {
    // 检查是否在 VS Code webview 环境中
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * 向 Extension 发送消息
   */
  public postMessage(message: WebviewMessage): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log('[DEV] postMessage:', message);
    }
  }

  /**
   * 获取持久化状态
   */
  public getState(): unknown {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    }
    return undefined;
  }

  /**
   * 设置持久化状态
   */
  public setState(state: unknown): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.setState(state);
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
