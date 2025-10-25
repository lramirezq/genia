<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Registro de Eventos</h1>
        
        <v-card class="mt-4">
          <v-card-title>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="search"
                  prepend-icon="mdi-magnify"
                  label="Buscar"
                  single-line
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filterAction"
                  :items="actions"
                  label="Acción"
                  clearable
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-btn color="primary" @click="loadLogs" block>
                  <v-icon left>mdi-refresh</v-icon>
                  Actualizar
                </v-btn>
              </v-col>
            </v-row>
          </v-card-title>
          
          <v-data-table
            :headers="headers"
            :items="filteredLogs"
            :loading="loading"
            :search="search"
            class="elevation-1"
          >
            <template v-slot:item.timestamp="{ item }">
              {{ formatDate(item.timestamp) }}
            </template>
            
            <template v-slot:item.action="{ item }">
              <v-chip :color="getActionColor(item.action)" small>
                {{ getActionText(item.action) }}
              </v-chip>
            </template>
            
            <template v-slot:item.details="{ item }">
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" small>mdi-information</v-icon>
                </template>
                <span>{{ item.details || 'Sin detalles' }}</span>
              </v-tooltip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../config/api'

const logs = ref([])
const loading = ref(false)
const search = ref('')
const filterAction = ref(null)

const actions = [
  'LOGIN',
  'LOGOUT',
  'CREATE_CATALOG',
  'DELETE_CATALOG',
  'UPLOAD_DOCUMENT',
  'DELETE_DOCUMENT',
  'START_CHAT',
  'CREATE_USER',
  'DELETE_USER',
  'ASSIGN_PERMISSION',
  'REVOKE_PERMISSION'
]

const headers = [
  { title: 'Fecha', key: 'timestamp', sortable: true },
  { title: 'Usuario', key: 'userEmail', sortable: true },
  { title: 'Acción', key: 'action', sortable: true },
  { title: 'Recurso', key: 'resourceType', sortable: true },
  { title: 'Nombre', key: 'resourceName', sortable: true },
  { title: 'IP', key: 'ipAddress', sortable: false },
  { title: 'Detalles', key: 'details', sortable: false }
]

const filteredLogs = computed(() => {
  if (!filterAction.value) return logs.value
  return logs.value.filter(log => log.action === filterAction.value)
})

const loadLogs = async () => {
  loading.value = true
  try {
    const response = await api.get('/audit-logs')
    if (response.data.success) {
      logs.value = response.data.data.logs
    }
  } catch (error) {
    console.error('Error loading audit logs:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getActionColor = (action) => {
  const colors = {
    LOGIN: 'success',
    LOGOUT: 'info',
    CREATE_CATALOG: 'primary',
    DELETE_CATALOG: 'error',
    UPLOAD_DOCUMENT: 'primary',
    DELETE_DOCUMENT: 'warning',
    START_CHAT: 'info',
    CREATE_USER: 'success',
    DELETE_USER: 'error',
    ASSIGN_PERMISSION: 'success',
    REVOKE_PERMISSION: 'warning'
  }
  return colors[action] || 'grey'
}

const getActionText = (action) => {
  const texts = {
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    CREATE_CATALOG: 'Crear catálogo',
    DELETE_CATALOG: 'Eliminar catálogo',
    UPLOAD_DOCUMENT: 'Subir documento',
    DELETE_DOCUMENT: 'Eliminar documento',
    START_CHAT: 'Iniciar chat',
    CREATE_USER: 'Crear usuario',
    DELETE_USER: 'Eliminar usuario',
    ASSIGN_PERMISSION: 'Asignar permiso',
    REVOKE_PERMISSION: 'Revocar permiso'
  }
  return texts[action] || action
}

onMounted(() => {
  loadLogs()
})
</script>
