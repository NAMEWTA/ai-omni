import * as vscode from 'vscode';
import { CopilotModel } from '../../shared/types/api';

/**
 * Copilot 服务 - 集成 VS Code 语言模型 API
 */
export class CopilotService {
  private selectedModel: vscode.LanguageModelChat | null = null;
  private models: vscode.LanguageModelChat[] = [];
  private modelChangeCallback?: (models: CopilotModel[]) => void;

  /**
   * 设置模型列表变更回调
   */
  public onModelsChange(callback: (models: CopilotModel[]) => void) {
    this.modelChangeCallback = callback;
  }

  /**
   * 初始化并获取可用模型
   */
  public async initialize(): Promise<CopilotModel[]> {
    try {
      // 获取所有可用的语言模型
      this.models = await vscode.lm.selectChatModels();
      console.log(`Found ${this.models.length} language models`);
      
      // 监听模型变更
      vscode.lm.onDidChangeChatModels(async () => {
        this.models = await vscode.lm.selectChatModels();
        if (this.modelChangeCallback) {
          this.modelChangeCallback(this.convertModels());
        }
      });

      return this.convertModels();
    } catch (error) {
      console.error('Failed to initialize Copilot service:', error);
      return [];
    }
  }

  /**
   * 获取模型列表
   */
  public async getModels(): Promise<CopilotModel[]> {
    if (this.models.length === 0) {
      await this.initialize();
    }
    return this.convertModels();
  }

  /**
   * 选择模型
   */
  public async selectModel(modelId: string): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      this.selectedModel = model;
      console.log(`Selected model: ${modelId}`);
      return true;
    }
    console.error(`Model not found: ${modelId}`);
    return false;
  }

  /**
   * 获取当前选中的模型
   */
  public getSelectedModel(): CopilotModel | null {
    if (!this.selectedModel) {
      return null;
    }
    return this.convertModel(this.selectedModel);
  }

  /**
   * 进行对话（非流式）
   */
  public async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.selectedModel) {
      throw new Error('No model selected');
    }

    console.log(`Sending chat request to model: ${this.selectedModel.id}`);
    const chatMessages = this.convertToChatMessages(messages);
    
    try {
      const response = await this.selectedModel.sendRequest(
        chatMessages,
        {},
        new vscode.CancellationTokenSource().token
      );

      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Chat error with model ${this.selectedModel.id}:`, errorMessage);
      
      // 提供更友好的错误信息
      if (errorMessage.includes('model_not_supported') || errorMessage.includes('not supported')) {
        throw new Error(`Model "${this.selectedModel.id}" does not support chat requests. Please select a different model like gpt-4o or claude-sonnet-4.`);
      }
      throw error;
    }
  }

  /**
   * 进行对话（流式）
   */
  public async streamChat(
    messages: Array<{ role: string; content: string }>,
    onChunk: (text: string, done: boolean) => void
  ): Promise<void> {
    if (!this.selectedModel) {
      throw new Error('No model selected');
    }

    console.log(`Sending stream chat request to model: ${this.selectedModel.id}`);
    const chatMessages = this.convertToChatMessages(messages);

    try {
      const response = await this.selectedModel.sendRequest(
        chatMessages,
        {},
        new vscode.CancellationTokenSource().token
      );

      for await (const fragment of response.text) {
        onChunk(fragment, false);
      }
      onChunk('', true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Stream chat error with model ${this.selectedModel.id}:`, errorMessage);
      onChunk('', true);
      
      // 提供更友好的错误信息
      if (errorMessage.includes('model_not_supported') || errorMessage.includes('not supported')) {
        throw new Error(`Model "${this.selectedModel.id}" does not support chat requests. Please select a different model like gpt-4o or claude-sonnet-4.`);
      }
      throw error;
    }
  }

  /**
   * 转换消息为 VS Code 语言模型消息格式
   */
  private convertToChatMessages(messages: Array<{ role: string; content: string }>): vscode.LanguageModelChatMessage[] {
    return messages.map(m => {
      switch (m.role) {
        case 'system':
          return vscode.LanguageModelChatMessage.User(m.content); // 系统消息作为用户消息处理
        case 'assistant':
          return vscode.LanguageModelChatMessage.Assistant(m.content);
        case 'user':
        default:
          return vscode.LanguageModelChatMessage.User(m.content);
      }
    });
  }

  /**
   * 转换模型信息
   */
  private convertModel(model: vscode.LanguageModelChat): CopilotModel {
    return {
      id: model.id,
      name: model.name,
      vendor: model.vendor,
      family: model.family,
      version: model.version,
      maxInputTokens: model.maxInputTokens,
      maxOutputTokens: (model as any).maxOutputTokens ?? 4096,
    };
  }

  /**
   * 转换所有模型
   */
  private convertModels(): CopilotModel[] {
    return this.models.map(m => this.convertModel(m));
  }

  /**
   * 清理资源
   */
  public dispose() {
    this.selectedModel = null;
    this.models = [];
  }
}
