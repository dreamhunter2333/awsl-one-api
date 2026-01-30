import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Channel, ChannelConfig } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  FileJson,
  FileText,
  Link as LinkIcon,
  ArrowLeft,
  Check,
  MoreHorizontal,
  Search,
  ArrowRight,
  Globe,
  Cpu,
} from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'

type EditMode = 'form' | 'json'

const channelTypes = [
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'claude-to-openai', label: 'Claude → OpenAI' },
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'azure-openai-responses', label: 'Azure OpenAI Responses' },
]

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
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await apiClient.getChannels()
      return response.data as Channel[]
    },
  })

  useEffect(() => {
    const handleClick = () => setOpenMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

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
    if (confirm(`确定要删除此频道吗？`)) {
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

      const deployment_mapper: Record<string, string> = {}
      mapperRows.forEach((row) => {
        if (row.request && row.deployment) {
          deployment_mapper[row.request] = row.deployment
        }
      })

      config = { ...formData, deployment_mapper }
      if (!formData.api_version) {
        delete config.api_version
      }
    } else {
      try {
        config = JSON.parse(jsonValue)
      } catch {
        addToast('JSON格式错误', 'error')
        return
      }
    }

    saveMutation.mutate({ key: channelKey, config })
  }

  const toggleEditMode = () => {
    if (editMode === 'form') {
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
      } catch {
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

  const getTypeLabel = (type: string) => {
    return channelTypes.find((t) => t.value === type)?.label || type
  }

  const filteredData = data?.filter((channel) => {
    if (!searchQuery) return true
    const config = typeof channel.value === 'string' ? JSON.parse(channel.value) : channel.value
    return (
      config.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.key.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // List View
  if (view === 'list') {
    return (
      <PageContainer
        title="频道管理"
        description="配置 AI 服务提供商连接"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">添加</span>
            </Button>
          </div>
        }
      >
        {/* Search */}
        {data && data.length > 0 && (
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索频道..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">加载中...</span>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <LinkIcon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">添加您的第一个频道</h3>
              <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                频道连接到 AI 服务提供商（如 OpenAI、Azure、Claude），用于代理和转发 API 请求。
              </p>
              <Button onClick={handleAdd} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                添加频道
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y">
              {filteredData?.map((channel) => {
                const config = typeof channel.value === 'string' ? JSON.parse(channel.value) : channel.value
                const modelCount = Object.keys(config.deployment_mapper || {}).length
                const isMenuOpen = openMenu === channel.key

                return (
                  <div
                    key={channel.key}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{config.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{channel.key}</div>
                        </div>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenu(isMenuOpen ? null : channel.key)
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-lg shadow-lg py-1 z-10">
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                onClick={() => handleEdit(channel)}
                              >
                                <Pencil className="h-4 w-4" />
                                编辑
                              </button>
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                onClick={() => handleDelete(channel.key)}
                              >
                                <Trash2 className="h-4 w-4" />
                                删除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">
                          {getTypeLabel(config.type)}
                        </span>
                        <span className="text-muted-foreground">
                          {modelCount} 个模型
                        </span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex md:items-center md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{config.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{channel.key}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium whitespace-nowrap">
                          {getTypeLabel(config.type)}
                        </span>
                      </div>
                      <div className="w-40 text-sm text-muted-foreground truncate font-mono" title={config.endpoint}>
                        {config.endpoint.replace(/^https?:\/\//, '').split('/')[0]}
                      </div>
                      <div className="w-20 text-sm text-center flex-shrink-0">
                        <span className="text-muted-foreground">{modelCount} 模型</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(channel)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(channel.key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredData?.length === 0 && searchQuery && (
                <div className="p-8 text-center text-muted-foreground">
                  未找到匹配的频道
                </div>
              )}
            </div>
          </Card>
        )}
      </PageContainer>
    )
  }

  // Form View
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">{editingKey ? '编辑频道' : '添加频道'}</h1>
            <Button variant="outline" size="sm" onClick={toggleEditMode}>
              {editMode === 'form' ? <FileJson className="h-4 w-4 mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              {editMode === 'form' ? 'JSON' : '表单'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
        {/* Channel Key */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-medium mb-4">频道标识</h3>
            <p className="text-sm text-muted-foreground mb-3">用于内部识别的唯一标识</p>
            <Input
              value={channelKey}
              onChange={(e) => setChannelKey(e.target.value)}
              placeholder="例如：azure-gpt4-east"
              disabled={!!editingKey}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        {editMode === 'form' ? (
          <>
            {/* Basic Info */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium mb-4">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">频道名称 <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：Azure GPT-4 东部"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">频道类型 <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      {channelTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium mb-4">连接配置</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      API 端点 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      placeholder="https://your-resource.openai.azure.com/"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">API 密钥 <span className="text-destructive">*</span></Label>
                      <Input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        placeholder="sk-..."
                      />
                    </div>
                    {(formData.type === 'azure-openai' || formData.type === 'claude' || formData.type === 'azure-openai-responses') && (
                      <div className="space-y-2">
                        <Label className="text-sm">API 版本</Label>
                        <Input
                          value={formData.api_version || ''}
                          onChange={(e) => setFormData({ ...formData, api_version: e.target.value })}
                          placeholder="2024-02-01"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Model Mappings */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      模型映射
                    </h3>
                    <p className="text-sm text-muted-foreground">将请求模型名映射到实际部署名</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addMapperRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加
                  </Button>
                </div>

                {mapperRows.length === 0 ? (
                  <button
                    type="button"
                    onClick={addMapperRow}
                    className="w-full py-8 border-2 border-dashed rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    添加模型映射
                  </button>
                ) : (
                  <div className="space-y-2">
                    {mapperRows.map((row, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Input
                          value={row.request}
                          onChange={(e) => updateMapperRow(index, 'request', e.target.value)}
                          placeholder="gpt-4"
                          className="flex-1 bg-background text-sm"
                        />
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          value={row.deployment}
                          onChange={(e) => updateMapperRow(index, 'deployment', e.target.value)}
                          placeholder="gpt-4-0613"
                          className="flex-1 bg-background text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => removeMapperRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-medium mb-4">JSON 配置</h3>
              <Textarea
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                rows={18}
                className="font-mono text-sm"
                placeholder='{"name": "Azure OpenAI", "type": "azure-openai", ...}'
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setView('list')}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                保存频道
              </>
            )}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
