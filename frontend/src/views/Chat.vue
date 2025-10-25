<template>
  <v-container>
    <v-row>
      <v-col cols="12">
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
        <v-card :disabled="!selectedCatalog">
          <v-card-title>
            <v-icon left>mdi-chat</v-icon>
            Chat con {{ getCatalogName() }}
          </v-card-title>
          
          <v-card-text>
            <div class="chat-container" ref="chatContainer">
              <div v-if="messages.length === 0" class="text-center text-grey mt-8">
                <v-icon size="64" color="grey-lighten-1">mdi-chat-outline</v-icon>
                <p class="mt-2">No hay mensajes aún. ¡Comienza la conversación!</p>
              </div>
              
              <div v-for="message in messages" :key="message.id" class="message-wrapper">
                <v-card 
                  :class="message.isUser ? 'user-message' : 'bot-message'"
                  class="mb-3"
                >
                  <v-card-text>
                    <div class="message-header">
                      <div class="d-flex align-center">
                        <v-icon small>{{ message.isUser ? 'mdi-account' : 'mdi-robot' }}</v-icon>
                        <span class="ml-2">{{ message.isUser ? 'Tú' : 'GenIA' }}</span>
                      </div>
                      <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                    </div>
                    <div class="message-content mt-2" v-html="formatMessage(message.text)"></div>
                    <div v-if="message.sources && message.sources.length > 0" class="mt-3">
                      <v-divider class="mb-2"></v-divider>
                      <div class="sources-header">
                        <v-icon small>mdi-file-document</v-icon>
                        <span class="ml-1">Fuentes consultadas:</span>
                      </div>
                      <div class="source-item mt-1">
                        <v-chip 
                          v-for="source in message.sources"
                          :key="source.name"
                          small 
                          color="primary" 
                          outlined 
                          :href="source.downloadUrl" 
                          target="_blank"
                          tag="a"
                          class="mr-2 mb-1"
                        >
                          <v-icon left small>mdi-download</v-icon>
                          {{ source.name }}
                        </v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
              
              <div v-if="loading" class="text-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-2">GenIA está pensando...</p>
              </div>
            </div>
          </v-card-text>
          
          <v-card-actions>
            <v-btn 
              color="secondary" 
              @click="exportToPDF"
              :disabled="messages.length === 0"
              class="mr-2"
            >
              <v-icon left>mdi-file-pdf</v-icon>
              Exportar PDF
            </v-btn>
            <v-text-field
              v-model="newMessage"
              label="Escribe tu pregunta..."
              outlined
              dense
              @keyup.enter="sendMessage"
              :disabled="loading || !selectedCatalog"
              class="flex-grow-1"
            ></v-text-field>
            <v-btn 
              color="primary" 
              @click="sendMessage"
              :disabled="!newMessage.trim() || loading || !selectedCatalog"
              class="ml-2"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import api from '../config/api'
import { marked } from 'marked'

export default {
  name: 'Chat',
  data() {
    return {
      messages: [],
      newMessage: '',
      loading: false,
      selectedCatalog: null,
      availableCatalogs: [],
      loadingCatalogs: false,
      sessionId: null
    }
  },
  async mounted() {
    await this.loadCatalogs()
    this.sessionId = `session-${Date.now()}`
  },
  methods: {
    async loadCatalogs() {
      this.loadingCatalogs = true
      try {
        const response = await api.get('/catalogs')
        const catalogs = response.data.data?.catalogs || response.data.catalogs || response.data || []
        this.availableCatalogs = catalogs.filter(c => c.status === 'ready')
        
        if (this.availableCatalogs.length === 1) {
          this.selectedCatalog = this.availableCatalogs[0].catalogId
          this.onCatalogChange()
        }
      } catch (error) {
        console.error('Error loading catalogs:', error)
      } finally {
        this.loadingCatalogs = false
      }
    },
    
    onCatalogChange() {
      this.messages = []
      if (this.selectedCatalog) {
        const catalog = this.availableCatalogs.find(c => c.catalogId === this.selectedCatalog)
        this.messages.push({
          id: Date.now(),
          text: `¡Hola! Soy **GenIA**, tu asistente para el catálogo **${catalog?.name}**. ¿En qué puedo ayudarte?`,
          isUser: false,
          timestamp: new Date()
        })
        this.scrollToBottom()
      }
    },
    
    async sendMessage() {
      if (!this.newMessage.trim() || !this.selectedCatalog) return
      
      const userMessage = {
        id: Date.now(),
        text: this.newMessage,
        isUser: true,
        timestamp: new Date()
      }
      
      this.messages.push(userMessage)
      const messageText = this.newMessage
      this.newMessage = ''
      this.loading = true
      
      try {
        const response = await api.post('/chat', {
          catalogId: this.selectedCatalog,
          message: messageText,
          sessionId: this.sessionId
        })
        
        const responseData = response.data.data || response.data
        
        const botMessage = {
          id: Date.now() + 1,
          text: responseData.response || responseData.answer || 'Lo siento, no pude procesar tu pregunta.',
          sources: responseData.sources || [],
          isUser: false,
          timestamp: new Date()
        }
        
        this.messages.push(botMessage)
        this.sessionId = responseData.sessionId
        
      } catch (error) {
        console.error('Chat error:', error)
        this.messages.push({
          id: Date.now() + 1,
          text: 'Lo siento, hubo un error al procesar tu mensaje.',
          isUser: false,
          timestamp: new Date()
        })
      } finally {
        this.loading = false
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.chatContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    
    formatMessage(text) {
      return marked(text)
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      return new Date(timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    getCatalogName() {
      const catalog = this.availableCatalogs.find(c => c.catalogId === this.selectedCatalog)
      return catalog?.name || 'IA'
    },
    
    async exportToPDF() {
      try {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        const catalog = this.availableCatalogs.find(c => c.catalogId === this.selectedCatalog)
        
        doc.setFontSize(16)
        doc.text(`Chat - ${catalog?.name || 'Catálogo'}`, 20, 20)
        doc.setFontSize(10)
        doc.text(`Exportado: ${new Date().toLocaleString('es-ES')}`, 20, 30)
        
        let yPosition = 50
        
        this.messages.forEach((message) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }
          
          doc.setFontSize(12)
          const sender = message.isUser ? 'Tú' : 'GenIA'
          const time = this.formatTime(message.timestamp)
          doc.text(`${sender} - ${time}`, 20, yPosition)
          yPosition += 10
          
          doc.setFontSize(10)
          const lines = doc.splitTextToSize(message.text, 170)
          doc.text(lines, 20, yPosition)
          yPosition += lines.length * 5 + 10
          
          if (message.sources && message.sources.length > 0) {
            doc.setFontSize(9)
            doc.text('Fuentes:', 20, yPosition)
            yPosition += 5
            message.sources.forEach(source => {
              doc.text(`• ${source.name}`, 25, yPosition)
              yPosition += 4
            })
            yPosition += 5
          }
        })
        
        doc.save(`chat-${catalog?.name || 'catalogo'}-${new Date().toISOString().split('T')[0]}.pdf`)
      } catch (error) {
        console.error('Error exporting PDF:', error)
        alert('Error al exportar PDF')
      }
    }
  }
}
</script>

<style scoped>
.chat-container {
  height: 500px;
  overflow-y: auto;
  padding: 16px;
}

.user-message {
  margin-left: 20%;
  background-color: #e3f2fd;
}

.bot-message {
  margin-right: 20%;
  background-color: #f5f5f5;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
  font-size: 0.9em;
}

.message-time {
  font-size: 0.8em;
  color: #666;
  font-weight: normal;
}

.message-content {
  white-space: pre-wrap;
}

.sources-header {
  display: flex;
  align-items: center;
  font-size: 0.85em;
  color: #666;
  font-weight: 500;
}

.message-content >>> h1,
.message-content >>> h2,
.message-content >>> h3 {
  margin: 16px 0 8px 0;
}

.message-content >>> p {
  margin: 8px 0;
}

.message-content >>> ul,
.message-content >>> ol {
  margin: 8px 0;
  padding-left: 20px;
}

.message-content >>> code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.message-content >>> pre {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
</style>