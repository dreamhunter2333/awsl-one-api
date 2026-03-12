/**
 * Mock upstream server that simulates OpenAI / Azure OpenAI / OpenAI Responses APIs.
 * Usage: npx tsx tests/mock-upstream.ts
 * Listens on port 9999.
 */

const PORT = 9999

// --- OpenAI Chat Completions (non-stream) ---
const openaiChatResponse = (model: string) => ({
  id: "chatcmpl-mock-001",
  object: "chat.completion",
  created: 1700000000,
  model,
  choices: [{
    index: 0,
    message: { role: "assistant", content: "Mock response from " + model },
    finish_reason: "stop",
  }],
  usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
})

// --- OpenAI Chat Completions (stream) ---
const openaiChatStreamChunks = (model: string) => [
  `data: ${JSON.stringify({ id: "chatcmpl-mock-001", object: "chat.completion.chunk", model, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }], usage: null })}\n\n`,
  `data: ${JSON.stringify({ id: "chatcmpl-mock-001", object: "chat.completion.chunk", model, choices: [{ index: 0, delta: { content: "Mock " }, finish_reason: null }], usage: null })}\n\n`,
  `data: ${JSON.stringify({ id: "chatcmpl-mock-001", object: "chat.completion.chunk", model, choices: [{ index: 0, delta: { content: "stream " }, finish_reason: null }], usage: null })}\n\n`,
  `data: ${JSON.stringify({ id: "chatcmpl-mock-001", object: "chat.completion.chunk", model, choices: [{ index: 0, delta: { content: "response" }, finish_reason: null }], usage: null })}\n\n`,
  `data: ${JSON.stringify({ id: "chatcmpl-mock-001", object: "chat.completion.chunk", model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } })}\n\n`,
  `data: [DONE]\n\n`,
]

// --- OpenAI Responses (non-stream) ---
const openaiResponsesResponse = (model: string) => ({
  id: "resp-mock-001",
  object: "response",
  created_at: 1700000000,
  status: "completed",
  model,
  output: [{
    id: "msg-mock-001",
    type: "message",
    status: "completed",
    content: [{ type: "output_text", text: "Mock responses output" }],
    role: "assistant",
  }],
  usage: { input_tokens: 8, output_tokens: 5, total_tokens: 13 },
})

// --- OpenAI Responses (stream) ---
const openaiResponsesStreamChunks = (model: string) => {
  const respId = "resp-mock-001"
  const msgId = "msg-mock-001"
  return [
    `event: response.created\ndata: ${JSON.stringify({ type: "response.created", response: { id: respId, object: "response", model, status: "in_progress", output: [], usage: null } })}\n\n`,
    `event: response.output_item.added\ndata: ${JSON.stringify({ type: "response.output_item.added", item: { id: msgId, type: "message", status: "in_progress", content: [], role: "assistant" }, output_index: 0 })}\n\n`,
    `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: "Mock ", item_id: msgId, output_index: 0, content_index: 0 })}\n\n`,
    `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: "stream", item_id: msgId, output_index: 0, content_index: 0 })}\n\n`,
    `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: respId, object: "response", model, status: "completed", output: [{ id: msgId, type: "message", status: "completed", content: [{ type: "output_text", text: "Mock stream" }], role: "assistant" }], usage: { input_tokens: 8, output_tokens: 4, total_tokens: 12 } } })}\n\n`,
  ]
}

// --- Claude Messages (non-stream) ---
const claudeMessagesResponse = (model: string) => ({
  id: "msg-mock-claude-001",
  type: "message",
  role: "assistant",
  model,
  content: [{ type: "text", text: "Mock Claude response" }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 12, output_tokens: 6 },
})

// --- Claude Messages (stream) ---
const claudeMessagesStreamChunks = (model: string) => [
  `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { id: "msg-mock-claude-001", type: "message", role: "assistant", model, content: [], stop_reason: null, usage: { input_tokens: 12, output_tokens: 0 } } })}\n\n`,
  `event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })}\n\n`,
  `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Mock Claude stream" } })}\n\n`,
  `event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`,
  `event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 4 } })}\n\n`,
  `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
]

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
    const model = (body as any).model || "mock-model"
    const isStream = (body as any).stream === true

    console.log(`[MOCK] ${req.method} ${path} model=${model} stream=${isStream}`)

    // OpenAI Chat Completions
    if (path.endsWith("/chat/completions")) {
      if (isStream) {
        const chunks = openaiChatStreamChunks(model)
        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(new TextEncoder().encode(chunk))
              await new Promise(r => setTimeout(r, 50))
            }
            controller.close()
          }
        })
        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
        })
      }
      return Response.json(openaiChatResponse(model))
    }

    // OpenAI Responses API
    if (path.endsWith("/responses")) {
      if (isStream) {
        const chunks = openaiResponsesStreamChunks(model)
        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(new TextEncoder().encode(chunk))
              await new Promise(r => setTimeout(r, 50))
            }
            controller.close()
          }
        })
        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
        })
      }
      return Response.json(openaiResponsesResponse(model))
    }

    // Claude Messages API
    if (path.endsWith("/messages")) {
      if (isStream) {
        const chunks = claudeMessagesStreamChunks(model)
        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(new TextEncoder().encode(chunk))
              await new Promise(r => setTimeout(r, 50))
            }
            controller.close()
          }
        })
        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
        })
      }
      return Response.json(claudeMessagesResponse(model))
    }

    return new Response("Mock: unknown route " + path, { status: 404 })
  },
})

console.log(`[MOCK] Upstream mock server running on http://localhost:${PORT}`)
