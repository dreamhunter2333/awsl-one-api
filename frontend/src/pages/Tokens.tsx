import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Token, TokenConfig, Channel } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, copyToClipboard, generateTokenKey } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, RefreshCw, Pencil, Trash2, Copy, Dice5, FileJson, FileText } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

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

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const response = await apiClient.getTokens()
      return response.data as Token[]
    },
  })

  // Load available channels
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

  const resetForm = () => {
    setFormData({
      name: '',
      channel_keys: [],
      total_quota: 0,
    })
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
    if (confirm(`确定要删除令牌 "${key}" 吗？`)) {
      deleteMutation.mutate(key)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text)
      addToast('已复制到剪贴板', 'success')
    } catch (error) {
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

      config = {
        ...formData,
        channel_keys: selectedChannels,
      }
    } else {
      try {
        config = JSON.parse(jsonValue)
      } catch (error) {
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
      } catch (error) {
        addToast('JSON格式错误', 'error')
      }
    }
  }

  const toggleChannel = (channelKey: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelKey)
        ? prev.filter((k) => k !== channelKey)
        : [...prev, channelKey]
    )
  }

  const setQuotaPreset = (value: number) => {
    setFormData({ ...formData, total_quota: value })
  }

  if (view === 'list') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">令牌管理</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-end gap-2">
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                添加令牌
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
              <div className="text-center py-8 text-muted-foreground">暂无令牌数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>标识</TableHead>
                    <TableHead>频道</TableHead>
                    <TableHead>配额</TableHead>
                    <TableHead>已用</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((token) => {
                    const config =
                      typeof token.value === 'string' ? JSON.parse(token.value) : token.value
                    const channelKeys = config.channel_keys || []
                    const channelDisplay =
                      channelKeys.length === 0
                        ? '所有频道'
                        : channelKeys.length > 2
                        ? `${channelKeys.slice(0, 2).join(', ')}...`
                        : channelKeys.join(', ')

                    return (
                      <TableRow key={token.key}>
                        <TableCell className="font-medium">{config.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {token.key.slice(0, 8)}...{token.key.slice(-4)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{channelDisplay}</TableCell>
                        <TableCell>{formatCurrency(config.total_quota || 0)}</TableCell>
                        <TableCell>{formatCurrency(token.usage || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(token.key)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(token)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(token.key)}
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
          {editingKey ? '编辑令牌' : '添加令牌'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={toggleEditMode}>
              {editMode === 'form' ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {editMode === 'form' ? '切换到JSON模式' : '切换到表单模式'}
            </Button>
            <Button onClick={handleSave}>保存令牌</Button>
            <Button variant="secondary" onClick={() => setView('list')}>
              返回列表
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tokenKey">令牌标识 *</Label>
            <div className="flex gap-2">
              <Input
                id="tokenKey"
                value={tokenKey}
                onChange={(e) => setTokenKey(e.target.value)}
                placeholder="输入令牌标识或点击生成"
                disabled={!!editingKey}
                className="flex-1"
              />
              {!editingKey && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTokenKey(generateTokenKey())}
                >
                  <Dice5 className="h-4 w-4" />
                  生成
                </Button>
              )}
            </div>
          </div>

          {editMode === 'form' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">令牌名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 用户令牌1"
                />
              </div>

              <div className="space-y-2">
                <Label>允许访问的频道</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                  {availableChannels.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground">暂无可用频道</div>
                  ) : (
                    availableChannels.map((channelKey) => (
                      <div key={channelKey} className="flex items-center space-x-2">
                        <Checkbox
                          id={`channel-${channelKey}`}
                          checked={selectedChannels.includes(channelKey)}
                          onCheckedChange={() => toggleChannel(channelKey)}
                        />
                        <label
                          htmlFor={`channel-${channelKey}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {channelKey}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground">不选表示允许访问所有频道</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_quota">总配额</Label>
                <Input
                  id="total_quota"
                  type="number"
                  value={formData.total_quota}
                  onChange={(e) =>
                    setFormData({ ...formData, total_quota: parseInt(e.target.value) || 0 })
                  }
                  placeholder="1000000"
                  min="0"
                  step="1"
                />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">快速选择:</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuotaPreset(1000000)}
                    >
                      $1
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuotaPreset(5000000)}
                    >
                      $5
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuotaPreset(10000000)}
                    >
                      $10
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuotaPreset(20000000)}
                    >
                      $20
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuotaPreset(50000000)}
                    >
                      $50
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  设置令牌的总使用配额 (基础单位：1百万token = $1.00)
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="jsonValue">令牌配置 (JSON)</Label>
              <Textarea
                id="jsonValue"
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder='{"name": "用户令牌1", "channel_keys": [], "total_quota": 1000000}'
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
