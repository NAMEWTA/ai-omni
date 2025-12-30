import * as vscode from 'vscode';
import { CopilotModel } from '../../shared/types/api';

/**
 * Copilot 服务 - 集成 VS Code 语言模型 API
 */
export class CopilotService {
  private selectedModelId: string | null = null;
  private selectedModelVendor: string | null = null;
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
    // 每次都重新获取最新的模型列表
    this.models = await vscode.lm.selectChatModels();
    return this.convertModels();
  }

  /**
   * 选择模型
   */
  public async selectModel(modelId: string): Promise<boolean> {
    // 确保使用最新的模型列表（避免缓存过期）
    this.models = await vscode.lm.selectChatModels();
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      this.selectedModelId = model.id;
      this.selectedModelVendor = model.vendor;
      console.log(`Selected model: ${modelId} (vendor: ${model.vendor})`);
      return true;
    }
    console.error(`Model not found: ${modelId}`);
    return false;
  }

  /**
   * 获取当前选中的模型信息
   */
  public getSelectedModel(): CopilotModel | null {
    if (!this.selectedModelId) {
      return null;
    }
    const model = this.models.find(m => m.id === this.selectedModelId);
    if (!model) {
      return null;
    }
    return this.convertModel(model);
  }

  /**
   * 动态获取模型实例（每次调用时获取最新的引用）
   */
  private async getModelInstance(): Promise<vscode.LanguageModelChat> {
    if (!this.selectedModelId) {
      throw new Error('No model selected');
    }

    return this.getModelInstanceById(this.selectedModelId, this.selectedModelVendor ?? undefined);
  }

  private async getModelInstanceById(modelId: string, vendorHint?: string): Promise<vscode.LanguageModelChat> {
    const models = await vscode.lm.selectChatModels({ id: modelId });
    if (models.length > 0) {
      return models[0];
    }

    // 少数情况下 id 选择不到，尝试 vendor 作为兜底（参考用户给的 vendor 筛选实现）
    if (vendorHint) {
      const vendorModels = await vscode.lm.selectChatModels({ vendor: vendorHint });
      const model = vendorModels.find(m => m.id === modelId);
      if (model) {
        return model;
      }
    }

    throw new Error(`Model "${modelId}" not found or not available`);
  }

  /**
   * 按请求指定模型进行对话（非流式）
   */
  public async chatWithModelId(
    modelId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    const model = await this.getModelInstanceById(modelId);
    console.log(`Sending chat request to model: ${model.id} (vendor: ${model.vendor}, family: ${model.family})`);
    const chatMessages = this.convertToChatMessages(messages);

    try {
      const response = await model.sendRequest(
        chatMessages,
        { justification: 'AI Omni API request' },
        new vscode.CancellationTokenSource().token
      );

      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }
      return result;
    } catch (error: unknown) {
      if (error instanceof vscode.LanguageModelError) {
        console.error(`LanguageModelError: ${error.message}, code: ${error.code}`);
        throw new Error(`Model error (${error.code}): ${error.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Chat error with model ${model.id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 按请求指定模型进行对话（流式）
   */
  public async streamChatWithModelId(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    onChunk: (text: string, done: boolean) => void
  ): Promise<void> {
    const model = await this.getModelInstanceById(modelId);
    console.log(`Sending stream chat request to model: ${model.id} (vendor: ${model.vendor}, family: ${model.family})`);
    const chatMessages = this.convertToChatMessages(messages);

    try {
      const response = await model.sendRequest(
        chatMessages,
        { justification: 'AI Omni API request' },
        new vscode.CancellationTokenSource().token
      );

      for await (const fragment of response.text) {
        onChunk(fragment, false);
      }
      onChunk('', true);
    } catch (error: unknown) {
      onChunk('', true);
      if (error instanceof vscode.LanguageModelError) {
        console.error(`LanguageModelError: ${error.message}, code: ${error.code}`);
        throw new Error(`Model error (${error.code}): ${error.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Stream chat error with model ${model.id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 进行对话（非流式）
   */
  public async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    // 每次调用时动态获取模型实例
    const model = await this.getModelInstance();

    console.log(`Sending chat request to model: ${model.id} (vendor: ${model.vendor}, family: ${model.family})`);
    const chatMessages = this.convertToChatMessages(messages);
    
    try {
      const response = await model.sendRequest(
        chatMessages,
        {
          justification: 'AI Omni API request'
        },
        new vscode.CancellationTokenSource().token
      );

      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }
      return result;
    } catch (error: unknown) {
      // 处理 VS Code 语言模型错误
      if (error instanceof vscode.LanguageModelError) {
        console.error(`LanguageModelError: ${error.message}, code: ${error.code}`);
        throw new Error(`Model error (${error.code}): ${error.message}`);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Chat error with model ${model.id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 进行对话（流式）
   */
  public async streamChat(
    messages: Array<{ role: string; content: string }>,
    onChunk: (text: string, done: boolean) => void
  ): Promise<void> {
    // 每次调用时动态获取模型实例
    const model = await this.getModelInstance();

    console.log(`Sending stream chat request to model: ${model.id} (vendor: ${model.vendor}, family: ${model.family})`);
    const chatMessages = this.convertToChatMessages(messages);

    try {
      const response = await model.sendRequest(
        chatMessages,
        {
          justification: 'AI Omni API request'
        },
        new vscode.CancellationTokenSource().token
      );

      for await (const fragment of response.text) {
        onChunk(fragment, false);
      }
      onChunk('', true);
    } catch (error: unknown) {
      onChunk('', true);
      
      // 处理 VS Code 语言模型错误
      if (error instanceof vscode.LanguageModelError) {
        console.error(`LanguageModelError: ${error.message}, code: ${error.code}`);
        throw new Error(`Model error (${error.code}): ${error.message}`);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Stream chat error with model ${model.id}:`, errorMessage);
      throw new Error(errorMessage);
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
    this.selectedModelId = null;
    this.selectedModelVendor = null;
    this.models = [];
  }
}
