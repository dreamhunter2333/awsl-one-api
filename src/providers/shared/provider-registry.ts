import { Context } from "hono"

import azureOpenaiProxy from "../azure-openai-proxy"
import openaiProxy from "../openai-proxy"
import claudeProxy from "../claude-proxy"
import claudeToOpenaiProxy from "../claude-to-openai-proxy"
import openaiResponsesProxy from "../openai-responses-proxy"
import azureOpenaiResponsesProxy from "../azure-openai-responses-proxy"

type ProviderFetch = (
    c: Context<HonoCustomType>,
    config: ChannelConfig,
    requestBody: any,
    saveUsage: (usage: Usage) => Promise<void>
) => Promise<Response>

const providerMap: Record<string, ProviderFetch> = {
    "azure-openai": azureOpenaiProxy.fetch,
    "openai": openaiProxy.fetch,
    "azure-openai-audio": azureOpenaiProxy.fetch,
    "openai-audio": openaiProxy.fetch,
    "claude": claudeProxy.fetch,
    "claude-to-openai": claudeToOpenaiProxy.fetch,
    "openai-responses": openaiResponsesProxy.fetch,
    "azure-openai-responses": azureOpenaiResponsesProxy.fetch,
}

export const getProvider = (type: string): ProviderFetch | undefined => {
    return providerMap[type]
}
