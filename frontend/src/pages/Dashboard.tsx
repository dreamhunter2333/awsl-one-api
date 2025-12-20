import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Gauge, BarChart3, Shield } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>欢迎使用 Awsl One API</CardTitle>
          <CardDescription>统一的 AI 模型接口管理服务</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Awsl One API 是一个强大的 API 代理和管理平台，为您提供统一的 AI 模型接口管理服务。
          </p>

          <div>
            <h3 className="font-semibold mb-4">核心特性</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-2">多提供商支持</h4>
                      <p className="text-sm text-muted-foreground">
                        支持 OpenAI、Azure OpenAI 和 Claude API，轻松切换不同的 AI 服务。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Gauge className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-2">负载均衡</h4>
                      <p className="text-sm text-muted-foreground">
                        自动在多个频道间分配请求，确保服务稳定性和高可用性。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-2">用量追踪</h4>
                      <p className="text-sm text-muted-foreground">
                        实时监控 token 使用情况，精确计算成本，防止超出配额。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-2">安全管理</h4>
                      <p className="text-sm text-muted-foreground">
                        基于令牌的访问控制，为不同用户分配独立的 API 密钥。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>快速开始</CardTitle>
          <CardDescription>按照以下步骤开始使用</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">管理员登录：</strong>使用管理员令牌登录系统
            </li>
            <li>
              <strong className="text-foreground">配置频道：</strong>添加 OpenAI、Azure 或 Claude API 频道
            </li>
            <li>
              <strong className="text-foreground">创建令牌：</strong>为您的应用创建 API 令牌
            </li>
            <li>
              <strong className="text-foreground">开始使用：</strong>使用生成的令牌调用 API
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
