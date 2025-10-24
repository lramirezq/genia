<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Chat con IA</h1>
        
        <!-- Selector de Catálogo -->
        <v-card class="mb-4">
          <v-card-text>
            <v-select
              v-model="selectedCatalog"
              :items="availableCatalogs"
              item-title="name"
              item-value="catalogId"
              label="Selecciona un catálogo"
              prepend-icon="mdi-folder"
              :loading="loadingCatalogs"
              :disabled="loadingCatalogs"
              @update:model-value="onCatalogChange"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon :color="item.raw.status === 'ready' ? 'success' : 'warning'">
                      {{ item.raw.status === 'ready' ? 'mdi-check-circle' : 'mdi-clock' }}
                    </v-icon>
                  </template>
                  <template v-slot:append>
                    <v-chip size="small" :color="item.raw.status === 'ready' ? 'success' : 'warning'">
                      {{ item.raw.status === 'ready' ? 'Listo' : 'Creando...' }}
                    </v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <v-alert v-if="!selectedCatalog" type="info" variant="tonal" class="mt-2">
              Selecciona un catálogo para comenzar a chatear
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- Chat -->
        <v-card height="600" :disabled="!selectedCatalog">
          <v-card-text class="d-flex flex-column" style="height: 100%;">
            <div class="flex-grow-1 overflow-y-auto mb-4" ref="messagesContainer">
              <div v-if="messages.length === 0" class="text-center text-grey mt-8">
                <v-icon size="64" color="grey-lighten-1">mdi-chat-outline</v-icon>
                <p class="mt-2">No hay mensajes aún. ¡Comienza la conversación!</p>
              </div>
              <div v-for="message in messages" :key="message.id" class="mb-3">
                <v-chip
                  :color="message.isUser ? 'primary' : 'grey'"
                  :class="message.isUser ? 'float-right' : 'float-left'"
                  label
                >
                  {{ message.text }}
                </v-chip>
                <div class="clear-both"></div>
              </div>
              <div v-if="loading" class="mb-3">
                <v-chip color="grey" class="float-left" label>
                  <v-progress-circular indeterminate size="16" width="2" class="mr-2" />
                  Pensando...
                </v-chip>
                <div class="clear-both"></div>
              </div>
            </div>
            
            <v-text-field
              v-model="newMessage"
              label="Escribe tu mensaje..."
              append-icon="mdi-send"
              @click:append="sendMessage"
              @keyup.enter="sendMessage"
              :disabled="loading || !selectedCatalog"
              :placeholder="selectedCatalog ? 'Escribe tu pregunta...' : 'Selecciona un catálogo primero'"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import config from '../config'

const messages = ref([])
const newMessage = ref('')
const loading = ref(false)
const selectedCatalog = ref(null)
const availableCatalogs = ref([])
const loadingCatalogs = ref(false)
const messagesContainer = ref(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const loadCatalogs = async () => {
  loadingCatalogs.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${config.apiUrl}/catalogs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Filtrar solo catálogos listos
    availableCatalogs.value = response.data.filter(c => c.status === 'ready')
    
    // Si solo hay un catálogo, seleccionarlo automáticamente
    if (availableCatalogs.value.length === 1) {
      selectedCatalog.value = availableCatalogs.value[0].catalogId
      onCatalogChange()
    }
  } catch (error) {
    console.error('Error loading catalogs:', error)
  } finally {
    loadingCatalogs.value = false
  }
}

const onCatalogChange = () => {
  messages.value = []
  if (selectedCatalog.value) {
    const catalog = availableCatalogs.value.find(c => c.catalogId === selectedCatalog.value)
    messages.value.push({
      id: Date.now(),
      text: `¡Hola! Soy tu asistente para el catálogo "${catalog?.name}". ¿En qué puedo ayudarte?`,
      isUser: false
    })
    scrollToBottom()
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedCatalog.value) return
  
  const userMessage = {
    id: Date.now(),
    text: newMessage.value,
    isUser: true
  }
  
  messages.value.push(userMessage)
  scrollToBottom()
  
  const messageText = newMessage.value
  newMessage.value = ''
  loading.value = true
  
  try {
    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${config.apiUrl}/chat`,
      {
        catalogId: selectedCatalog.value,
        question: messageText
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      }
    )
    
    messages.value.push({
      id: Date.now() + 1,
      text: response.data.answer || 'Lo siento, no pude procesar tu pregunta.',
      isUser: false
    })
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({
      id: Date.now() + 1,
      text: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
      isUser: false
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

onMounted(() => {
  loadCatalogs()
})
</script>

<style scoped>
.clear-both {
  clear: both;
}
</style>