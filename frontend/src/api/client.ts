import { ApiResponse } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// 错误类型
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// 全局错误处理回调
let onUnauthorized: (() => void) | null = null
let onError: ((error: ApiError) => void) | null = null

export function setErrorHandlers(handlers: {
  onUnauthorized?: () => void
  onError?: (error: ApiError) => void
}) {
  onUnauthorized = handlers.onUnauthorized || null
  onError = handlers.onError || null
}

// 请求拦截器
async function requestInterceptor(config: RequestInit): Promise<RequestInit> {
  const headers = new Headers(config.headers)

  // 设置默认 Content-Type
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // 添加 admin token
  const adminToken = localStorage.getItem('adminToken')
  if (adminToken) {
    headers.set('x-admin-token', adminToken)
  }

  return { ...config, headers }
}

// 响应拦截器
async function responseInterceptor(response: Response): Promise<any> {
  if (!response.ok) {
    let errorMessage: string

    // 先读取为文本，避免 body stream already read 错误
    const responseText = await response.text()

    try {
      // 尝试解析为 JSON
      const errorData = JSON.parse(responseText)
      if (typeof errorData?.message === 'string') {
        errorMessage = errorData.message
      } else if (typeof errorData?.error === 'string') {
        errorMessage = errorData.error
      } else {
        errorMessage = JSON.stringify(errorData)
      }
    } catch {
      // 不是 JSON，直接使用文本
      errorMessage = responseText || `请求失败: ${response.status}`
    }

    const error = new ApiError(errorMessage, response.status)

    // 处理特定状态码
    switch (response.status) {
      case 401:
        // 未授权 - 清除 token 并触发回调
        localStorage.removeItem('adminToken')
        onUnauthorized?.()
        error.message = '认证已过期，请重新登录'
        break
      case 403:
        error.message = '没有权限执行此操作'
        break
      case 404:
        error.message = '请求的资源不存在'
        break
      case 500:
        error.message = '服务器内部错误'
        break
      case 502:
      case 503:
      case 504:
        error.message = '服务暂时不可用，请稍后重试'
        break
    }

    // 触发全局错误回调
    onError?.(error)

    throw error
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

// 统一请求方法
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  try {
    const config = await requestInterceptor(options)
    const response = await fetch(url, config)
    return responseInterceptor(response)
  } catch (error) {
    // 处理网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new ApiError('网络连接失败，请检查网络', 0)
      onError?.(networkError)
      throw networkError
    }
    throw error
  }
}

// API 方法
export const apiClient = {
  // 通用方法
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown) => request<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  // Channel APIs
  getChannels: () => request<ApiResponse>('/api/admin/channel', { method: 'GET' }),

  saveChannel: (key: string, config: unknown) =>
    request(`/api/admin/channel/${encodeURIComponent(key)}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  deleteChannel: (key: string) =>
    request(`/api/admin/channel/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  // Token APIs
  getTokens: () => request<ApiResponse>('/api/admin/token', { method: 'GET' }),

  saveToken: (key: string, config: unknown) =>
    request(`/api/admin/token/${encodeURIComponent(key)}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  deleteToken: (key: string) =>
    request(`/api/admin/token/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  // Pricing APIs
  getPricing: () => request<ApiResponse>('/api/admin/pricing', { method: 'GET' }),

  savePricing: (config: unknown) =>
    request('/api/admin/pricing', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Database APIs
  initDatabase: () => request('/api/admin/db_initialize', { method: 'POST' }),

  // API Test - 使用自定义 token，不走通用拦截器
  testApi: async (endpoint: string, token: string, body: unknown) => {
    const url = `${BASE_URL}${endpoint}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    return responseInterceptor(response)
  },

  // Auth check
  checkAuth: () => request<ApiResponse>('/api/admin/channel', { method: 'GET' }),
}
