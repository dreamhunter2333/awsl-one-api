import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Database as DatabaseIcon, Info } from 'lucide-react'

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">数据库管理</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>数据库初始化</CardTitle>
            <Button onClick={handleInit} disabled={initMutation.isPending}>
              <DatabaseIcon className="h-4 w-4" />
              {initMutation.isPending ? '初始化中...' : '初始化数据库'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>初始化数据库将创建必要的表结构。如果表已存在，操作将被忽略。</span>
          </div>

          {result && (
            <div className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {JSON.stringify(result, null, 2)}
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
