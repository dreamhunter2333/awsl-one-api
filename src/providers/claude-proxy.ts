import { Context } from "hono"

/**
 * Claude API Proxy Provider
 *
 * Implements relay/proxy functionality for Anthropic Claude API (/v1/messages endpoint)
 * Handles both streaming and non-streaming requests with token usage tracking
 */

// Claude-specific types
type ClaudeMessageResponse = {
    id: string;
    type: "message";
    role: "assistant";
    model: string;
    content: Array<{ type: "text"; text: string }>;
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

type ClaudeStreamEvent = {
    type: "message_start" | "content_block_start" | "content_block_delta" |
          "content_block_stop" | "message_delta" | "message_stop" | "message_complete" | "ping" | "error";
    message?: {
        usage: {
            input_tokens: number;
            output_tokens: number;
        };
    };
    delta?: {
        stop_reason?: string;
        stop_sequence?: string | null;
    };
    usage?: {
        input_tokens?: number;
        output_tokens: number;
    };
}

/**
 * Builds the proxy request for Claude API
 * - Removes Authorization header (client may send OpenAI format)
 * - Sets x-api-key header (Claude uses this instead of Authorization)
 * - Sets anthropic-version header (required by Claude API)
 * - Preserves all other headers from original request
 */
const buildProxyRequest = (
    request: Request,
    reqJson: any,
    config: ChannelConfig
): Request => {
    const url = new URL(request.url)
    const targetUrl = new URL(config.endpoint)

    // Claude API uses /v1/messages endpoint
    targetUrl.pathname = url.pathname

    const targetHeaders = new Headers(request.headers)

    // Remove Authorization header (client may send OpenAI format: "Authorization: Bearer sk-xxx")
    targetHeaders.delete("Authorization")

    // Claude uses x-api-key header instead of Authorization
    targetHeaders.set("x-api-key", config.api_key)

    // Required API version header
    targetHeaders.set("anthropic-version", config.api_version || "2023-06-01")

    // Ensure content-type is set
    targetHeaders.set("Content-Type", "application/json")

    return new Request(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: JSON.stringify(reqJson),
    })
}

/**
 * Extracts and saves usage data from Claude response
 * Claude provides usage in a different format than OpenAI:
 * - Non-streaming: usage.input_tokens + usage.output_tokens
 * - Streaming: message_start (input_tokens) + message_delta (output_tokens)
 */
const checkoutUsageData = async (
    saveUsage: (usage: Usage) => Promise<void>,
    response: Response | ClaudeMessageResponse
): Promise<void> => {
    try {
        const res = response instanceof Response
            ? await response.clone().json<ClaudeMessageResponse>()
            : response

        if (!res.usage) return;

        // Convert Claude usage format to internal Usage type
        const usage: Usage = {
            prompt_tokens: res.usage.input_tokens,
            completion_tokens: res.usage.output_tokens,
            total_tokens: res.usage.input_tokens + res.usage.output_tokens,
        }

        await saveUsage(usage)
    } catch (error) {
        console.error("Error logging Claude usage data:", error)
    }
}

/**
 * Processes Claude SSE stream data to extract token usage
 *
 * Claude SSE format:
 * event: message_start
 * data: {"type": "message_start", "message": {..., "usage": {"input_tokens": 20, "output_tokens": 1}}}
 *
 * event: message_delta
 * data: {"type": "message_delta", "delta": {...}, "usage": {"output_tokens": 50}}
 *
 * event: message_complete
 * data: {"type": "message_complete", "message": {..., "usage": {"input_tokens": 20, "output_tokens": 50}}}
 *
 * We can either:
 * 1. Accumulate input_tokens from message_start and output_tokens from message_delta
 * 2. Get complete usage from message_complete event (preferred as it's more reliable)
 */
const processStreamData = async (
    lines: string[],
    usageAccumulator: { input_tokens: number; output_tokens: number },
    saveUsage: (usage: Usage) => Promise<void>
): Promise<void> => {
    for (const line of lines) {
        const trimmedLine = line.trim()

        // Skip empty lines and non-data lines
        if (!trimmedLine.length || !trimmedLine.startsWith('data:')) continue

        // Extract JSON content after "data: " prefix
        const jsonContent = trimmedLine.replace('data:', '').trim()

        // Skip ping events
        if (jsonContent === '{}') continue

        try {
            const event = JSON.parse(jsonContent) as ClaudeStreamEvent

            // Extract input tokens from message_start event
            if (event.type === "message_start" && event.message?.usage) {
                usageAccumulator.input_tokens = event.message.usage.input_tokens
            }

            // Extract output tokens from message_delta event
            if (event.type === "message_delta" && event.usage) {
                usageAccumulator.output_tokens = event.usage.output_tokens
            }

            // Handle message_complete event (has complete usage info)
            if (event.type === "message_complete" && event.message?.usage) {
                const usage: Usage = {
                    prompt_tokens: event.message.usage.input_tokens,
                    completion_tokens: event.message.usage.output_tokens,
                    total_tokens: event.message.usage.input_tokens + event.message.usage.output_tokens,
                }
                await saveUsage(usage)
            }

            // When stream ends with message_stop (fallback for old API versions)
            if (event.type === "message_stop") {
                const usage: Usage = {
                    prompt_tokens: usageAccumulator.input_tokens,
                    completion_tokens: usageAccumulator.output_tokens,
                    total_tokens: usageAccumulator.input_tokens + usageAccumulator.output_tokens,
                }
                await saveUsage(usage)
            }
        } catch (e) {
            console.error("Error parsing Claude stream data:", e, "Line:", jsonContent)
        }
    }
}

/**
 * Handles Claude streaming response
 * - Reads the stream chunk by chunk
 * - Buffers incomplete lines
 * - Extracts token usage from SSE events
 * - Runs in background via c.executionCtx.waitUntil()
 */
const handleStreamResponse = async (
    c: Context<HonoCustomType>,
    streamForServer: ReadableStream<any> | undefined,
    saveUsage: (usage: Usage) => Promise<void>
): Promise<void> => {
    const reader = streamForServer?.getReader()
    if (!reader) {
        throw new Error("No reader found in response body")
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ""

    // Accumulator for token usage across stream events
    const usageAccumulator = {
        input_tokens: 0,
        output_tokens: 0,
    }

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Wait until we have complete lines
        if (!chunk.includes('\n')) continue

        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        await processStreamData(lines, usageAccumulator, saveUsage)
    }

    // Process any remaining buffered data
    if (buffer.trim()) {
        await processStreamData([buffer], usageAccumulator, saveUsage)
    }
}

/**
 * Main Claude proxy handler
 *
 * Flow:
 * 1. Extract and validate model from request
 * 2. Map model name via deployment_mapper
 * 3. Force stream: true for usage tracking (Claude doesn't need stream_options)
 * 4. Build proxy request with Claude-specific headers
 * 5. Forward request to Claude API
 * 6. For streaming: tee the response and extract usage in background
 * 7. For non-streaming: extract usage from response body
 */
export default {
    async fetch(
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        saveUsage: (usage: Usage) => Promise<void>,
    ): Promise<Response> {
        // Parse request body
        const reqJson = await c.req.json()
        const { model: modelName, stream } = reqJson;

        // Validate model support
        const deploymentName = config.deployment_mapper[modelName]
        if (!deploymentName) {
            throw new Error(`Model ${modelName} not supported`)
        }

        // Map model name
        reqJson.model = deploymentName

        // Force streaming for usage tracking
        // Unlike OpenAI, Claude doesn't need stream_options - usage is always included
        if (!stream) {
            // Even for non-streaming, we might want to force stream for consistency
            // But Claude's non-streaming response already includes usage, so we keep it as-is
        }

        // Build and send proxy request
        const proxyRequest = buildProxyRequest(c.req.raw, reqJson, config)
        const response = await fetch(proxyRequest)

        // Handle streaming response
        if (stream || reqJson.stream) {
            const [streamForClient, streamForServer] = response.body?.tee() || []

            // Process stream in background to extract usage
            c.executionCtx.waitUntil(handleStreamResponse(c, streamForServer, saveUsage))

            return new Response(streamForClient, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
            })
        }

        // Handle non-streaming response
        if (response.ok) {
            await checkoutUsageData(saveUsage, response)
        }

        return response
    }
}
