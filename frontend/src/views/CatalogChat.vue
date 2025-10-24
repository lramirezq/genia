<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-chat</v-icon>
            Chat con {{ catalog?.name }}
          </v-card-title>
          
          <v-card-text>
            <div class="chat-container" ref="chatContainer">
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
                      <div v-for="source in message.sources" :key="source.name" class="source-item mt-1">
                        <v-chip 
                          small 
                          color="primary" 
                          outlined 
                          :href="source.downloadUrl" 
                          target="_blank"
                          tag="a"
                          v-if="source.downloadUrl"
                        >
                          <v-icon left small>mdi-download</v-icon>
                          {{ source.name }}
                        </v-chip>
                        <v-chip 
                          small 
                          color="grey" 
                          outlined 
                          disabled
                          v-else
                        >
                          <v-icon left small>mdi-file</v-icon>
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
              :disabled="loading"
              class="flex-grow-1"
            ></v-text-field>
            <v-btn 
              color="primary" 
              @click="sendMessage"
              :disabled="!newMessage.trim() || loading"
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
  name: 'CatalogChat',
  data() {
    return {
      messages: [],
      newMessage: '',
      loading: false,
      sessionId: null,
      catalog: null
    }
  },
  computed: {
    catalogId() {
      return this.$route.params.id
    }
  },
  async mounted() {
    await this.loadCatalog()
    this.sessionId = `session-${Date.now()}`
  },
  methods: {
    async loadCatalog() {
      try {
        const response = await api.get('/catalogs')
        if (response.data.success) {
          this.catalog = response.data.data.catalogs.find(c => c.catalogId === this.catalogId)
        }
      } catch (error) {
        console.error('Error loading catalog:', error)
      }
    },
    
    async sendMessage() {
      if (!this.newMessage.trim()) return
      
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
          catalogId: this.catalogId,
          message: messageText,
          sessionId: this.sessionId
        })
        
        const botMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          sources: response.data.sources || [],
          isUser: false,
          timestamp: new Date()
        }
        
        this.messages.push(botMessage)
        this.sessionId = response.data.sessionId
        
      } catch (error) {
        console.error('Chat error:', error)
        const errorMessage = {
          id: Date.now() + 1,
          text: 'Lo siento, hubo un error al procesar tu mensaje.',
          isUser: false,
          timestamp: new Date()
        }
        this.messages.push(errorMessage)
      } finally {
        this.loading = false
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    
    scrollToBottom() {
      const container = this.$refs.chatContainer
      if (container) {
        container.scrollTop = container.scrollHeight
      }
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
    
    async exportToPDF() {
      try {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        
        // Header
        doc.setFontSize(16)
        doc.text(`Chat - ${this.catalog?.name || 'Catálogo'}`, 20, 20)
        doc.setFontSize(10)
        doc.text(`Exportado: ${new Date().toLocaleString('es-ES')}`, 20, 30)
        
        let yPosition = 50
        
        this.messages.forEach((message, index) => {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }
          
          // Message header
          doc.setFontSize(12)
          const sender = message.isUser ? 'Tú' : 'GenIA'
          const time = this.formatTime(message.timestamp)
          doc.text(`${sender} - ${time}`, 20, yPosition)
          yPosition += 10
          
          // Message content
          doc.setFontSize(10)
          const lines = doc.splitTextToSize(message.text, 170)
          doc.text(lines, 20, yPosition)
          yPosition += lines.length * 5 + 10
          
          // Sources
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
        
        doc.save(`chat-${this.catalog?.name || 'catalogo'}-${new Date().toISOString().split('T')[0]}.pdf`)
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
  height: 400px;
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

.source-item {
  display: inline-block;
  margin-right: 8px;
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