import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Gauge, BarChart3, Shield, Zap, ArrowRight } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: Globe,
    title: '多提供商支持',
    description: '支持 OpenAI、Azure OpenAI 和 Claude API，轻松切换不同的 AI 服务。',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Gauge,
    title: '负载均衡',
    description: '自动在多个频道间分配请求，确保服务稳定性和高可用性。',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: BarChart3,
    title: '用量追踪',
    description: '实时监控 token 使用情况，精确计算成本，防止超出配额。',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Shield,
    title: '安全管理',
    description: '基于令牌的访问控制，为不同用户分配独立的 API 密钥。',
    color: 'from-purple-500 to-purple-600',
  },
]

const steps = [
  { num: '01', title: '管理员登录', desc: '使用管理员令牌登录系统' },
  { num: '02', title: '配置频道', desc: '添加 OpenAI、Azure 或 Claude API 频道' },
  { num: '03', title: '创建令牌', desc: '为您的应用创建 API 令牌' },
  { num: '04', title: '开始使用', desc: '使用生成的令牌调用 API' },
]

export function Dashboard() {
  const { isAuthenticated, openAuthModal } = useAuthStore()

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in">
      <div className="space-y-8">
        {/* Hero Section */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-8 md:p-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Zap className="h-4 w-4" />
                统一 AI 接口网关
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                欢迎使用 Awsl One API
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                一个强大的 API 代理和管理平台，为您提供统一的 AI 模型接口管理服务。
                支持多种 AI 服务提供商，实现智能负载均衡和精确用量追踪。
              </p>
              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <>
                    <Button asChild>
                      <Link to="/channels">
                        管理频道
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/api-test">测试 API</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={openAuthModal}>
                      管理员登录
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/api-test">体验 API</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">核心特性</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover-lift">
                <CardContent className="p-6">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
            <CardDescription>按照以下步骤开始使用</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div key={step.num} className="relative">
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-border -translate-x-4" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground">{step.num}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
