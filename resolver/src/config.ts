import { z } from 'zod';

export const Env = z.object({
  PORT: z.coerce.number().default(8788),
  NEARAI_API_KEY: z.string().optional(),
  NEARAI_BASE_URL: z.string().url().default('https://cloud-api.near.ai/v1'),
  JUDGE_MODELS: z.string().default('moonshotai/kimi-k2.6,deepseek/deepseek-v3.2,qwen/qwen3.5-397b-a17b'),
  DRAFT_MODEL: z.string().default('z-ai/glm-5.3-flash'),
  ACCEPTED_TCB: z.string().default('UpToDate'),
  RESOLVER_TOKEN: z.string().min(16).optional(),
});
export type Env = z.infer<typeof Env>;
export const loadEnv = (src: NodeJS.ProcessEnv = process.env): Env => Env.parse(src);
