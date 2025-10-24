<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Sistema GenIA</v-toolbar-title>
          </v-toolbar>
          
          <!-- Formulario de Login Normal -->
          <v-card-text v-if="!showPasswordChange">
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="Email"
                prepend-icon="mdi-account"
                type="email"
                required
              />
              <v-text-field
                v-model="password"
                label="Contraseña"
                prepend-icon="mdi-lock"
                type="password"
                required
              />
            </v-form>
          </v-card-text>
          
          <!-- Formulario de Cambio de Contraseña -->
          <v-card-text v-else>
            <v-alert type="info" class="mb-4">
              Debes cambiar tu contraseña temporal por una nueva.
            </v-alert>
            <v-form @submit.prevent="handlePasswordChange">
              <v-text-field
                v-model="newPassword"
                label="Nueva Contraseña"
                prepend-icon="mdi-lock-outline"
                type="password"
                required
                hint="Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números"
              />
              <v-text-field
                v-model="confirmPassword"
                label="Confirmar Contraseña"
                prepend-icon="mdi-lock-check"
                type="password"
                required
              />
            </v-form>
          </v-card-text>
          
          <v-card-actions>
            <v-spacer />
            <v-btn
              v-if="!showPasswordChange"
              color="primary"
              :loading="loading"
              @click="handleLogin"
            >
              Iniciar Sesión
            </v-btn>
            <v-btn
              v-else
              color="primary"
              :loading="loading"
              @click="handlePasswordChange"
            >
              Cambiar Contraseña
            </v-btn>
          </v-card-actions>
          
          <v-alert v-if="error" type="error" class="ma-4">
            {{ error }}
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const showPasswordChange = ref(false)
const challengeSession = ref(null)

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  const result = await authStore.login(email.value, password.value)
  
  if (result.success) {
    router.push('/dashboard')
  } else if (result.requiresPasswordChange) {
    showPasswordChange.value = true
    challengeSession.value = result.session
    error.value = ''
  } else {
    error.value = result.error
  }
  
  loading.value = false
}

const handlePasswordChange = async () => {
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  
  if (newPassword.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  
  loading.value = true
  error.value = ''
  
  const result = await authStore.respondToChallenge(
    email.value, 
    newPassword.value, 
    challengeSession.value
  )
  
  if (result.success) {
    router.push('/dashboard')
  } else {
    error.value = result.error
  }
  
  loading.value = false
}
</script>