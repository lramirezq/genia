import { defineStore } from 'pinia'
import api from '@/config/api'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    catalog: null,
    catalogs: [],
    loading: false
  }),

  actions: {
    async fetchCatalog(catalogId) {
      this.loading = true
      try {
        const response = await api.get('/catalogs')
        if (response.data.success) {
          this.catalog = response.data.data.catalogs.find(c => c.catalogId === catalogId)
        }
      } catch (error) {
        console.error('Error fetching catalog:', error)
      } finally {
        this.loading = false
      }
    }
  }
})