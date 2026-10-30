import type { ApplicationRequest } from './ApplicationRequest.js';

/**
 * CLI 交给应用层的惰性命令输入。
 * 应用层先完成文档等状态检查，再调用 parse()，以保持原有错误优先级。
 */
export interface ApplicationCommandInput {
  readonly name: string;
  readonly parse: () => ApplicationRequest;
}

/** 应用层分发器保存的统一处理器签名。 */
export type ApplicationCommandHandler =
  (input: ApplicationCommandInput) => readonly string[];

/** 命令处理器注册签名；具体命令按自己的请求类型收窄。 */
export type ApplicationRequestHandler<TRequest extends ApplicationRequest> =
  (parse: () => TRequest) => readonly string[];
