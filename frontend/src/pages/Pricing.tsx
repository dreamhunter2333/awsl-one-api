import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { PricingConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Trash2,
  FileJson,
  FileText,
  DollarSign,
  Check,
  Info,
  Search,
} from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'

type EditMode = 'table' | 'json'

export function Pricing() {
  const [editMode, setEditMode] = useState<EditMode>('table')
  const [jsonValue, setJsonValue] = useState('')
  const [pricingRows, setPricingRows] = useState<
    Array<{ model: string; input: number; output: number; cache: number }>
  >([])
  const [searchQuery, setSearchQuery] = useState('')

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const response = await apiClient.getPricing()
      return response.data as PricingConfig
    },
  })

  useEffect(() => {
    if (data) {
      const rows = Object.entries(data).map(([model, pricing]) => ({
        model,
        input: pricing.input,
        output: pricing.output,
        cache: pricing.cache || 0,
      }))
      setPricingRows(rows)
      setJsonValue(JSON.stringify(data, null, 2))
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (config: PricingConfig) => {
      return apiClient.savePricing(config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing'] })
      addToast('定价配置已保存', 'success')
    },
    onError: (error: Error) => {
      addToast('保存失败：' + error.message, 'error')
    },
  })

  const handleSave = () => {
    let config: PricingConfig

    if (editMode === 'table') {
      if (pricingRows.length === 0) {
        addToast('请至少添加一个模型定价', 'error')
        return
      }

      config = {}
      pricingRows.forEach((row) => {
        if (row.model) {
          config[row.model] = {
            input: row.input || 0,
            output: row.output || 0,
            cache: row.cache || 0,
          }
        }
      })
    } else {
      try {
        config = JSON.parse(jsonValue)
      } catch {
        addToast('JSON格式错误', 'error')
        return
      }
    }

    saveMutation.mutate(config)
  }

  const toggleEditMode = () => {
    if (editMode === 'table') {
      const config: PricingConfig = {}
      pricingRows.forEach((row) => {
        if (row.model) {
          config[row.model] = {
            input: row.input || 0,
            output: row.output || 0,
            cache: row.cache || 0,
          }
        }
      })
      setJsonValue(JSON.stringify(config, null, 2))
      setEditMode('json')
    } else {
      try {
        const config = JSON.parse(jsonValue)
        const rows = Object.entries(config).map(([model, pricing]: [string, unknown]) => ({
          model,
          input: (pricing as { input: number }).input || 0,
          output: (pricing as { output: number }).output || 0,
          cache: (pricing as { cache?: number }).cache || 0,
        }))
        setPricingRows(rows)
        setEditMode('table')
      } catch {
        addToast('JSON格式错误', 'error')
      }
    }
  }

  const addRow = () => {
    setPricingRows([...pricingRows, { model: '', input: 0, output: 0, cache: 0 }])
  }

  const removeRow = (index: number) => {
    setPricingRows(pricingRows.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: 'model' | 'input' | 'output' | 'cache', value: string | number) => {
    const newRows = [...pricingRows]
    ;(newRows[index] as any)[field] = value
    setPricingRows(newRows)
  }

  const filteredRows = pricingRows
    .map((row, index) => ({ ...row, _i: index }))
    .filter((row) => row.model.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <PageContainer
      title="定价管理"
      description="配置模型使用成本倍率"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={toggleEditMode}>
            {editMode === 'table' ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1">{editMode === 'table' ? 'JSON' : '表格'}</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            <Check className="h-4 w-4 mr-1" />
            保存
          </Button>
        </div>
      }
    >
      {/* Info */}
      <div className="mb-4 px-4 py-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-start gap-2.5">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
        <span>
          基础配额单位：<span className="font-mono text-foreground">1M tokens = $1.00</span>。
          倍率表示相对成本，如输入倍率 30 = 每百万 token 消耗 $30 配额。
        </span>
      </div>

      {editMode === 'table' ? (
        isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">加载中...</span>
            </div>
          </div>
        ) : pricingRows.length === 0 ? (
          <div className="rounded-xl border border-dashed flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">暂无定价配置</h3>
            <p className="text-muted-foreground text-sm mb-4">添加模型定价倍率</p>
            <Button onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              添加模型
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search */}
            {pricingRows.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索模型..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* Header */}
              <div className="grid gap-2 px-4 py-2.5 border-b bg-muted/30" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 40px' }}>
                <span className="text-xs font-medium text-muted-foreground">模型名称</span>
                <span className="text-xs font-medium text-muted-foreground">输入倍率</span>
                <span className="text-xs font-medium text-muted-foreground">输出倍率</span>
                <span className="text-xs font-medium text-muted-foreground">缓存倍率</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y">
                {filteredRows.map((row) => (
                  <div key={row._i} className="grid gap-2 px-4 py-2 items-center hover:bg-muted/20 transition-colors" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 40px' }}>
                    <Input
                      value={row.model}
                      onChange={(e) => updateRow(row._i, 'model', e.target.value)}
                      placeholder="模型名称"
                      className="font-mono text-sm h-8"
                    />
                    <Input
                      type="number"
                      value={row.input}
                      onChange={(e) => updateRow(row._i, 'input', parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0"
                      className="font-mono text-sm h-8"
                    />
                    <Input
                      type="number"
                      value={row.output}
                      onChange={(e) => updateRow(row._i, 'output', parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0"
                      className="font-mono text-sm h-8"
                    />
                    <Input
                      type="number"
                      value={row.cache}
                      onChange={(e) => updateRow(row._i, 'cache', parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0"
                      className="font-mono text-sm h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row._i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {filteredRows.length === 0 && searchQuery && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  没有匹配的模型
                </div>
              )}
            </div>

            {/* Add */}
            <button
              type="button"
              onClick={addRow}
              className="w-full py-2.5 border border-dashed rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              添加模型
            </button>
          </div>
        )
      ) : (
        <div className="rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">JSON 配置</Label>
            <Textarea
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder='{"gpt-4": {"input": 30, "output": 60, "cache": 3}, ...}'
            />
            <p className="text-xs text-muted-foreground">
              格式：模型名称 → {"{"} input: 输入倍率, output: 输出倍率, cache: 缓存倍率 {"}"}
            </p>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
