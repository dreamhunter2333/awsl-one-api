import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [adminToken, setAdminToken] = useState('')
  const [authError, setAuthError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, showAuthModal, closeAuthModal, openAuthModal } = useAuthStore()
  const { addToast } = useToast()

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setIsLoading(true)

    try {
      await login(adminToken)
      setAdminToken('')
      addToast('登录成功', 'success')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '管理员令牌无效')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onAuthClick={openAuthModal} />

      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>

      {/* Auth Dialog */}
      <Dialog open={showAuthModal} onOpenChange={(open) => !open && closeAuthModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管理员身份验证</DialogTitle>
            <DialogDescription>
              请输入管理员令牌以访问管理功能
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuthSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminToken">管理员令牌</Label>
                <Input
                  id="adminToken"
                  type="password"
                  placeholder="请输入管理员令牌"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  required
                />
              </div>

              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeAuthModal}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '验证中...' : '登录'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
