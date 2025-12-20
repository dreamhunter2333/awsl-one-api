import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToast } from './use-toast'
import { cn } from '@/lib/utils'

const toastConfig = {
  success: {
    border: 'border-green-300 dark:border-green-600',
    text: 'text-green-500 dark:text-green-400',
    Icon: CheckCircle,
  },
  error: {
    border: 'border-red-300 dark:border-red-600',
    text: 'text-red-500 dark:text-red-400',
    Icon: AlertCircle,
  },
  warning: {
    border: 'border-amber-300 dark:border-amber-600',
    text: 'text-amber-500 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-blue-300 dark:border-blue-600',
    text: 'text-blue-500 dark:text-blue-400',
    Icon: Info,
  },
} as const

type ToastType = keyof typeof toastConfig

export function Toaster() {
  const { toasts, removeToast } = useToast()

  // 检测是否为深色模式
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type as ToastType] || toastConfig.info
        const Icon = config.Icon
        return (
          <div
            key={toast.id}
            style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff' }}
            className={cn(
              "relative rounded-lg border p-4 shadow-lg animate-in slide-in-from-right",
              config.border,
              config.text
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
