import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    loading: false,
    user: null as any,
    theme: 'light' as 'light' | 'dark',
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.user,
  },
  
  actions: {
    setLoading(loading: boolean) {
      this.loading = loading
    },
    
    setUser(user: any) {
      this.user = user
    },
    
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },
  },
})
