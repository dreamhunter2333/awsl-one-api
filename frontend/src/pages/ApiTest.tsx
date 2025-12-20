import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/api/client'
import { Send } from 'lucide-react'

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

  const handleEndpointChange = (newEndpoint: string) => {
    setEndpoint(newEndpoint)
    setRequestBody(JSON.stringify(requestTemplates[newEndpoint], null, 2))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiToken) {
      addToast('请输入API令牌', 'error')
      return
    }

    let body: any
    try {
      body = JSON.parse(requestBody)
    } catch (error) {
      addToast('请求体JSON格式错误', 'error')
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
      addToast('请求成功', 'success')
    } catch (error: any) {
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setStatusCode(error.status || 500)
      setResponse({ error: error.message })
      addToast('请求失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">API 测试</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API 测试工具</CardTitle>
          <CardDescription>测试您的 API 连接和配置</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">API 端点</Label>
                <Select
                  id="endpoint"
                  value={endpoint}
                  onChange={(e) => handleEndpointChange(e.target.value)}
                >
                  <option value="/v1/chat/completions">/v1/chat/completions</option>
                  <option value="/v1/messages">/v1/messages</option>
                  <option value="/v1/completions">/v1/completions</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiToken">API 令牌</Label>
                <Input
                  id="apiToken"
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="sk-..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestBody">请求体 (JSON)</Label>
              <Textarea
                id="requestBody"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder='{"model": "gpt-3.5-turbo", "messages": [...]}'
              />
              <p className="text-sm text-muted-foreground">直接编辑 JSON 格式的请求体</p>
            </div>

            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4" />
              {isLoading ? '发送中...' : '发送请求'}
            </Button>
          </form>

          {response && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">响应结果</h3>
                <div className="flex gap-2">
                  <Badge variant={statusCode === 200 ? 'success' : 'destructive'}>
                    {statusCode === 200 ? '成功' : '失败'}
                  </Badge>
                  <Badge variant="outline">{responseTime}ms</Badge>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <pre className="whitespace-pre-wrap break-words text-sm font-mono max-h-96 overflow-y-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
