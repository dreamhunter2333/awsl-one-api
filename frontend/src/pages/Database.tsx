import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Database as DatabaseIcon, Info, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'

export function Database() {
  const [result, setResult] = useState<any>(null)
  const { addToast } = useToast()

  const initMutation = useMutation({
    mutationFn: async () => {
      return apiClient.initDatabase()
    },
    onSuccess: (data) => {
      setResult(data)
      addToast('数据库初始化成功', 'success')
    },
    onError: (error: any) => {
      setResult({ error: error.message })
      addToast('数据库初始化失败：' + error.message, 'error')
    },
  })

  const handleInit = () => {
    if (confirm('确定要初始化数据库吗？此操作将创建必要的表结构。')) {
      initMutation.mutate()
    }
  }

  return (
    <PageContainer
      title="数据库管理"
      description="管理数据库结构和初始化"
    >
      <div className="space-y-4">
        {/* Init Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <DatabaseIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">数据库初始化</h3>
                  <p className="text-sm text-muted-foreground">
                    创建必要的表结构。如果表已存在，操作将被忽略。
                  </p>
                </div>
              </div>
              <Button
                onClick={handleInit}
                disabled={initMutation.isPending}
                className="flex-shrink-0"
              >
                {initMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    初始化中...
                  </>
                ) : (
                  <>
                    <DatabaseIcon className="h-4 w-4" />
                    初始化数据库
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="px-4 py-3 rounded-xl bg-muted/50 text-sm text-muted-foreground flex items-start gap-2.5">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-info" />
          <span>数据库使用 Cloudflare D1，初始化操作幂等安全，可重复执行。</span>
        </div>

        {/* Result */}
        {result && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                {result.error ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                <h3 className="font-semibold text-sm">
                  {result.error ? '执行出错' : '执行结果'}
                </h3>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
