import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToast } from './use-toast'
import { cn } from '@/lib/utils'

const toastStyles = {
  success: 'border-green-400 bg-white text-green-700 dark:border-green-600 dark:bg-gray-900 dark:text-green-400',
  error: 'border-red-400 bg-white text-red-700 dark:border-red-600 dark:bg-gray-900 dark:text-red-400',
  warning: 'border-amber-400 bg-white text-amber-700 dark:border-amber-600 dark:bg-gray-900 dark:text-amber-400',
  info: 'border-blue-400 bg-white text-blue-700 dark:border-blue-600 dark:bg-gray-900 dark:text-blue-400',
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type] || Info
        return (
          <div
            key={toast.id}
            className={cn(
              "relative rounded-lg border p-4 shadow-lg animate-in slide-in-from-right",
              toastStyles[toast.type] || toastStyles.info
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
