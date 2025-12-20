import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  TestTube2,
  Link as LinkIcon,
  Key,
  DollarSign,
  Database,
  Github,
  Moon,
  Sun,
  LogIn,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'
import { Button } from '../ui/button'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    title: '仪表盘',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'API 测试',
    href: '/api-test',
    icon: TestTube2,
  },
  {
    title: '频道管理',
    href: '/channels',
    icon: LinkIcon,
    adminOnly: true,
  },
  {
    title: '令牌管理',
    href: '/tokens',
    icon: Key,
    adminOnly: true,
  },
  {
    title: '定价管理',
    href: '/pricing',
    icon: DollarSign,
    adminOnly: true,
  },
  {
    title: '数据库',
    href: '/database',
    icon: Database,
    adminOnly: true,
  },
]

interface SidebarProps {
  onAuthClick: () => void
}

export function Sidebar({ onAuthClick }: SidebarProps) {
  const location = useLocation()
  const { isAuthenticated, logout } = useAuthStore()
  // Initialize theme from localStorage on mount
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      const isDark = savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))
      if (isDark) {
        document.documentElement.classList.add('dark')
      }
      return isDark ? 'dark' : 'light'
    }
    return 'light'
  })

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout()
    } else {
      onAuthClick()
    }
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🤖</div>
          <span className="font-semibold text-lg">Awsl One API</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            主菜单
          </div>
          <div className="space-y-1">
            {navItems
              .filter((item) => !item.adminOnly)
              .map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
          </div>
        </div>

        {isAuthenticated && (
          <>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                管理
              </div>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.adminOnly && item.href !== '/database')
                  .map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        location.pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                系统
              </div>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.href === '/database')
                  .map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        location.pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground px-3 mb-3">
          <a
            href="https://github.com/dreamhunter2333/awsl-one-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <span>v1.0.0</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span className="ml-2">切换主题</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            'w-full justify-start',
            isAuthenticated && 'text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground'
          )}
          onClick={handleAuthClick}
        >
          {isAuthenticated ? (
            <LogOut className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          <span className="ml-2">
            {isAuthenticated ? '退出登录' : '管理员登录'}
          </span>
        </Button>
      </div>
    </aside>
  )
}
