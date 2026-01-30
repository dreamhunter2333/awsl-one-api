export type InputTokensDetails = {
    cached_tokens?: number;
}

export type OpenAIResponsesUsage = {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens_details?: InputTokensDetails;
    prompt_tokens_details?: InputTokensDetails;
}

export type OpenAIResponsesResponse = {
    usage?: OpenAIResponsesUsage;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens_details?: InputTokensDetails;
    prompt_tokens_details?: InputTokensDetails;
}

export type OpenAIResponsesStreamEvent = {
    type?: string;
    response?: OpenAIResponsesResponse;
    delta?: string;
    text?: string;
}

export const normalizeUsage = (raw?: OpenAIResponsesUsage): Usage | null => {
    if (!raw) return null

    const cachedTokens =
        raw.input_tokens_details?.cached_tokens ??
        raw.prompt_tokens_details?.cached_tokens ??
        0

    const rawInputTokens = raw.prompt_tokens ?? raw.input_tokens ?? 0

    const actualInputTokens = cachedTokens > 0
        ? Math.max(0, rawInputTokens - cachedTokens)
        : rawInputTokens

    const completionTokens = raw.completion_tokens ?? raw.output_tokens
    const totalTokens = raw.total_tokens ?? (
        (actualInputTokens ?? 0) + (cachedTokens ?? 0) + (completionTokens ?? 0)
    )

    if (actualInputTokens == null && completionTokens == null && totalTokens == null) {
        return null
    }

    return {
        prompt_tokens: actualInputTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cached_tokens: cachedTokens > 0 ? cachedTokens : undefined,
    }
}

export const extractUsageFromResponse = (res?: OpenAIResponsesResponse): Usage | null => {
    if (!res) return null

    const usageData: OpenAIResponsesUsage = {
        input_tokens: res.usage?.input_tokens ?? res.input_tokens,
        output_tokens: res.usage?.output_tokens ?? res.output_tokens,
        total_tokens: res.usage?.total_tokens ?? res.total_tokens,
        prompt_tokens: res.usage?.prompt_tokens ?? res.prompt_tokens,
        completion_tokens: res.usage?.completion_tokens ?? res.completion_tokens,
        input_tokens_details: res.usage?.input_tokens_details ?? res.input_tokens_details,
        prompt_tokens_details: res.usage?.prompt_tokens_details ?? res.prompt_tokens_details,
    }

    return normalizeUsage(usageData)
}

export const estimateTokensFromText = (text: string): number => {
    if (!text) return 0
    const bytes = new TextEncoder().encode(text).length
    return Math.ceil(bytes / 4)
}

export const estimateUsageFromBodies = (
    requestBody: any,
    responseBody?: any,
    streamedOutputText?: string
): Usage | null => {
    const promptText = requestBody ? JSON.stringify(requestBody) : ""
    const completionText = streamedOutputText
        ? streamedOutputText
        : (responseBody ? JSON.stringify(responseBody) : "")
    const promptTokens = estimateTokensFromText(promptText)
    const completionTokens = estimateTokensFromText(completionText)
    if (!promptTokens && !completionTokens) return null
    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
    }
}
