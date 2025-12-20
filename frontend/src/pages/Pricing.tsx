import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { PricingConfig } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, RefreshCw, Trash2, FileJson, FileText, Info } from 'lucide-react'

type EditMode = 'table' | 'json'

export function Pricing() {
  const [editMode, setEditMode] = useState<EditMode>('table')
  const [jsonValue, setJsonValue] = useState('')
  const [pricingRows, setPricingRows] = useState<
    Array<{ model: string; input: number; output: number }>
  >([])
  const [isInitialized, setIsInitialized] = useState(false)

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const response = await apiClient.getPricing()
      return response.data as PricingConfig
    },
  })

  // Initialize rows when data first loads - sync server state to local editable state
  useEffect(() => {
    if (data && !isInitialized) {
      const rows = Object.entries(data).map(([model, pricing]) => ({
        model,
        input: pricing.input,
        output: pricing.output,
      }))
      setPricingRows(rows)
      setJsonValue(JSON.stringify(data, null, 2))
      setIsInitialized(true)
    }
  }, [data, isInitialized])

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
          }
        }
      })
    } else {
      try {
        config = JSON.parse(jsonValue)
      } catch (error) {
        addToast('JSON格式错误', 'error')
        return
      }
    }

    saveMutation.mutate(config)
  }

  const toggleEditMode = () => {
    if (editMode === 'table') {
      // Switch to JSON
      const config: PricingConfig = {}
      pricingRows.forEach((row) => {
        if (row.model) {
          config[row.model] = {
            input: row.input || 0,
            output: row.output || 0,
          }
        }
      })
      setJsonValue(JSON.stringify(config, null, 2))
      setEditMode('json')
    } else {
      // Switch to table
      try {
        const config = JSON.parse(jsonValue)
        const rows = Object.entries(config).map(([model, pricing]: [string, unknown]) => ({
          model,
          input: (pricing as { input: number }).input || 0,
          output: (pricing as { output: number }).output || 0,
        }))
        setPricingRows(rows)
        setEditMode('table')
      } catch (error) {
        addToast('JSON格式错误', 'error')
      }
    }
  }

  const addRow = () => {
    setPricingRows([...pricingRows, { model: '', input: 0, output: 0 }])
  }

  const removeRow = (index: number) => {
    setPricingRows(pricingRows.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: 'model' | 'input' | 'output', value: any) => {
    const newRows = [...pricingRows]
    newRows[index][field] = value
    setPricingRows(newRows)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">定价管理</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={toggleEditMode}>
              {editMode === 'table' ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {editMode === 'table' ? '切换到JSON模式' : '切换到表格模式'}
            </Button>
            {editMode === 'table' && (
              <Button variant="secondary" onClick={addRow}>
                <Plus className="h-4 w-4" />
                添加模型
              </Button>
            )}
            <Button onClick={handleSave}>更新定价</Button>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>定价说明：</strong>
              基础配额单位：1百万token = $1.00 | 定价配置为不同模型相对于基础单位的倍率 |
              例如：gpt-4的input倍率为30，表示1百万token消耗30美元配额
            </AlertDescription>
          </Alert>

          {editMode === 'table' ? (
            isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : pricingRows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无定价配置，点击"添加模型"按钮添加
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模型名称</TableHead>
                    <TableHead>输入倍率</TableHead>
                    <TableHead>输出倍率</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={row.model}
                          onChange={(e) => updateRow(index, 'model', e.target.value)}
                          placeholder="例如: gpt-4"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.input}
                          onChange={(e) =>
                            updateRow(index, 'input', parseFloat(e.target.value) || 0)
                          }
                          step="0.000001"
                          min="0"
                          placeholder="0.001"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.output}
                          onChange={(e) =>
                            updateRow(index, 'output', parseFloat(e.target.value) || 0)
                          }
                          step="0.000001"
                          min="0"
                          placeholder="0.002"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="space-y-2">
              <Label htmlFor="jsonValue">定价配置 (JSON)</Label>
              <Textarea
                id="jsonValue"
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder='{"gpt-3.5-turbo": {"input": 0.001, "output": 0.002}, "gpt-4": {"input": 0.03, "output": 0.06}}'
              />
              <p className="text-sm text-muted-foreground">
                配置格式：模型名称 -&gt; {'{'}input: 输入倍率, output: 输出倍率{'}'}
                。倍率基于1百万token=$1.00计算
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
