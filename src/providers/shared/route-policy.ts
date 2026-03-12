export type RouteId = "chat-completions" | "messages" | "responses"

type RoutePolicy = {
    allowedTypes: ChannelType[] | null
}

const ROUTE_POLICIES: Record<RouteId, RoutePolicy> = {
    "chat-completions": { allowedTypes: null },
    "messages":         { allowedTypes: null },
    "responses":        { allowedTypes: ["openai-responses", "azure-openai-responses"] },
}

export const resolveRouteId = (pathname: string): RouteId | null => {
    if (pathname.endsWith("/chat/completions")) return "chat-completions"
    if (pathname.endsWith("/messages")) return "messages"
    if (pathname.endsWith("/responses")) return "responses"
    return null
}

export const getRoutePolicy = (routeId: RouteId): RoutePolicy => {
    return ROUTE_POLICIES[routeId]
}
