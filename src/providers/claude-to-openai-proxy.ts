import { Context } from "hono"

type OpenAIUsageLike = {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
}

type OpenAIStreamChoice = {
    index?: number;
    delta?: {
        role?: string;
        content?: string | Array<{ type?: string; text?: string }>;
        tool_calls?: Array<{
            index?: number;
            id?: string;
            type?: string;
            function?: {
                name?: string;
                arguments?: string;
            };
        }>;
    };
    finish_reason?: string | null;
}

type OpenAIStreamChunk = {
    id?: string;
    model?: string;
    choices?: OpenAIStreamChoice[];
    usage?: OpenAIUsageLike;
}

const mapFinishReasonToClaude = (finishReason?: string | null): string | null => {
    switch (finishReason) {
        case "stop":
            return "end_turn";
        case "length":
            return "max_tokens";
        case "tool_calls":
            return "tool_use";
        default:
            return null;
    }
}

const extractSystemText = (system: any): string | null => {
    if (typeof system === "string") {
        return system;
    }
    if (Array.isArray(system)) {
        let systemText = "";
        for (const block of system) {
            if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
                systemText += block.text;
            }
        }
        return systemText || null;
    }
    return null;
}

const extractTextFromContent = (content: any): string => {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map(part => (part && typeof part === "object" && typeof part.text === "string") ? part.text : "")
            .join("");
    }
    return "";
}

const buildProxyRequest = (
    request: Request,
    reqJson: any,
    config: ChannelConfig
): Request => {
    const targetUrl = new URL("v1/chat/completions", config.endpoint);
    const targetHeaders = new Headers(request.headers);

    targetHeaders.delete("Authorization");
    targetHeaders.delete("x-api-key");
    targetHeaders.set("Authorization", `Bearer ${config.api_key}`);

    return new Request(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: JSON.stringify(reqJson),
    });
}

const convertClaudeToOpenAIRequest = (reqJson: any): any => {
    const openaiReq: any = {
        model: reqJson.model,
        stream: reqJson.stream,
        max_tokens: reqJson.max_tokens,
        temperature: reqJson.temperature,
        top_p: reqJson.top_p,
    };

    if (Array.isArray(reqJson.stop_sequences) && reqJson.stop_sequences.length > 0) {
        openaiReq.stop = reqJson.stop_sequences;
    }

    const messages: any[] = [];
    const systemText = extractSystemText(reqJson.system);
    if (systemText) {
        messages.push({
            role: "system",
            content: systemText,
        });
    }

    if (Array.isArray(reqJson.messages)) {
        for (const msg of reqJson.messages) {
            const openaiMsg: any = {
                role: msg?.role,
            };
            const content = msg?.content;

            if (typeof content === "string") {
                openaiMsg.content = content;
            } else if (Array.isArray(content)) {
                const textParts: Array<{ type: "text"; text: string }> = [];
                const toolCalls: any[] = [];

                for (const block of content) {
                    if (!block || typeof block !== "object") continue;
                    const blockType = block.type;

                    if (blockType === "text") {
                        if (typeof block.text === "string") {
                            textParts.push({ type: "text", text: block.text });
                        }
                        continue;
                    }

                    if (blockType === "tool_use") {
                        const id = typeof block.id === "string" ? block.id : "";
                        const name = typeof block.name === "string" ? block.name : "";
                        let inputArgs = "{}";
                        try {
                            inputArgs = JSON.stringify(block.input ?? {});
                        } catch (error) {
                            inputArgs = "{}";
                        }
                        toolCalls.push({
                            id,
                            type: "function",
                            function: {
                                name,
                                arguments: inputArgs,
                            },
                        });
                        continue;
                    }

                    if (blockType === "tool_result") {
                        const toolUseId = typeof block.tool_use_id === "string" ? block.tool_use_id : "";
                        const toolContent = extractTextFromContent(block.content);
                        messages.push({
                            role: "tool",
                            content: toolContent,
                            tool_call_id: toolUseId,
                        });
                        continue;
                    }
                }

                if (toolCalls.length > 0) {
                    openaiMsg.tool_calls = toolCalls;
                }

                if (textParts.length === 1) {
                    openaiMsg.content = textParts[0].text;
                } else if (textParts.length > 0) {
                    openaiMsg.content = textParts;
                }
            }

            // 只有当消息有实际内容时才添加（避免空 user 消息）
            if (openaiMsg.content != null || openaiMsg.tool_calls) {
                messages.push(openaiMsg);
            }
        }
    }

    openaiReq.messages = messages;

    if (Array.isArray(reqJson.tools)) {
        openaiReq.tools = reqJson.tools.map((tool: any) => ({
            type: "function",
            function: {
                name: tool?.name,
                description: tool?.description,
                parameters: tool?.input_schema,
            },
        }));
    }

    return openaiReq;
}

const convertOpenAIResponseToClaude = (resJson: any): any => {
    const choice = Array.isArray(resJson?.choices) ? resJson.choices[0] : undefined;
    const message = choice?.message ?? {};

    const contentBlocks: any[] = [];
    const textContent = extractTextFromContent(message?.content);
    if (textContent) {
        contentBlocks.push({
            type: "text",
            text: textContent,
        });
    }

    if (Array.isArray(message?.tool_calls)) {
        for (const toolCall of message.tool_calls) {
            const id = typeof toolCall?.id === "string" ? toolCall.id : "";
            const name = typeof toolCall?.function?.name === "string" ? toolCall.function.name : "";
            let input = {};
            const args = toolCall?.function?.arguments;
            if (typeof args === "string") {
                try {
                    input = JSON.parse(args);
                } catch (error) {
                    input = {};
                }
            } else if (args && typeof args === "object") {
                input = args;
            }
            contentBlocks.push({
                type: "tool_use",
                id,
                name,
                input,
            });
        }
    }

    const usage = resJson?.usage ?? {};
    const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;

    return {
        id: resJson?.id ?? "",
        type: "message",
        role: "assistant",
        model: resJson?.model ?? "",
        content: contentBlocks,
        stop_reason: mapFinishReasonToClaude(choice?.finish_reason ?? null),
        stop_sequence: null,
        usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
        },
    };
}

const normalizeUsage = (raw?: OpenAIUsageLike): Usage | null => {
    if (!raw) return null;
    const promptTokens = raw.prompt_tokens ?? raw.input_tokens;
    const completionTokens = raw.completion_tokens ?? raw.output_tokens;
    const totalTokens = raw.total_tokens ?? (
        (promptTokens ?? 0) + (completionTokens ?? 0)
    );
    if (promptTokens == null && completionTokens == null && totalTokens == null) {
        return null;
    }
    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
    };
}

const createClaudeStreamTransformer = (
    saveUsage: (usage: Usage) => Promise<void>
): TransformStream<Uint8Array, Uint8Array> => {
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();

    let buffer = "";
    let messageStarted = false;
    let messageStopped = false;
    let messageId = "";
    let model = "";
    let textBlockIndex: number | null = null;
    let nextContentIndex = 0;
    let stopReason: string | null = null;
    let outputTokens = 0;
    let usageToSave: Usage | null = null;

    const toolBlocks = new Map<number, { contentIndex: number; id: string; name: string }>();
    const openBlocks: number[] = [];
    const openBlockSet = new Set<number>();

    const enqueueEvent = (
        controller: TransformStreamDefaultController<Uint8Array>,
        eventType: string,
        data: any
    ) => {
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
    };

    const startMessage = (controller: TransformStreamDefaultController<Uint8Array>, chunk?: OpenAIStreamChunk) => {
        if (messageStarted) return;
        messageId = chunk?.id ?? messageId ?? "";
        model = chunk?.model ?? model ?? "";
        messageStarted = true;
        enqueueEvent(controller, "message_start", {
            type: "message_start",
            message: {
                id: messageId || "",
                type: "message",
                role: "assistant",
                model: model || "",
                content: [],
                stop_reason: null,
                stop_sequence: null,
                usage: {
                    input_tokens: 0,
                    output_tokens: 0,
                },
            },
        });
    };

    const startContentBlock = (
        controller: TransformStreamDefaultController<Uint8Array>,
        index: number,
        contentBlock: any
    ) => {
        if (!openBlockSet.has(index)) {
            openBlockSet.add(index);
            openBlocks.push(index);
        }
        enqueueEvent(controller, "content_block_start", {
            type: "content_block_start",
            index,
            content_block: contentBlock,
        });
    };

    const ensureTextBlock = (controller: TransformStreamDefaultController<Uint8Array>) => {
        if (textBlockIndex == null) {
            textBlockIndex = nextContentIndex++;
            startContentBlock(controller, textBlockIndex, {
                type: "text",
                text: "",
            });
        }
        return textBlockIndex;
    };

    const ensureToolBlock = (
        controller: TransformStreamDefaultController<Uint8Array>,
        toolIndex: number,
        id: string,
        name: string
    ) => {
        const existing = toolBlocks.get(toolIndex);
        if (existing) {
            if (id && !existing.id) existing.id = id;
            if (name && !existing.name) existing.name = name;
            return existing.contentIndex;
        }
        const contentIndex = nextContentIndex++;
        toolBlocks.set(toolIndex, {
            contentIndex,
            id,
            name,
        });
        startContentBlock(controller, contentIndex, {
            type: "tool_use",
            id: id || "",
            name: name || "",
            input: {},
        });
        return contentIndex;
    };

    const handleFinish = (controller: TransformStreamDefaultController<Uint8Array>, finishReason?: string | null) => {
        if (messageStopped) return;
        if (!messageStarted) {
            startMessage(controller);
        }
        if (finishReason != null) {
            stopReason = mapFinishReasonToClaude(finishReason);
        }

        for (const index of openBlocks) {
            enqueueEvent(controller, "content_block_stop", {
                type: "content_block_stop",
                index,
            });
        }

        enqueueEvent(controller, "message_delta", {
            type: "message_delta",
            delta: {
                stop_reason: stopReason,
            },
            usage: {
                output_tokens: outputTokens,
            },
        });

        enqueueEvent(controller, "message_stop", {
            type: "message_stop",
        });

        messageStopped = true;
    };

    const processLine = (rawLine: string, controller: TransformStreamDefaultController<Uint8Array>) => {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) return;

        const jsonContent = line.replace(/^data:\s*/, "").trim();
        if (!jsonContent || jsonContent === "[DONE]") {
            if (jsonContent === "[DONE]") {
                handleFinish(controller, undefined);
            }
            return;
        }

        let chunkJson: OpenAIStreamChunk | null = null;
        try {
            chunkJson = JSON.parse(jsonContent) as OpenAIStreamChunk;
        } catch (error) {
            console.error("Error parsing OpenAI stream chunk:", error);
            return;
        }

        if (!chunkJson) return;

        if (chunkJson.usage) {
            const normalized = normalizeUsage(chunkJson.usage);
            if (normalized) {
                usageToSave = normalized;
                outputTokens = normalized.completion_tokens ?? outputTokens;
            }
        }

        const choice = Array.isArray(chunkJson.choices) ? chunkJson.choices[0] : undefined;
        if (!choice) return;

        const delta = choice.delta ?? {};
        if (!messageStarted && (delta.role === "assistant" || delta.content || delta.tool_calls)) {
            startMessage(controller, chunkJson);
        }

        if (delta.content) {
            const textBlocks = Array.isArray(delta.content)
                ? delta.content
                : [{ type: "text", text: delta.content }];
            for (const part of textBlocks) {
                const text = typeof part?.text === "string" ? part.text : "";
                if (!text) continue;
                const index = ensureTextBlock(controller);
                enqueueEvent(controller, "content_block_delta", {
                    type: "content_block_delta",
                    index,
                    delta: {
                        type: "text_delta",
                        text,
                    },
                });
            }
        }

        if (Array.isArray(delta.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
                const toolIndex = typeof toolCall?.index === "number" ? toolCall.index : 0;
                const id = typeof toolCall?.id === "string" ? toolCall.id : "";
                const name = typeof toolCall?.function?.name === "string" ? toolCall.function.name : "";
                const argumentsDelta = typeof toolCall?.function?.arguments === "string"
                    ? toolCall.function.arguments
                    : "";

                const contentIndex = ensureToolBlock(controller, toolIndex, id, name);

                if (argumentsDelta) {
                    enqueueEvent(controller, "content_block_delta", {
                        type: "content_block_delta",
                        index: contentIndex,
                        delta: {
                            type: "input_json_delta",
                            partial_json: argumentsDelta,
                        },
                    });
                }
            }
        }

        if (choice.finish_reason) {
            handleFinish(controller, choice.finish_reason);
        }
    };

    return new TransformStream<Uint8Array, Uint8Array>({
        async transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });

            if (!buffer.includes("\n")) {
                return;
            }

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const rawLine of lines) {
                processLine(rawLine, controller);
            }
        },
        async flush(controller) {
            if (buffer.trim()) {
                processLine(buffer, controller);
            }

            if (!messageStopped) {
                handleFinish(controller, stopReason ?? undefined);
            }

            if (usageToSave) {
                try {
                    await saveUsage(usageToSave);
                } catch (error) {
                    console.error("Error saving usage data:", error);
                }
            }
        },
    });
}

export default {
    async fetch(
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        requestBody: any,
        saveUsage: (usage: Usage) => Promise<void>,
    ): Promise<Response> {
        const { stream } = requestBody;

        // model 已在上层完成映射
        const openaiReq = convertClaudeToOpenAIRequest(requestBody);

        if (stream) {
            openaiReq.stream_options = {
                ...(openaiReq.stream_options || {}),
                include_usage: true,
            };
        }

        const proxyRequest = buildProxyRequest(c.req.raw, openaiReq, config);
        const response = await fetch(proxyRequest);

        if (stream) {
            if (!response.ok || !response.body) {
                return response;
            }

            const transformedStream = response.body.pipeThrough(
                createClaudeStreamTransformer(saveUsage)
            );
            const headers = new Headers(response.headers);
            headers.set("content-type", "text/event-stream; charset=utf-8");
            headers.delete("content-length");

            return new Response(transformedStream, {
                headers,
                status: response.status,
                statusText: response.statusText,
            });
        }

        if (response.ok) {
            try {
                const resJson = await response.clone().json();
                const usage = normalizeUsage(resJson?.usage);
                if (usage) {
                    await saveUsage(usage);
                }
                const claudeResp = convertOpenAIResponseToClaude(resJson);
                const headers = new Headers(response.headers);
                headers.set("content-type", "application/json");
                headers.delete("content-length");
                return new Response(JSON.stringify(claudeResp), {
                    headers,
                    status: response.status,
                    statusText: response.statusText,
                });
            } catch (error) {
                console.error("Error converting OpenAI response:", error);
            }
        }

        return response;
    }
}
