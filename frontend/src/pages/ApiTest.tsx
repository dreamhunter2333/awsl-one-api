import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/api/client'
import { AudioTestResponse, TestResponse } from '@/types'
import { Send, Clock, CheckCircle, XCircle, Copy, Download } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { cn, copyToClipboard } from '@/lib/utils'

const requestTemplates: Record<string, any> = {
  '/v1/chat/completions': {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: 'Hello, how are you?',
      },
    ],
    temperature: 0.7,
    max_tokens: 100,
  },
  '/v1/messages': {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'Hello, Claude!',
      },
    ],
  },
  '/v1/responses': {
    model: 'gpt-4o-mini',
    input: 'Hello, Responses API!',
  },
  '/v1/audio/speech': {
    model: 'gpt-4o-mini-tts',
    input: 'The quick brown fox jumped over the lazy dog',
    voice: 'alloy',
  },
  '/v1/completions': {
    model: 'gpt-3.5-turbo-instruct',
    prompt: 'Once upon a time',
    max_tokens: 100,
    temperature: 0.7,
  },
}

export function ApiTest() {
  const [endpoint, setEndpoint] = useState('/v1/chat/completions')
  const [apiToken, setApiToken] = useState('')
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(requestTemplates['/v1/chat/completions'], null, 2)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [responseTime, setResponseTime] = useState<number>(0)
  const [statusCode, setStatusCode] = useState<number | null>(null)

  const { addToast } = useToast()

  const isAudioResponse = (value: TestResponse | { error: string } | null): value is AudioTestResponse => {
    return !!value && value.object === 'audio' && typeof value.url === 'string'
  }

  useEffect(() => {
    return () => {
      if (isAudioResponse(response)) {
        URL.revokeObjectURL(response.url)
      }
    }
  }, [response])

  const handleEndpointChange = (newEndpoint: string) => {
    setEndpoint(newEndpoint)
    setRequestBody(JSON.stringify(requestTemplates[newEndpoint], null, 2))
  }

  const handleCopyResponse = async () => {
    if (response) {
      try {
        const payload = isAudioResponse(response)
          ? {
              object: response.object,
              contentType: response.contentType,
              size: response.size,
              filename: response.filename,
            }
          : response
        await copyToClipboard(JSON.stringify(payload, null, 2))
        addToast('已复制到剪贴板', 'success')
      } catch {
        addToast('复制失败', 'error')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiToken) {
      addToast('请输入 API 令牌', 'error')
      return
    }

    let body: any
    try {
      body = JSON.parse(requestBody)
    } catch {
      addToast('请求体 JSON 格式错误', 'error')
      return
    }

    setIsLoading(true)
    setResponse(null)
    setStatusCode(null)

    const startTime = Date.now()

    try {
      const result = await apiClient.testApi(endpoint, apiToken, body)
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setResponse(result)
      setStatusCode(200)
    } catch (error: any) {
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setStatusCode(error.status || 500)
      setResponse({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageContainer
      title="API 测试"
      description="测试 API 连接和配置"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Request Panel */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">请求</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">端点</Label>
                <Select
                  value={endpoint}
                  onChange={(e) => handleEndpointChange(e.target.value)}
                >
                  <option value="/v1/chat/completions">/v1/chat/completions</option>
                  <option value="/v1/messages">/v1/messages</option>
                  <option value="/v1/responses">/v1/responses</option>
                  <option value="/v1/audio/speech">/v1/audio/speech</option>
                  <option value="/v1/completions">/v1/completions</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API 令牌</Label>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">请求体</Label>
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    发送请求
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card className={cn(
          "transition-all duration-300",
          !response && "opacity-60"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  !statusCode ? "bg-muted-foreground/30" :
                  statusCode === 200 ? "bg-success" : "bg-destructive"
                )} />
                <h3 className="font-semibold text-sm">响应</h3>
              </div>
              {statusCode && (
                <div className="flex items-center gap-2">
                  <Badge variant={statusCode === 200 ? 'success' : 'destructive'} className="text-xs">
                    {statusCode === 200 ? (
                      <><CheckCircle className="h-3 w-3 mr-1" />{statusCode}</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" />{statusCode}</>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    <Clock className="h-3 w-3 mr-1" />
                    {responseTime}ms
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopyResponse}
                    title="复制响应"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {response ? (
              isAudioResponse(response) ? (
                <div className="space-y-4 rounded-lg bg-muted/50 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">音频返回成功</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {response.contentType} · {response.size} bytes
                    </div>
                  </div>
                  <audio controls src={response.url} className="w-full" />
                  <Button asChild variant="outline" size="sm">
                    <a href={response.url} download={response.filename}>
                      <Download className="h-4 w-4" />
                      下载音频
                    </a>
                  </Button>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto scrollbar-thin">
                  {JSON.stringify(response, null, 2)}
                </pre>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground/40">
                <Send className="h-10 w-10 mb-3" />
                <p className="text-sm">发送请求后在此查看响应</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
