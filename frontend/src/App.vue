<template>
  <v-app>
    <v-navigation-drawer v-if="isAuthenticated" v-model="drawer" app>
      <v-list>
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" to="/dashboard" />
        <v-list-item prepend-icon="mdi-folder-multiple" title="Catálogos" to="/catalogs" />
        <v-list-item prepend-icon="mdi-chat" title="Chat" to="/chat" />
        <v-list-item v-if="isAdmin" prepend-icon="mdi-account-group" title="Usuarios" to="/users" />
        <v-list-item v-if="isAdmin" prepend-icon="mdi-shield-account" title="Permisos" to="/permissions" />
        <v-list-item prepend-icon="mdi-logout" title="Cerrar Sesión" @click="logout" />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar v-if="isAuthenticated" app>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>Sistema GenIA</v-toolbar-title>
      <v-spacer />
      <v-chip color="primary">{{ userEmail }}</v-chip>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const drawer = ref(true)
const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const userEmail = computed(() => authStore.user?.email)
const isAdmin = computed(() => authStore.user?.role === 'admin')

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  authStore.checkAuth()
})
</script>