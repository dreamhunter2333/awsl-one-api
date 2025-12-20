import { create } from 'zustand'
import { apiClient } from '@/api/client'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  showAuthModal: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  openAuthModal: () => void
  closeAuthModal: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  error: null,
  showAuthModal: false,

  login: async (token: string) => {
    set({ isLoading: true, error: null })
    try {
      // Store token
      localStorage.setItem('adminToken', token)

      // Verify token by making a test request
      await apiClient.checkAuth()

      set({ isAuthenticated: true, isLoading: false, showAuthModal: false })
    } catch (error) {
      localStorage.removeItem('adminToken')
      set({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken')
    set({ isAuthenticated: false, error: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      set({ isAuthenticated: false, isLoading: false })
      return
    }

    set({ isLoading: true })
    try {
      await apiClient.checkAuth()
      set({ isAuthenticated: true, isLoading: false })
    } catch (error) {
      localStorage.removeItem('adminToken')
      set({ isAuthenticated: false, isLoading: false })
    }
  },

  openAuthModal: () => set({ showAuthModal: true }),
  closeAuthModal: () => set({ showAuthModal: false }),
}))
