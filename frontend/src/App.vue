<template>
  <v-app>
    <v-navigation-drawer v-if="isAuthenticated" v-model="drawer" app>
      <v-list>
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" to="/dashboard" />
        <v-list-item prepend-icon="mdi-folder-multiple" title="Catálogos" to="/catalogs" />
        <v-list-item prepend-icon="mdi-chat" title="Chat" to="/chat" />
        <v-list-item v-if="isAdmin" prepend-icon="mdi-account-group" title="Usuarios" to="/users" />
        <v-list-item v-if="isAdmin" prepend-icon="mdi-shield-account" title="Permisos" to="/permissions" />
        <v-list-item v-if="isAdmin" prepend-icon="mdi-history" title="Registro de Eventos" to="/audit-logs" />
        <v-list-item prepend-icon="mdi-logout" title="Cerrar Sesión" @click="logout" />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar v-if="isAuthenticated" app>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>Sistema GenIA</v-toolbar-title>
      <v-spacer />
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-chip color="primary" v-bind="props">
            <v-icon left>mdi-account-circle</v-icon>
            {{ userFullName }}
          </v-chip>
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-lock-reset" @click="showChangePasswordDialog = true">
            <v-list-item-title>Cambiar Contraseña</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-logout" @click="logout">
            <v-list-item-title>Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <!-- Change Password Dialog -->
    <v-dialog v-model="showChangePasswordDialog" max-width="500px">
      <v-card>
        <v-card-title>Cambiar Contraseña</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="currentPassword"
            label="Contraseña Actual"
            type="password"
            :error-messages="passwordError"
          />
          <v-text-field
            v-model="newPassword"
            label="Nueva Contraseña"
            type="password"
            hint="Mínimo 8 caracteres, mayúsculas, minúsculas y números"
          />
          <v-text-field
            v-model="confirmPassword"
            label="Confirmar Nueva Contraseña"
            type="password"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closePasswordDialog">Cancelar</v-btn>
          <v-btn color="primary" @click="changePassword" :loading="changingPassword">Cambiar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const drawer = ref(true)
const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const userFullName = computed(() => {
  const user = authStore.user
  if (user?.firstName && user?.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user?.email || 'Usuario'
})
const isAdmin = computed(() => authStore.user?.role === 'admin')

const showChangePasswordDialog = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const changingPassword = ref(false)

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

const closePasswordDialog = () => {
  showChangePasswordDialog.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
}

const changePassword = async () => {
  passwordError.value = ''
  
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Todos los campos son requeridos'
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Las contraseñas no coinciden'
    return
  }
  
  if (newPassword.value.length < 8) {
    passwordError.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  
  changingPassword.value = true
  
  try {
    const response = await authStore.changePassword(currentPassword.value, newPassword.value)
    if (response.success) {
      alert('Contraseña cambiada exitosamente')
      closePasswordDialog()
    } else {
      passwordError.value = response.error || 'Error al cambiar contraseña'
    }
  } catch (error) {
    passwordError.value = 'Error al cambiar contraseña'
  } finally {
    changingPassword.value = false
  }
}
</script>