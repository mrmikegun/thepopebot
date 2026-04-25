/**
 * Helper LLM — small one-shot completions used by the event handler itself
 * (chat titles, agent-job summaries, agent-job titles). Independent of the
 * coding agent and the streaming chat path.
 *
 * Provider/model is set at /admin/event-handler/helper-llm and stored as
 * LLM_PROVIDER / LLM_MODEL config keys. Credentials live in the same settings
 * DB used by /admin/event-handler/llms.
 */

import { generateText, generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getConfig } from '../config.js';
import { getCustomProvider } from '../db/config.js';
import { BUILTIN_PROVIDERS } from '../llm-providers.js';

/**
 * Build the active LanguageModelV2 instance for helper LLM calls.
 * Reads LLM_PROVIDER + LLM_MODEL from config and selects the right adapter.
 *
 * @returns {import('ai').LanguageModelV2}
 */
function resolveModel() {
  const slug = getConfig('LLM_PROVIDER');
  const modelName = getConfig('LLM_MODEL');
  if (!slug) throw new Error('LLM_PROVIDER not configured');
  if (!modelName) throw new Error('LLM_MODEL not configured');

  if (slug === 'anthropic') {
    return createAnthropic({ apiKey: getConfig('ANTHROPIC_API_KEY') })(modelName);
  }
  if (slug === 'google') {
    return createGoogleGenerativeAI({ apiKey: getConfig('GOOGLE_API_KEY') })(modelName);
  }
  if (slug === 'openai') {
    return createOpenAI({ apiKey: getConfig('OPENAI_API_KEY') })(modelName);
  }

  // Built-in OpenAI-compatible providers (deepseek, mistral, xai, kimi, openrouter, nvidia)
  const builtin = BUILTIN_PROVIDERS[slug];
  if (builtin) {
    if (!builtin.baseUrl) throw new Error(`Provider ${slug} has no baseUrl`);
    return createOpenAICompatible({
      name: slug,
      baseURL: builtin.baseUrl,
      apiKey: getConfig(builtin.credentials[0].key),
    })(modelName);
  }

  // Custom user-added OpenAI-compatible provider
  const custom = getCustomProvider(slug);
  if (custom) {
    return createOpenAICompatible({
      name: slug,
      baseURL: custom.baseUrl,
      apiKey: custom.apiKey || 'not-needed',
    })(modelName);
  }

  throw new Error(`Unknown LLM provider: ${slug}`);
}

/**
 * Plain-text helper LLM call. Returns the trimmed text.
 *
 * @param {object} args
 * @param {string} args.system - System prompt
 * @param {string} args.user - User prompt
 * @param {number} args.maxTokens - Max output tokens
 * @returns {Promise<string>}
 */
export async function callHelperLlm({ system, user, maxTokens }) {
  const model = resolveModel();
  const { text } = await generateText({
    model,
    system,
    prompt: user,
    maxOutputTokens: maxTokens,
  });
  return (text || '').trim();
}

/**
 * Structured helper LLM call. Returns the parsed object matching the schema.
 * Throws if the response can't be parsed or fails schema validation —
 * callers catch and fall back as appropriate.
 *
 * @param {object} args
 * @param {string} args.system - System prompt
 * @param {string} args.user - User prompt
 * @param {import('zod').ZodTypeAny} args.schema - Zod schema for the output
 * @param {number} args.maxTokens - Max output tokens
 * @returns {Promise<unknown>}
 */
export async function callHelperLlmStructured({ system, user, schema, maxTokens }) {
  const model = resolveModel();
  const { object } = await generateObject({
    model,
    system,
    prompt: user,
    schema,
    maxOutputTokens: maxTokens,
  });
  return object;
}
