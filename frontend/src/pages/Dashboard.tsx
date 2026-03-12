import { Card, CardContent } from '@/components/ui/card'
import { Globe, Gauge, BarChart3, Shield, Zap, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: Globe,
    title: '多提供商支持',
    description: '支持 OpenAI、Azure OpenAI、Claude 等多种 AI 服务提供商。',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    iconBg: 'from-blue-500 to-cyan-500',
    delay: '0ms',
  },
  {
    icon: Gauge,
    title: '负载均衡',
    description: '自动在多个频道间分配请求，确保高可用性。',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconBg: 'from-emerald-500 to-teal-500',
    delay: '50ms',
  },
  {
    icon: BarChart3,
    title: '用量追踪',
    description: '实时监控 token 使用情况，精确成本核算。',
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconBg: 'from-amber-500 to-orange-500',
    delay: '100ms',
  },
  {
    icon: Shield,
    title: '安全管理',
    description: '基于令牌的访问控制与独立 API 密钥分配。',
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconBg: 'from-violet-500 to-purple-500',
    delay: '150ms',
  },
]

const steps = [
  { num: '01', title: '管理员登录', desc: '使用管理员令牌登录系统', color: 'text-blue-500' },
  { num: '02', title: '配置频道', desc: '添加 AI 服务提供商频道', color: 'text-emerald-500' },
  { num: '03', title: '创建令牌', desc: '为应用创建 API 令牌', color: 'text-amber-500' },
  { num: '04', title: '开始使用', desc: '使用令牌调用 API', color: 'text-violet-500' },
]

export function Dashboard() {
  const { isAuthenticated, openAuthModal } = useAuthStore()

  return (
    <div className="animate-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="gradient-mesh grid-pattern">
          <div className="px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Unified AI Gateway</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-5">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Awsl One API
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                统一的 AI 模型接口网关。支持多服务商接入、智能负载均衡与精确用量追踪。
              </p>
              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <>
                    <Button size="lg" asChild className="h-12 px-6 text-[15px] rounded-xl shadow-lg shadow-primary/20">
                      <Link to="/channels">
                        管理频道
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild className="h-12 px-6 text-[15px] rounded-xl">
                      <Link to="/api-test">测试 API</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" onClick={openAuthModal} className="h-12 px-6 text-[15px] rounded-xl shadow-lg shadow-primary/20">
                      管理员登录
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button variant="outline" size="lg" asChild className="h-12 px-6 text-[15px] rounded-xl">
                      <Link to="/api-test">体验 API</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-12 right-8 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="px-4 md:px-6 lg:px-8 pb-8 space-y-10">
        {/* Features Grid */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">核心特性</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover-lift border-0 bg-gradient-to-br from-card to-card overflow-hidden">
                <CardContent className="p-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-4 shadow-lg`}>
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1.5 text-[15px]">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 pb-2">
              <h2 className="text-lg font-semibold mb-1">快速开始</h2>
              <p className="text-sm text-muted-foreground">四步完成配置，开始使用统一接口</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {steps.map((step) => (
                <div key={step.num} className="p-6 group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className={`text-2xl font-bold ${step.color} opacity-60 group-hover:opacity-100 transition-opacity`}>
                        {step.num}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">{step.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Supported Providers */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">支持的服务提供商</p>
          <div className="flex items-center justify-center gap-6 flex-wrap text-muted-foreground/40">
            {['OpenAI', 'Azure OpenAI', 'Claude', 'OpenAI Responses'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm font-medium hover:text-muted-foreground transition-colors">
                <Zap className="h-3.5 w-3.5" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
