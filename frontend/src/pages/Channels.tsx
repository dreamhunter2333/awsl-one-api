import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Channel, ChannelConfig } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, RefreshCw, Pencil, Trash2, FileJson, FileText } from 'lucide-react'

type EditMode = 'form' | 'json'

export function Channels() {
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editMode, setEditMode] = useState<EditMode>('form')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [formData, setFormData] = useState<ChannelConfig>({
    name: '',
    type: 'azure-openai',
    endpoint: '',
    api_key: '',
    api_version: '',
    deployment_mapper: {},
  })
  const [channelKey, setChannelKey] = useState('')
  const [jsonValue, setJsonValue] = useState('')
  const [mapperRows, setMapperRows] = useState<Array<{ request: string; deployment: string }>>([])

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await apiClient.getChannels()
      return response.data as Channel[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ key, config }: { key: string; config: any }) => {
      return apiClient.saveChannel(key, config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      addToast(editingKey ? '频道更新成功' : '频道添加成功', 'success')
      resetForm()
      setView('list')
    },
    onError: (error: any) => {
      addToast('保存失败：' + error.message, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiClient.deleteChannel(key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      addToast('频道已删除', 'success')
    },
    onError: (error: any) => {
      addToast('删除失败：' + error.message, 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'azure-openai',
      endpoint: '',
      api_key: '',
      api_version: '',
      deployment_mapper: {},
    })
    setChannelKey('')
    setJsonValue('')
    setMapperRows([])
    setEditingKey(null)
    setEditMode('form')
  }

  const handleAdd = () => {
    resetForm()
    setView('form')
  }

  const handleEdit = (channel: Channel) => {
    setEditingKey(channel.key)
    setChannelKey(channel.key)
    const config = typeof channel.value === 'string' ? JSON.parse(channel.value) : channel.value
    setFormData(config)
    setJsonValue(JSON.stringify(config, null, 2))

    // Convert deployment_mapper to rows
    if (config.deployment_mapper) {
      const rows = Object.entries(config.deployment_mapper).map(([request, deployment]) => ({
        request,
        deployment: deployment as string,
      }))
      setMapperRows(rows)
    }

    setView('form')
  }

  const handleDelete = (key: string) => {
    if (confirm(`确定要删除频道 "${key}" 吗？`)) {
      deleteMutation.mutate(key)
    }
  }

  const handleSave = () => {
    if (!channelKey) {
      addToast('请填写频道标识', 'error')
      return
    }

    let config: any
    if (editMode === 'form') {
      if (!formData.name || !formData.endpoint || !formData.api_key) {
        addToast('请填写所有必填字段', 'error')
        return
      }

      // Build deployment_mapper from rows
      const deployment_mapper: Record<string, string> = {}
      mapperRows.forEach((row) => {
        if (row.request && row.deployment) {
          deployment_mapper[row.request] = row.deployment
        }
      })

      config = {
        ...formData,
        deployment_mapper,
      }
      if (!formData.api_version) {
        delete config.api_version
      }
    } else {
      try {
        config = JSON.parse(jsonValue)
      } catch (error) {
        addToast('JSON格式错误', 'error')
        return
      }
    }

    saveMutation.mutate({ key: channelKey, config })
  }

  const toggleEditMode = () => {
    if (editMode === 'form') {
      // Switch to JSON
      const deployment_mapper: Record<string, string> = {}
      mapperRows.forEach((row) => {
        if (row.request && row.deployment) {
          deployment_mapper[row.request] = row.deployment
        }
      })
      const config = { ...formData, deployment_mapper }
      setJsonValue(JSON.stringify(config, null, 2))
      setEditMode('json')
    } else {
      // Switch to form
      try {
        const config = JSON.parse(jsonValue)
        setFormData(config)
        if (config.deployment_mapper) {
          const rows = Object.entries(config.deployment_mapper).map(([request, deployment]) => ({
            request,
            deployment: deployment as string,
          }))
          setMapperRows(rows)
        }
        setEditMode('form')
      } catch (error) {
        addToast('JSON格式错误', 'error')
      }
    }
  }

  const addMapperRow = () => {
    setMapperRows([...mapperRows, { request: '', deployment: '' }])
  }

  const removeMapperRow = (index: number) => {
    setMapperRows(mapperRows.filter((_, i) => i !== index))
  }

  const updateMapperRow = (index: number, field: 'request' | 'deployment', value: string) => {
    const newRows = [...mapperRows]
    newRows[index][field] = value
    setMapperRows(newRows)
  }

  if (view === 'list') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">频道管理</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-end gap-2">
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                添加频道
              </Button>
              <Button variant="secondary" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : !data || data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无频道数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>标识</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>端点</TableHead>
                    <TableHead>模型数</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((channel) => {
                    const config =
                      typeof channel.value === 'string'
                        ? JSON.parse(channel.value)
                        : channel.value
                    return (
                      <TableRow key={channel.key}>
                        <TableCell className="font-medium">{config.name}</TableCell>
                        <TableCell className="font-mono text-sm">{channel.key}</TableCell>
                        <TableCell>{config.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{config.endpoint}</TableCell>
                        <TableCell>
                          {Object.keys(config.deployment_mapper || {}).length}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(channel)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(channel.key)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {editingKey ? '编辑频道' : '添加频道'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={toggleEditMode}>
              {editMode === 'form' ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {editMode === 'form' ? '切换到JSON模式' : '切换到表单模式'}
            </Button>
            <Button onClick={handleSave}>保存频道</Button>
            <Button variant="secondary" onClick={() => setView('list')}>
              返回列表
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelKey">频道标识 *</Label>
            <Input
              id="channelKey"
              value={channelKey}
              onChange={(e) => setChannelKey(e.target.value)}
              placeholder="例如: azure-openai-1"
              disabled={!!editingKey}
            />
          </div>

          {editMode === 'form' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">频道名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: Azure OpenAI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">频道类型 *</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                >
                  <option value="azure-openai">Azure OpenAI</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">API 端点 *</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="https://your-resource.openai.azure.com/"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API 密钥 *</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="your-api-key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_version">API 版本（可选）</Label>
                <Input
                  id="api_version"
                  value={formData.api_version || ''}
                  onChange={(e) => setFormData({ ...formData, api_version: e.target.value })}
                  placeholder="例如: 2024-02-01"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>模型部署映射</Label>
                  <Button type="button" variant="secondary" size="sm" onClick={addMapperRow}>
                    <Plus className="h-4 w-4" />
                    添加映射
                  </Button>
                </div>
                {mapperRows.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    暂无映射，点击上方按钮添加
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>请求模型名</TableHead>
                        <TableHead>部署模型名</TableHead>
                        <TableHead className="w-20">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mapperRows.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={row.request}
                              onChange={(e) =>
                                updateMapperRow(index, 'request', e.target.value)
                              }
                              placeholder="例如: gpt-4"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.deployment}
                              onChange={(e) =>
                                updateMapperRow(index, 'deployment', e.target.value)
                              }
                              placeholder="例如: gpt-4-deployment"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeMapperRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="jsonValue">频道配置 (JSON)</Label>
              <Textarea
                id="jsonValue"
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder='{"name": "Azure OpenAI", "type": "azure-openai", ...}'
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
