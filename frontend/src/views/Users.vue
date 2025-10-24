<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>Gestión de Usuarios</h1>
          <v-btn color="primary" @click="showCreateDialog = true">
            <v-icon left>mdi-account-plus</v-icon>
            Nuevo Usuario
          </v-btn>
        </div>

        <v-data-table
          :headers="headers"
          :items="users"
          :loading="loading"
          class="elevation-1"
        >
          <template v-slot:item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" small>
              {{ item.status }}
            </v-chip>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon small @click="editUser(item)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon small @click="resetPassword(item)">
              <v-icon>mdi-key</v-icon>
            </v-btn>
            <v-btn icon small @click="deleteUser(item)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>

        <!-- Create User Dialog -->
        <v-dialog v-model="showCreateDialog" max-width="500px">
          <v-card>
            <v-card-title>Crear Nuevo Usuario</v-card-title>
            <v-card-text>
              <v-text-field v-model="newUser.email" label="Email" type="email" required />
              <v-text-field v-model="newUser.firstName" label="Nombre" required />
              <v-text-field v-model="newUser.lastName" label="Apellido" required />
              <v-text-field v-model="newUser.temporaryPassword" label="Contraseña Temporal" type="password" />
              <v-select
                v-model="newUser.role"
                :items="['user', 'admin']"
                label="Rol"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="showCreateDialog = false">Cancelar</v-btn>
              <v-btn color="primary" @click="createUser">Crear</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Edit User Dialog -->
        <v-dialog v-model="showEditDialog" max-width="500px">
          <v-card>
            <v-card-title>Editar Usuario</v-card-title>
            <v-card-text>
              <v-text-field v-model="editingUser.email" label="Email" disabled />
              <v-text-field v-model="editingUser.firstName" label="Nombre" required />
              <v-text-field v-model="editingUser.lastName" label="Apellido" required />
              <v-select
                v-model="editingUser.role"
                :items="['user', 'admin']"
                label="Rol"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="showEditDialog = false">Cancelar</v-btn>
              <v-btn color="primary" @click="updateUser">Actualizar</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../config/api'

const users = ref([])
const loading = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const newUser = ref({
  email: '',
  firstName: '',
  lastName: '',
  temporaryPassword: '',
  role: 'user'
})
const editingUser = ref({
  email: '',
  firstName: '',
  lastName: '',
  role: 'user'
})

const headers = [
  { title: 'Email', key: 'email' },
  { title: 'Nombre', key: 'firstName' },
  { title: 'Apellido', key: 'lastName' },
  { title: 'Rol', key: 'role' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false }
]

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/users')
    if (response.data.success) {
      users.value = response.data.data.users
    }
  } catch (error) {
    console.error('Error loading users:', error)
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  try {
    const response = await api.post('/users', newUser.value)
    if (response.data.success) {
      showCreateDialog.value = false
      newUser.value = { email: '', firstName: '', lastName: '', temporaryPassword: '', role: 'user' }
      loadUsers()
    }
  } catch (error) {
    console.error('Error creating user:', error)
  }
}

const editUser = (user) => {
  editingUser.value = { ...user }
  showEditDialog.value = true
}

const updateUser = async () => {
  try {
    const response = await api.put(`/users/${encodeURIComponent(editingUser.value.email)}`, {
      firstName: editingUser.value.firstName,
      lastName: editingUser.value.lastName,
      role: editingUser.value.role
    })
    if (response.data.success) {
      showEditDialog.value = false
      loadUsers()
    }
  } catch (error) {
    console.error('Error updating user:', error)
  }
}

const resetPassword = async (user) => {
  const newPassword = prompt(`Nueva contraseña para ${user.email}:`)
  if (newPassword) {
    try {
      const response = await api.post(`/users/${encodeURIComponent(user.email)}/reset-password`, {
        newPassword
      })
      if (response.data.success) {
        alert('Contraseña actualizada correctamente')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Error al resetear contraseña')
    }
  }
}

const deleteUser = async (user) => {
  if (confirm(`¿Eliminar usuario ${user.email}?`)) {
    try {
      const response = await api.delete(`/users/${encodeURIComponent(user.email)}`)
      if (response.data.success) {
        loadUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'CONFIRMED': return 'success'
    case 'FORCE_CHANGE_PASSWORD': return 'warning'
    default: return 'grey'
  }
}

onMounted(() => {
  loadUsers()
})
</script>