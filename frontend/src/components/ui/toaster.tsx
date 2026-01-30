import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToast } from './use-toast'
import { cn } from '@/lib/utils'

const toastConfig = {
  success: {
    bg: 'bg-emerald-500',
    Icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-500',
    Icon: AlertCircle,
  },
  warning: {
    bg: 'bg-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-500',
    Icon: Info,
  },
} as const

type ToastType = keyof typeof toastConfig

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {toasts.map((toast, index) => {
        const config = toastConfig[toast.type as ToastType] || toastConfig.info
        const Icon = config.Icon
        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-full cursor-pointer",
              "bg-foreground text-background",
              "shadow-lg shadow-black/10",
              "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
              "hover:scale-[1.02] transition-transform"
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-full", config.bg)}>
              <Icon className="h-3 w-3 text-white" />
            </span>
            <span className="text-sm font-medium pr-1">{toast.message}</span>
          </div>
        )
      })}
    </div>
  )
}
