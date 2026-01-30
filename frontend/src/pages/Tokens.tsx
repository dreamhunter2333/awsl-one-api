import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Token, TokenConfig, Channel } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, copyToClipboard, generateTokenKey, cn } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Copy,
  Sparkles,
  FileJson,
  FileText,
  Key,
  ArrowLeft,
  Check,
  MoreHorizontal,
  ChevronRight,
  AlertCircle,
  Search,
  RotateCcw,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { PageContainer } from '@/components/ui/page-container'

type EditMode = 'form' | 'json'

export function Tokens() {
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editMode, setEditMode] = useState<EditMode>('form')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [formData, setFormData] = useState<TokenConfig>({
    name: '',
    channel_keys: [],
    total_quota: 0,
  })
  const [tokenKey, setTokenKey] = useState('')
  const [jsonValue, setJsonValue] = useState('')
  const [availableChannels, setAvailableChannels] = useState<string[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const response = await apiClient.getTokens()
      return response.data as Token[]
    },
  })

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const response = await apiClient.getChannels()
        const channels = response.data as Channel[]
        setAvailableChannels(channels.map((c) => c.key))
      } catch (error) {
        console.error('Failed to load channels:', error)
      }
    }
    loadChannels()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const saveMutation = useMutation({
    mutationFn: async ({ key, config }: { key: string; config: any }) => {
      return apiClient.saveToken(key, config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      addToast(editingKey ? '令牌更新成功' : '令牌添加成功', 'success')
      resetForm()
      setView('list')
    },
    onError: (error: any) => {
      addToast('保存失败：' + error.message, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiClient.deleteToken(key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      addToast('令牌已删除', 'success')
    },
    onError: (error: any) => {
      addToast('删除失败：' + error.message, 'error')
    },
  })

  const resetUsageMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiClient.resetTokenUsage(key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      addToast('已用额度已重置', 'success')
    },
    onError: (error: any) => {
      addToast('重置失败：' + error.message, 'error')
    },
  })

  const resetForm = () => {
    setFormData({ name: '', channel_keys: [], total_quota: 0 })
    setTokenKey('')
    setJsonValue('')
    setSelectedChannels([])
    setEditingKey(null)
    setEditMode('form')
  }

  const handleAdd = () => {
    resetForm()
    setTokenKey(generateTokenKey())
    setView('form')
  }

  const handleEdit = (token: Token) => {
    setEditingKey(token.key)
    setTokenKey(token.key)
    const config = typeof token.value === 'string' ? JSON.parse(token.value) : token.value
    setFormData(config)
    setJsonValue(JSON.stringify(config, null, 2))
    setSelectedChannels(config.channel_keys || [])
    setView('form')
  }

  const handleDelete = (key: string) => {
    if (confirm(`确定要删除此令牌吗？`)) {
      deleteMutation.mutate(key)
    }
  }

  const handleResetUsage = (key: string) => {
    if (confirm(`确定要重置此令牌的已用额度吗？`)) {
      resetUsageMutation.mutate(key)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text)
      addToast('已复制到剪贴板', 'success')
    } catch {
      addToast('复制失败', 'error')
    }
  }

  const handleSave = () => {
    if (!tokenKey) {
      addToast('请填写令牌标识', 'error')
      return
    }

    let config: any
    if (editMode === 'form') {
      if (!formData.name) {
        addToast('请填写令牌名称', 'error')
        return
      }
      config = { ...formData, channel_keys: selectedChannels }
    } else {
      try {
        config = JSON.parse(jsonValue)
      } catch {
        addToast('JSON格式错误', 'error')
        return
      }
    }

    saveMutation.mutate({ key: tokenKey, config })
  }

  const toggleEditMode = () => {
    if (editMode === 'form') {
      const config = { ...formData, channel_keys: selectedChannels }
      setJsonValue(JSON.stringify(config, null, 2))
      setEditMode('json')
    } else {
      try {
        const config = JSON.parse(jsonValue)
        setFormData(config)
        setSelectedChannels(config.channel_keys || [])
        setEditMode('form')
      } catch {
        addToast('JSON格式错误', 'error')
      }
    }
  }

  const toggleChannel = (channelKey: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelKey) ? prev.filter((k) => k !== channelKey) : [...prev, channelKey]
    )
  }

  const quotaPresets = [
    { label: '$1', value: 1000000 },
    { label: '$5', value: 5000000 },
    { label: '$10', value: 10000000 },
    { label: '$20', value: 20000000 },
    { label: '$50', value: 50000000 },
    { label: '$100', value: 100000000 },
  ]

  const filteredData = data?.filter((token) => {
    if (!searchQuery) return true
    const config = typeof token.value === 'string' ? JSON.parse(token.value) : token.value
    return (
      config.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.key.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // List View
  if (view === 'list') {
    return (
      <PageContainer
        title="令牌管理"
        description="管理 API 访问令牌和配额"
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
                placeholder="搜索令牌..."
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
                <Key className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">创建您的第一个令牌</h3>
              <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                令牌用于验证 API 请求。每个令牌可以设置独立的访问权限和使用配额。
              </p>
              <Button onClick={handleAdd} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                添加令牌
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y">
              {filteredData?.map((token) => {
                const config = typeof token.value === 'string' ? JSON.parse(token.value) : token.value
                const channelKeys = config.channel_keys || []
                const usagePercent = config.total_quota > 0
                  ? Math.min(100, ((token.usage || 0) / config.total_quota) * 100)
                  : 0
                const isMenuOpen = openMenu === token.key

                return (
                  <div
                    key={token.key}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{config.name}</div>
                          <button
                            onClick={() => handleCopy(token.key)}
                            className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1.5 mt-0.5"
                          >
                            {token.key.slice(0, 16)}...
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenu(isMenuOpen ? null : token.key)
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-lg shadow-lg py-1 z-10">
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                onClick={() => handleEdit(token)}
                              >
                                <Pencil className="h-4 w-4" />
                                编辑
                              </button>
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                onClick={() => handleResetUsage(token.key)}
                              >
                                <RotateCcw className="h-4 w-4" />
                                重置额度
                              </button>
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                onClick={() => handleDelete(token.key)}
                              >
                                <Trash2 className="h-4 w-4" />
                                删除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          频道: <span className="text-foreground">{channelKeys.length === 0 ? '全部' : `${channelKeys.length}个`}</span>
                        </span>
                        <span className="text-muted-foreground">
                          配额: <span className="text-foreground">{formatCurrency(token.usage || 0)}/{formatCurrency(config.total_quota || 0)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            usagePercent > 90 ? "bg-destructive" : usagePercent > 70 ? "bg-warning" : "bg-primary"
                          )}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex md:items-center md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {token.key.slice(0, 12)}...{token.key.slice(-4)}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(token.key)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="w-24 text-sm text-center flex-shrink-0">
                        <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">
                          {channelKeys.length === 0 ? '全部' : `${channelKeys.length} 频道`}
                        </span>
                      </div>
                      <div className="w-48 flex-shrink-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {formatCurrency(token.usage || 0)} / {formatCurrency(config.total_quota || 0)}
                          </span>
                          <span className={cn(
                            "font-medium",
                            usagePercent > 90 ? "text-destructive" : usagePercent > 70 ? "text-warning" : "text-muted-foreground"
                          )}>
                            {usagePercent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              usagePercent > 90 ? "bg-destructive" : usagePercent > 70 ? "bg-warning" : "bg-primary"
                            )}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(token)} title="编辑">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResetUsage(token.key)} title="重置额度">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(token.key)} title="删除">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredData?.length === 0 && searchQuery && (
                <div className="p-8 text-center text-muted-foreground">
                  未找到匹配的令牌
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
            <h1 className="text-2xl font-bold tracking-tight">{editingKey ? '编辑令牌' : '添加令牌'}</h1>
            <Button variant="outline" size="sm" onClick={toggleEditMode}>
              {editMode === 'form' ? <FileJson className="h-4 w-4 mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              {editMode === 'form' ? 'JSON' : '表单'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
        {/* Token Key Section */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-medium mb-1">令牌标识</h3>
            <p className="text-sm text-muted-foreground mb-3">用于 API 认证的唯一标识</p>
            <div className="flex gap-2">
              <Input
                value={tokenKey}
                onChange={(e) => setTokenKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                disabled={!!editingKey}
                className="font-mono text-sm"
              />
              {!editingKey && (
                <Button type="button" variant="outline" onClick={() => setTokenKey(generateTokenKey())}>
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {editMode === 'form' ? (
          <>
            {/* Basic Info */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium mb-4">基本信息</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">令牌名称 <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：生产环境、测试用户"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Channel Access */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">频道访问权限</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedChannels.length === 0 ? '允许访问所有频道' : `已选择 ${selectedChannels.length} 个频道`}
                    </p>
                  </div>
                </div>
                {availableChannels.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">暂无可用频道</p>
                      <p className="text-xs text-muted-foreground">请先在频道管理中添加频道</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableChannels.map((channelKey) => (
                      <label
                        key={channelKey}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedChannels.includes(channelKey)
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        )}
                      >
                        <Checkbox
                          checked={selectedChannels.includes(channelKey)}
                          onCheckedChange={() => toggleChannel(channelKey)}
                        />
                        <span className="text-sm font-medium">{channelKey}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quota */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium mb-1">使用配额</h3>
                <p className="text-sm text-muted-foreground mb-4">设置令牌的最大使用额度（1百万 token = $1.00）</p>
                <div className="space-y-4">
                  <Input
                    type="number"
                    value={formData.total_quota}
                    onChange={(e) => setFormData({ ...formData, total_quota: parseInt(e.target.value) || 0 })}
                    placeholder="1000000"
                    min="0"
                  />
                  <div className="flex flex-wrap gap-2">
                    {quotaPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, total_quota: preset.value })}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                          formData.total_quota === preset.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                rows={14}
                className="font-mono text-sm"
                placeholder='{"name": "令牌名称", "channel_keys": [], "total_quota": 1000000}'
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
                保存令牌
              </>
            )}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
