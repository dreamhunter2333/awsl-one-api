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
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'

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
  className?: string
  onNavigate?: () => void
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  showCollapseToggle?: boolean
}

export function Sidebar({
  onAuthClick,
  className,
  onNavigate,
  onClose,
  collapsed = false,
  onToggleCollapse,
  showCollapseToggle = false,
}: SidebarProps) {
  const location = useLocation()
  const { isAuthenticated, logout } = useAuthStore()
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
    onNavigate?.()
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href
    return (
      <Link
        to={item.href}
        onClick={() => onNavigate?.()}
        title={collapsed ? item.title : undefined}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-0 w-10 h-10 mx-auto',
          isActive
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <item.icon className={cn(
          "h-[18px] w-[18px] flex-shrink-0",
          !isActive && "group-hover:scale-110 transition-transform duration-200"
        )} />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        "bg-card border-r flex flex-col h-full transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center border-b px-4",
        collapsed ? "justify-center px-0" : "justify-between"
      )}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px] tracking-tight">Awsl One API</span>
                <span className="text-[11px] text-muted-foreground">统一 AI 接口网关</span>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Collapse Toggle - PC Only */}
      {showCollapseToggle && (
        <div className={cn("px-3 py-2 hidden lg:flex", collapsed && "px-0 justify-center")}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              collapsed ? "w-10 h-10 p-0 justify-center" : "w-full"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>收起菜单</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto scrollbar-thin">
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              概览
            </div>
          )}
          {navItems
            .filter((item) => !item.adminOnly)
            .map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
        </div>

        {isAuthenticated && (
          <>
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  管理
                </div>
              )}
              {navItems
                .filter((item) => item.adminOnly && item.href !== '/database')
                .map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
            </div>

            <div className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  系统
                </div>
              )}
              {navItems
                .filter((item) => item.href === '/database')
                .map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={cn("p-3 border-t", collapsed && "p-2")}>
        {/* Action Buttons */}
        <div className={cn(
          "flex gap-1",
          collapsed ? "flex-col items-center" : "mb-3"
        )}>
          <button
            type="button"
            title={collapsed ? (theme === 'dark' ? '浅色模式' : '深色模式') : undefined}
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-200",
              collapsed
                ? "w-10 h-10 hover:bg-muted text-muted-foreground hover:text-foreground"
                : "flex-1 h-9 gap-2 px-3 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium"
            )}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {!collapsed && <span>{theme === 'dark' ? '浅色' : '深色'}</span>}
          </button>

          <a
            href="https://github.com/dreamhunter2333/awsl-one-api"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "GitHub" : undefined}
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-200",
              collapsed
                ? "w-10 h-10 hover:bg-muted text-muted-foreground hover:text-foreground"
                : "flex-1 h-9 gap-2 px-3 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium"
            )}
          >
            <Github className="h-4 w-4" />
            {!collapsed && <span>GitHub</span>}
          </a>
        </div>

        {/* Auth Button */}
        <button
          type="button"
          title={collapsed ? (isAuthenticated ? '退出登录' : '管理员登录') : undefined}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-lg text-sm font-medium transition-all duration-200',
            collapsed ? 'h-10' : 'h-10 px-3',
            isAuthenticated
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
          )}
          onClick={handleAuthClick}
        >
          {isAuthenticated ? (
            <>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>退出登录</span>}
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              {!collapsed && <span>管理员登录</span>}
            </>
          )}
        </button>

      </div>
    </aside>
  )
}
