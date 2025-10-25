<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>Catálogos</h1>
          <v-btn color="primary" @click="showCreateDialog = true">
            <v-icon left>mdi-plus</v-icon>
            Nuevo Catálogo
          </v-btn>
        </div>

        <v-row>
          <v-col v-for="catalog in catalogs" :key="catalog.catalogId" cols="12" md="4">
            <v-card>
              <v-card-title>{{ catalog.name }}</v-card-title>
              <v-card-text>
                <p>{{ catalog.description }}</p>
                <div class="d-flex align-center gap-2">
                  <v-chip small>{{ catalog.documentCount || 0 }} documentos</v-chip>
                  <v-chip 
                    :color="getStatusColor(catalog.status)" 
                    small
                    :class="{ 'pulse': catalog.status === 'creating' }"
                  >
                    {{ getStatusText(catalog.status) }}
                  </v-chip>
                </div>
                <v-progress-linear 
                  v-if="catalog.status === 'creating'" 
                  indeterminate 
                  color="primary" 
                  class="mt-2"
                />
              </v-card-text>
              <v-card-actions>
                <v-btn 
                  text 
                  @click="openCatalog(catalog)"
                  :disabled="catalog.status !== 'ready'"
                >
                  Abrir
                </v-btn>
                <v-btn 
                  v-if="catalog.status === 'creating'"
                  text
                  color="info"
                  @click="showProgress(catalog)"
                >
                  <v-icon left>mdi-progress-clock</v-icon>
                  Ver Progreso
                </v-btn>
                <v-spacer />
                <v-btn text color="error" @click="deleteCatalog(catalog)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Progress Dialog -->
        <v-dialog v-model="showProgressDialog" max-width="600px">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-progress-clock</v-icon>
              Progreso de Creación: {{ selectedCatalog?.name }}
            </v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="step in progressSteps"
                  :key="step.order"
                >
                  <template v-slot:prepend>
                    <v-icon
                      :color="getProgressColor(step.status)"
                      size="32"
                    >
                      {{ getProgressIcon(step.status) }}
                    </v-icon>
                  </template>
                  <v-list-item-title>{{ step.name }}</v-list-item-title>
                  <v-list-item-subtitle v-if="step.message">
                    {{ step.message }}
                  </v-list-item-subtitle>
                  <template v-slot:append v-if="step.status === 'in_progress'">
                    <v-progress-circular indeterminate size="24" width="2" />
                  </template>
                </v-list-item>
              </v-list>
              <v-alert v-if="!progressSteps.length" type="info" class="mt-4">
                Iniciando proceso de creación...
              </v-alert>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="showProgressDialog = false">Cerrar</v-btn>
              <v-btn color="primary" @click="refreshProgress">
                <v-icon left>mdi-refresh</v-icon>
                Actualizar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Create Catalog Dialog -->
        <v-dialog v-model="showCreateDialog" max-width="500px">
          <v-card>
            <v-card-title>Crear Nuevo Catálogo</v-card-title>
            <v-card-text>
              <v-text-field v-model="newCatalog.name" label="Nombre" required />
              <v-textarea v-model="newCatalog.description" label="Descripción" />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="showCreateDialog = false">Cancelar</v-btn>
              <v-btn color="primary" @click="createCatalog">Crear</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../config/api'

const $router = useRouter()

const catalogs = ref([])
const showCreateDialog = ref(false)
const showProgressDialog = ref(false)
const selectedCatalog = ref(null)
const progressSteps = ref([])
const newCatalog = ref({ name: '', description: '' })

const loadCatalogs = async () => {
  try {
    const response = await api.get('/catalogs')
    if (response.data.success) {
      catalogs.value = response.data.data.catalogs
    }
  } catch (error) {
    console.error('Error loading catalogs:', error)
  }
}

const createCatalog = async () => {
  try {
    const response = await api.post('/catalogs', newCatalog.value)
    if (response.data.success) {
      showCreateDialog.value = false
      newCatalog.value = { name: '', description: '' }
      await loadCatalogs()
      startPolling()
    }
  } catch (error) {
    console.error('Error creating catalog:', error)
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'ready': return 'success'
    case 'creating': return 'warning'
    case 'error': return 'error'
    default: return 'grey'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'ready': return 'Listo'
    case 'creating': return 'Creando...'
    case 'error': return 'Error'
    default: return 'Desconocido'
  }
}

const startStatusPolling = (catalogId) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await api.get(`/catalogs/${catalogId}/status`)
      if (response.data.success) {
        const catalog = catalogs.value.find(c => c.catalogId === catalogId)
        if (catalog) {
          catalog.status = response.data.status
          if (response.data.status === 'ready' || response.data.status === 'error') {
            clearInterval(pollInterval)
            loadCatalogs() // Refresh full catalog list
          }
        }
      }
    } catch (error) {
      console.error('Error polling status:', error)
      clearInterval(pollInterval)
    }
  }, 3000) // Poll every 3 seconds
}

const openCatalog = (catalog) => {
  $router.push(`/catalogs/${catalog.catalogId}`)
}

const uploadDocument = (catalog) => {
  console.log('Upload to catalog:', catalog)
}

const showProgress = async (catalog) => {
  selectedCatalog.value = catalog
  await loadProgress(catalog.catalogId)
  showProgressDialog.value = true
}

const loadProgress = async (catalogId) => {
  try {
    const response = await api.get(`/catalogs/${catalogId}/status`)
    if (response.data.success && response.data.data) {
      const progress = response.data.data.progress || []
      
      // Define all steps
      const allSteps = [
        { order: 1, name: 'Crear folder S3', status: 'pending' },
        { order: 2, name: 'Crear índice OpenSearch', status: 'pending' },
        { order: 3, name: 'Crear Knowledge Base', status: 'pending' },
        { order: 4, name: 'Crear DataSource', status: 'pending' },
        { order: 5, name: 'Crear Agent', status: 'pending' }
      ]
      
      // Update with actual progress
      progress.forEach(p => {
        const step = allSteps.find(s => s.order === p.order)
        if (step) {
          step.status = p.status
          step.message = p.message
          step.timestamp = p.timestamp
        }
      })
      
      progressSteps.value = allSteps
    }
  } catch (error) {
    console.error('Error loading progress:', error)
  }
}

const refreshProgress = () => {
  if (selectedCatalog.value) {
    loadProgress(selectedCatalog.value.catalogId)
  }
}

const getProgressColor = (status) => {
  switch (status) {
    case 'completed': return 'success'
    case 'in_progress': return 'primary'
    case 'failed': return 'error'
    default: return 'grey'
  }
}

const getProgressIcon = (status) => {
  switch (status) {
    case 'completed': return 'mdi-check-circle'
    case 'in_progress': return 'mdi-loading'
    case 'failed': return 'mdi-close-circle'
    default: return 'mdi-circle-outline'
  }
}

const deleteCatalog = async (catalog) => {
  if (confirm(`¿Estás seguro de eliminar el catálogo "${catalog.name}"?`)) {
    try {
      const response = await api.delete(`/catalogs/${catalog.catalogId}`)
      if (response.data.success) {
        loadCatalogs()
      }
    } catch (error) {
      console.error('Error deleting catalog:', error)
    }
  }
}

let pollingInterval = null

const startPolling = () => {
  if (pollingInterval) return
  pollingInterval = setInterval(() => {
    const creatingCatalogs = catalogs.value.filter(c => c.status === 'creating')
    if (creatingCatalogs.length > 0) {
      loadCatalogs()
    }
  }, 5000)
}

onMounted(() => {
  loadCatalogs()
  startPolling()
})
</script>

<style scoped>
.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.gap-2 {
  gap: 8px;
}
</style>