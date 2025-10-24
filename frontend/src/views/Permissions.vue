<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Gestión de Permisos</h1>
        <v-card>
          <v-card-title>Asignar Usuarios a Catálogos</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedUser"
                  :items="users"
                  item-title="email"
                  item-value="userId"
                  label="Seleccionar Usuario"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedCatalog"
                  :items="catalogs"
                  item-title="name"
                  item-value="catalogId"
                  label="Seleccionar Catálogo"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedPermission"
                  :items="permissionTypes"
                  item-title="title"
                  item-value="value"
                  label="Tipo de Permiso"
                />
              </v-col>
            </v-row>
            <v-btn 
              color="primary" 
              @click="assignPermission"
              :disabled="!selectedUser || !selectedCatalog"
            >
              Asignar Permiso
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Permisos Actuales</v-card-title>
          <v-data-table
            :headers="permissionHeaders"
            :items="permissions"
            :loading="loading"
          >
            <template v-slot:item.actions="{ item }">
              <v-btn icon small @click="revokePermission(item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../config/api'

const users = ref([])
const catalogs = ref([])
const permissions = ref([])
const selectedUser = ref('')
const selectedCatalog = ref('')
const selectedPermission = ref('read')
const loading = ref(false)

const permissionTypes = [
  { title: 'Solo Lectura', value: 'read' },
  { title: 'Lectura y Escritura', value: 'write' }
]

const permissionHeaders = [
  { title: 'Usuario', key: 'userEmail' },
  { title: 'Catálogo', key: 'catalogName' },
  { title: 'Permiso', key: 'permission' },
  { title: 'Acciones', key: 'actions', sortable: false }
]

const loadData = async () => {
  loading.value = true
  try {
    // Load users, catalogs and permissions
    const [usersRes, catalogsRes, permissionsRes] = await Promise.all([
      api.get('/users'),
      api.get('/catalogs'),
      api.get('/permissions')
    ])
    
    if (usersRes.data.success) {
      users.value = usersRes.data.data.users
    }
    if (catalogsRes.data.success) {
      catalogs.value = catalogsRes.data.data.catalogs
    }
    if (permissionsRes.data.success) {
      // Map permissions with user emails and catalog names
      permissions.value = permissionsRes.data.data.permissions.map(permission => {
        const user = users.value.find(u => u.userId === permission.userId)
        const catalog = catalogs.value.find(c => c.catalogId === permission.catalogId)
        return {
          ...permission,
          userEmail: user?.email || permission.userId,
          catalogName: catalog?.name || permission.catalogId
        }
      })
    }
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

const assignPermission = async () => {
  try {
    const response = await api.post('/permissions', {
      userId: selectedUser.value,
      catalogId: selectedCatalog.value,
      permission: selectedPermission.value
    })
    
    if (response.data.success) {
      selectedUser.value = ''
      selectedCatalog.value = ''
      selectedPermission.value = 'read'
      // Reload all data including permissions
      await loadData()
    }
  } catch (error) {
    console.error('Error assigning permission:', error)
  }
}

const revokePermission = async (permission) => {
  try {
    const response = await api.delete('/permissions', {
      data: {
        userId: permission.userId,
        catalogId: permission.catalogId
      }
    })
    
    if (response.data.success) {
      await loadData()
    }
  } catch (error) {
    console.error('Error revoking permission:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>