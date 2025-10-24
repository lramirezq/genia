<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <v-btn icon @click="$router.go(-1)">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <h1 class="d-inline ml-2">{{ catalog?.name }}</h1>
          </div>
          <div>
            <v-btn color="secondary" class="mr-2" @click="$router.push(`/catalogs/${$route.params.id}/chat`)">
              <v-icon left>mdi-chat</v-icon>
              Chat con GenIA
            </v-btn>
            <v-btn 
              color="primary" 
              @click="showUploadDialog = true"
              :disabled="catalog?.status !== 'ready'"
              class="mr-2"
            >
              <v-icon left>mdi-upload</v-icon>
              Subir Documento
            </v-btn>
            <v-btn 
              color="orange" 
              @click="syncCatalog"
              :disabled="catalog?.status !== 'ready' || syncing"
              :loading="syncing"
            >
              <v-icon left>mdi-sync</v-icon>
              Sincronizar
            </v-btn>
          </div>
        </div>

        <!-- Catalog Status Alert -->
        <v-alert v-if="catalog?.status !== 'ready'" type="warning" class="mb-4">
          <v-icon left>mdi-clock</v-icon>
          El catálogo se está inicializando. No puedes subir documentos hasta que esté listo.
          <v-progress-linear indeterminate class="mt-2"></v-progress-linear>
        </v-alert>

        <!-- Drop Zone -->
        <v-card 
          v-if="catalog?.status === 'ready'"
          class="mb-4 drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <v-card-text class="text-center py-8">
            <v-icon size="48" color="grey">mdi-cloud-upload</v-icon>
            <p class="mt-2">Arrastra archivos aquí o haz clic para subir</p>
            <v-btn color="primary" @click="showUploadDialog = true">
              Seleccionar Archivos
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Documentos</v-card-title>
          <v-data-table
            :headers="headers"
            :items="documents"
            :loading="loading"
          >
            <template v-slot:item.size="{ item }">
              {{ formatFileSize(item.size) }}
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn icon small @click="deleteDocument(item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card>

        <!-- Upload Dialog -->
        <v-dialog v-model="showUploadDialog" max-width="500px">
          <v-card>
            <v-card-title>Subir Documento</v-card-title>
            <v-card-text>
              <v-file-input
                v-model="selectedFile"
                label="Seleccionar archivo"
                accept=".pdf,.doc,.docx,.txt,.md"
                show-size
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="showUploadDialog = false">Cancelar</v-btn>
              <v-btn color="primary" @click="uploadDocument" :disabled="!selectedFile">
                Subir
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../config/api'

const route = useRoute()
const catalog = ref(null)
const documents = ref([])
const loading = ref(false)
const showUploadDialog = ref(false)
const selectedFile = ref(null)
const isDragOver = ref(false)
const syncing = ref(false)

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Tamaño', key: 'size' },
  { title: 'Fecha', key: 'lastModified' },
  { title: 'Acciones', key: 'actions', sortable: false }
]

const loadDocuments = async () => {
  loading.value = true
  try {
    const response = await api.get(`/catalogs/${route.params.id}/documents`)
    if (response.data.success) {
      documents.value = response.data.data.documents
    }
  } catch (error) {
    console.error('Error loading documents:', error)
  } finally {
    loading.value = false
  }
}

const uploadDocument = async () => {
  if (!selectedFile.value) return
  
  await uploadFile(selectedFile.value)
  showUploadDialog.value = false
  selectedFile.value = null
}

const deleteDocument = async (document) => {
  if (confirm(`¿Eliminar "${document.name}"?`)) {
    try {
      const response = await api.delete(`/catalogs/${route.params.id}/documents/${encodeURIComponent(document.name)}`)
      if (response.data.success) {
        loadDocuments()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }
}

const handleDrop = async (event) => {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer.files)
  
  for (const file of files) {
    await uploadFile(file)
  }
}

const uploadFile = async (file) => {
  try {
    // Get presigned URL
    const response = await api.post(`/catalogs/${route.params.id}/upload`, {
      fileName: file.name
    })
    
    if (response.data.success) {
      const { uploadUrl } = response.data.data
      
      // Upload directly to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      })
      
      loadDocuments()
    }
  } catch (error) {
    console.error('Error uploading file:', error)
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const syncCatalog = async () => {
  syncing.value = true
  try {
    const response = await api.post(`/catalogs/${route.params.id}/sync`)
    if (response.data.success) {
      console.log('Sync result:', response.data.data)
      alert(`Sincronización iniciada: ${response.data.data.message}`)
    }
  } catch (error) {
    console.error('Error syncing catalog:', error)
    alert('Error al sincronizar el catálogo')
  } finally {
    syncing.value = false
  }
}

const loadCatalog = async () => {
  try {
    const response = await api.get(`/catalogs`)
    if (response.data.success) {
      const foundCatalog = response.data.data.catalogs.find(c => c.catalogId === route.params.id)
      if (foundCatalog) {
        catalog.value = foundCatalog
      }
    }
  } catch (error) {
    console.error('Error loading catalog:', error)
  }
}

onMounted(() => {
  loadCatalog()
  loadDocuments()
  
  // Poll catalog status if initializing
  const pollStatus = setInterval(async () => {
    if (catalog.value?.status === 'initializing') {
      await loadCatalog()
    } else {
      clearInterval(pollStatus)
    }
  }, 5000)
})
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #ccc;
  transition: all 0.3s ease;
}

.drop-zone.drag-over {
  border-color: #1976d2;
  background-color: #f5f5f5;
}
</style>