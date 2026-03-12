import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center">
          <Zap className="h-10 w-10 text-primary/40" />
        </div>
        <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl" />
      </div>
      <h1 className="text-6xl font-bold text-muted-foreground/20 mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-8">
        页面不存在
      </p>
      <Button variant="outline" size="lg" asChild className="rounded-xl">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首页
        </Link>
      </Button>
    </div>
  )
}
