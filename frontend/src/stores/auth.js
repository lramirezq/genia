import { defineStore } from 'pinia'
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth'
import api from '../config/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    tokens: null,
    isAuthenticated: false
  }),

  actions: {
    async login(email, password) {
      try {
        const response = await api.post('/auth/login', { email, password })
        
        if (response.data.success) {
          const data = response.data.data
          
          // Check if password change is required
          if (data.challengeName === 'NEW_PASSWORD_REQUIRED') {
            this.challengeSession = data.session
            return { 
              success: false, 
              requiresPasswordChange: true,
              session: data.session
            }
          }
          
          // Normal login success
          this.tokens = data
          this.isAuthenticated = true
          
          // Save token FIRST before making any API calls
          localStorage.setItem('idToken', this.tokens.idToken)
          
          // Decode user info from token
          const payload = JSON.parse(atob(this.tokens.idToken.split('.')[1]))
          this.user = {
            email: payload.email,
            firstName: payload.given_name,
            lastName: payload.family_name,
            role: payload.email === 'admin@genia.com' ? 'admin' : 'user'
          }
          
          // Get role from API (now token is in localStorage)
          await this.getUserRole()
          
          return { success: true }
        }
      } catch (error) {
        return { success: false, error: error.response?.data?.error || 'Login failed' }
      }
    },

    async logout() {
      try {
        await signOut()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.user = null
        this.tokens = null
        this.isAuthenticated = false
        // Clear localStorage
        localStorage.removeItem('idToken')
      }
    },

    async getUserRole() {
      try {
        const response = await api.get('/users/role')
        if (response.data.success && this.user) {
          this.user.role = response.data.data.role || 'user'
        }
      } catch (error) {
        console.error('Error getting user role:', error)
        // Si falla, asumimos que es admin si es el usuario admin@genia.com
        if (this.user && this.user.email === 'admin@genia.com') {
          this.user.role = 'admin'
        }
      }
    },

    async respondToChallenge(email, newPassword, session) {
      try {
        const response = await api.post('/auth/respond-to-challenge', { 
          email, 
          newPassword,
          session
        })
        
        if (response.data.success) {
          const data = response.data.data
          this.tokens = data
          this.isAuthenticated = true
          
          // Save token FIRST
          localStorage.setItem('idToken', this.tokens.idToken)
          
          const payload = JSON.parse(atob(this.tokens.idToken.split('.')[1]))
          this.user = {
            email: payload.email,
            firstName: payload.given_name,
            lastName: payload.family_name,
            role: payload.email === 'admin@genia.com' ? 'admin' : 'user'
          }
          
          // Get role from API (now token is in localStorage)
          await this.getUserRole()
          
          return { success: true }
        }
      } catch (error) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Failed to change password' 
        }
      }
    },

    async restoreSession() {
      try {
        const idToken = localStorage.getItem('idToken')
        if (idToken) {
          // Decode token to check if it's expired
          const payload = JSON.parse(atob(idToken.split('.')[1]))
          const now = Math.floor(Date.now() / 1000)
          
          if (payload.exp > now) {
            // Token is still valid
            this.tokens = { idToken }
            this.isAuthenticated = true
            this.user = {
              email: payload.email,
              firstName: payload.given_name,
              lastName: payload.family_name,
              role: payload.email === 'admin@genia.com' ? 'admin' : 'user'
            }
            await this.getUserRole()
          } else {
            // Token expired, clear it
            localStorage.removeItem('idToken')
            this.isAuthenticated = false
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error)
        localStorage.removeItem('idToken')
        this.isAuthenticated = false
      }
    },

    async changePassword(currentPassword, newPassword) {
      try {
        const response = await api.post('/auth/change-password', {
          email: this.user.email,
          currentPassword,
          newPassword
        })
        
        if (response.data.success) {
          return { success: true }
        }
        return { success: false, error: response.data.error }
      } catch (error) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Error al cambiar contraseña' 
        }
      }
    }
  }
})