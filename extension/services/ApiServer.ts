import * as http from 'http';
import * as vscode from 'vscode';
import { URL } from 'url';
import {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionChunk,
  OpenAIModelsResponse,
  AnthropicMessageRequest,
  AnthropicMessageResponse,
  AnthropicStreamEvent,
  APIError,
  CopilotModel,
  ServerStatus,
} from '../../shared/types/api';
import { CopilotService } from './CopilotService';

/**
 * API 服务器 - 提供 OpenAI 和 Anthropic 兼容的 API 接口
 */
export class ApiServer {
  private server: http.Server | null = null;
  private port: number = 11435;
  private copilotService: CopilotService;
  private statusChangeCallback?: (status: ServerStatus) => void;

  constructor(copilotService: CopilotService) {
    this.copilotService = copilotService;
  }

  /**
   * 设置状态变更回调
   */
  public onStatusChange(callback: (status: ServerStatus) => void) {
    this.statusChangeCallback = callback;
  }

  /**
   * 获取当前状态
   */
  public getStatus(): ServerStatus {
    return {
      running: this.server !== null && this.server.listening,
      port: this.port,
      selectedModel: this.copilotService.getSelectedModel()?.id ?? null,
      url: this.server?.listening ? `http://localhost:${this.port}` : null,
    };
  }

  /**
   * 启动服务器
   */
  public async start(port: number): Promise<void> {
    if (this.server?.listening) {
      throw new Error('Server is already running');
    }

    this.port = port;
    
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      
      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(err);
        }
      });

      this.server.listen(port, '0.0.0.0', () => {
        console.log(`API Server started on port ${port}`);
        this.notifyStatusChange();
        resolve();
      });
    });
  }

  /**
   * 停止服务器
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('API Server stopped');
          this.server = null;
          this.notifyStatusChange();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private notifyStatusChange() {
    if (this.statusChangeCallback) {
      this.statusChangeCallback(this.getStatus());
    }
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    const path = url.pathname;

    try {
      // OpenAI 兼容端点
      if (path === '/v1/chat/completions' && req.method === 'POST') {
        await this.handleOpenAIChatCompletion(req, res);
      } else if (path === '/v1/models' && req.method === 'GET') {
        await this.handleOpenAIModels(req, res);
      }
      // Anthropic 兼容端点
      else if (path === '/v1/messages' && req.method === 'POST') {
        await this.handleAnthropicMessages(req, res);
      }
      // 健康检查
      else if (path === '/health' && req.method === 'GET') {
        this.sendJson(res, { status: 'ok', timestamp: new Date().toISOString() });
      }
      // 404
      else {
        this.sendError(res, 404, 'Not Found', 'invalid_request_error');
      }
    } catch (error) {
      console.error('Request handling error:', error);
      this.sendError(res, 500, error instanceof Error ? error.message : 'Internal Server Error', 'internal_error');
    }
  }

  /**
   * 解析请求体
   */
  private parseBody<T>(req: http.IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * 发送 JSON 响应
   */
  private sendJson(res: http.ServerResponse, data: unknown, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * 发送错误响应
   */
  private sendError(res: http.ServerResponse, status: number, message: string, type: string) {
    const error: APIError = {
      error: {
        message,
        type,
        code: status.toString(),
      }
    };
    this.sendJson(res, error, status);
  }

  /**
   * 发送 SSE 事件
   */
  private sendSSE(res: http.ServerResponse, event: string, data: unknown) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * 处理 OpenAI Chat Completion 请求
   */
  private async handleOpenAIChatCompletion(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.parseBody<OpenAIChatCompletionRequest>(req);
    
    console.log(`[API] OpenAI Chat Completion request - requested model: ${body.model}, stream: ${body.stream}`);
    
    if (!body.messages || body.messages.length === 0) {
      this.sendError(res, 400, 'messages is required', 'invalid_request_error');
      return;
    }

    const selectedModel = this.copilotService.getSelectedModel();
    const requestedModelId = (body.model ?? '').trim();
    const effectiveModelId = requestedModelId || selectedModel?.id;

    if (!effectiveModelId) {
      this.sendError(
        res,
        400,
        'No model specified. Provide "model" in the request body or select a model in the AI Omni sidebar.',
        'invalid_request_error'
      );
      return;
    }

    console.log(`[API] Using Copilot model: ${effectiveModelId}`);

    // 转换消息格式
    const messages = this.convertOpenAIMessages(body.messages);

    if (body.stream) {
      // 流式响应
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const responseId = this.generateId('chatcmpl');
      const created = Math.floor(Date.now() / 1000);

      try {
        await this.copilotService.streamChatWithModelId(effectiveModelId, messages, (text: string, done: boolean) => {
          const chunk: OpenAIChatCompletionChunk = {
            id: responseId,
            object: 'chat.completion.chunk',
            created,
            model: effectiveModelId, // 始终返回实际使用的模型
            choices: [{
              index: 0,
              delta: done ? {} : { content: text },
              finish_reason: done ? 'stop' : null,
            }],
          };
          this.sendSSE(res, 'data', chunk);

          if (done) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });
      } catch (error) {
        console.error('[API] Stream error:', error);
        // 尝试发送错误信息
        const errorMessage = error instanceof Error ? error.message : 'Stream failed';
        const errorChunk = {
          id: responseId,
          object: 'chat.completion.chunk',
          created,
          model: effectiveModelId,
          choices: [{
            index: 0,
            delta: { content: `\n\n[Error: ${errorMessage}]` },
            finish_reason: 'stop',
          }],
        };
        this.sendSSE(res, 'data', errorChunk);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // 非流式响应
      try {
        const responseText = await this.copilotService.chatWithModelId(effectiveModelId, messages);
        
        const response: OpenAIChatCompletionResponse = {
          id: this.generateId('chatcmpl'),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: effectiveModelId, // 始终返回实际使用的模型
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: responseText,
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: this.estimateTokens(messages.map(m => m.content).join('')),
            completion_tokens: this.estimateTokens(responseText),
            total_tokens: 0, // 会在下面计算
          },
        };
        response.usage.total_tokens = response.usage.prompt_tokens + response.usage.completion_tokens;

        console.log(`[API] Chat completion success, response length: ${responseText.length}`);
        this.sendJson(res, response);
      } catch (error) {
        console.error('[API] Chat completion error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Chat completion failed';
        const lower = errorMessage.toLowerCase();
        if (lower.includes('model_not_supported') || lower.includes('requested model is not supported')) {
          this.sendError(
            res,
            400,
            `The requested model is not supported by your Copilot account right now: "${effectiveModelId}". ` +
              `This is usually an entitlement/rollout/region limitation in GitHub Copilot, not an AI Omni issue. ` +
              `Try "gpt-4o" or check Copilot plan/settings. Original error: ${errorMessage}`,
            'invalid_request_error'
          );
          return;
        }
        this.sendError(res, 500, errorMessage, 'internal_error');
      }
    }
  }

  /**
   * 处理 OpenAI Models 请求
   */
  private async handleOpenAIModels(req: http.IncomingMessage, res: http.ServerResponse) {
    const models = await this.copilotService.getModels();
    
    const response: OpenAIModelsResponse = {
      object: 'list',
      data: models.map((m: CopilotModel) => ({
        id: m.id,
        object: 'model' as const,
        created: Math.floor(Date.now() / 1000),
        owned_by: m.vendor,
      })),
    };

    this.sendJson(res, response);
  }

  /**
   * 处理 Anthropic Messages 请求
   */
  private async handleAnthropicMessages(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.parseBody<AnthropicMessageRequest>(req);
    
    console.log(`[API] Anthropic Messages request - requested model: ${body.model}, stream: ${body.stream}`);
    
    if (!body.messages || body.messages.length === 0) {
      this.sendError(res, 400, 'messages is required', 'invalid_request_error');
      return;
    }

    const selectedModel = this.copilotService.getSelectedModel();
    const requestedModelId = (body.model ?? '').trim();
    const effectiveModelId = requestedModelId || selectedModel?.id;

    if (!effectiveModelId) {
      this.sendError(
        res,
        400,
        'No model specified. Provide "model" in the request body or select a model in the AI Omni sidebar.',
        'invalid_request_error'
      );
      return;
    }

    console.log(`[API] Using Copilot model: ${effectiveModelId}`);

    // 转换消息格式
    const messages = this.convertAnthropicMessages(body.messages, body.system);

    if (body.stream) {
      // 流式响应
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const responseId = this.generateId('msg');
      let totalOutputTokens = 0;

      try {
        // 发送 message_start 事件
        const messageStart: AnthropicStreamEvent = {
          type: 'message_start',
          message: {
            id: responseId,
            type: 'message',
            role: 'assistant',
            content: [],
            model: effectiveModelId, // 始终返回实际使用的模型
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: this.estimateTokens(messages.map(m => m.content).join('')), output_tokens: 0 },
          },
        };
        this.sendSSE(res, 'event', messageStart);

        // 发送 content_block_start
        const blockStart: AnthropicStreamEvent = {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        };
        this.sendSSE(res, 'event', blockStart);

        await this.copilotService.streamChatWithModelId(effectiveModelId, messages, (text: string, done: boolean) => {
          if (!done && text) {
            const delta: AnthropicStreamEvent = {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text },
            };
            this.sendSSE(res, 'event', delta);
            totalOutputTokens += this.estimateTokens(text);
          }

          if (done) {
            // 发送 content_block_stop
            const blockStop: AnthropicStreamEvent = {
              type: 'content_block_stop',
              index: 0,
            };
            this.sendSSE(res, 'event', blockStop);

            // 发送 message_delta
            const messageDelta: AnthropicStreamEvent = {
              type: 'message_delta',
              delta: { stop_reason: 'end_turn', stop_sequence: null },
              usage: { output_tokens: totalOutputTokens },
            };
            this.sendSSE(res, 'event', messageDelta);

            // 发送 message_stop
            const messageStop: AnthropicStreamEvent = {
              type: 'message_stop',
            };
            this.sendSSE(res, 'event', messageStop);

            res.end();
          }
        });
      } catch (error) {
        console.error('Stream error:', error);
        res.end();
      }
    } else {
      // 非流式响应
      try {
        const responseText = await this.copilotService.chatWithModelId(effectiveModelId, messages);
        
        const response: AnthropicMessageResponse = {
          id: this.generateId('msg'),
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: responseText }],
          model: effectiveModelId, // 始终返回实际使用的模型
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: this.estimateTokens(messages.map(m => m.content).join('')),
            output_tokens: this.estimateTokens(responseText),
          },
        };

        console.log(`[API] Anthropic message success, response length: ${responseText.length}`);
        this.sendJson(res, response);
      } catch (error) {
        console.error('[API] Anthropic message error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Message creation failed';
        const lower = errorMessage.toLowerCase();
        if (lower.includes('model_not_supported') || lower.includes('requested model is not supported')) {
          this.sendError(
            res,
            400,
            `The requested model is not supported by your Copilot account right now: "${effectiveModelId}". ` +
              `This is usually an entitlement/rollout/region limitation in GitHub Copilot, not an AI Omni issue. ` +
              `Try "gpt-4o" or check Copilot plan/settings. Original error: ${errorMessage}`,
            'invalid_request_error'
          );
          return;
        }
        this.sendError(res, 500, errorMessage, 'internal_error');
      }
    }
  }

  /**
   * 转换 OpenAI 消息格式为内部格式
   */
  private convertOpenAIMessages(messages: OpenAIChatCompletionRequest['messages']): Array<{ role: string; content: string }> {
    return messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content?.map(c => c.text || '').join('') || '',
    }));
  }

  /**
   * 转换 Anthropic 消息格式为内部格式
   */
  private convertAnthropicMessages(
    messages: AnthropicMessageRequest['messages'],
    system?: AnthropicMessageRequest['system']
  ): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];

    // 添加系统消息
    if (system) {
      const systemContent = typeof system === 'string' 
        ? system 
        : system.map(b => b.text).join('');
      result.push({ role: 'system', content: systemContent });
    }

    // 转换消息
    for (const m of messages) {
      const content = typeof m.content === 'string'
        ? m.content
        : m.content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map(b => b.text)
            .join('');
      result.push({ role: m.role, content });
    }

    return result;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(prefix: string): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = prefix + '-';
    for (let i = 0; i < 24; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * 估算 token 数量（简单估算）
   */
  private estimateTokens(text: string): number {
    // 简单估算: 约 4 个字符 = 1 个 token
    return Math.ceil(text.length / 4);
  }
}
