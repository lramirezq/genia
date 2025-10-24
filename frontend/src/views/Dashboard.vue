<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Dashboard</h1>
        <v-card>
          <v-card-title>Bienvenido al Sistema GenIA</v-card-title>
          <v-card-text>
            <p>Sistema de gestión de documentos con IA generativa</p>
            <v-row>
              <v-col cols="12" md="4">
                <v-card color="primary" dark>
                  <v-card-title>Catálogos</v-card-title>
                  <v-card-text>
                    <div class="text-h2">{{ stats.catalogs }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card color="success" dark>
                  <v-card-title>Documentos</v-card-title>
                  <v-card-text>
                    <div class="text-h2">{{ stats.documents }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card color="info" dark>
                  <v-card-title>Consultas</v-card-title>
                  <v-card-text>
                    <div class="text-h2">{{ stats.queries }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../config/api'

const stats = ref({
  catalogs: 0,
  documents: 0,
  queries: 0
})

const loadStats = async () => {
  try {
    const response = await api.get('/stats')
    
    if (response.data.success) {
      stats.value = response.data.data
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>