import axios from 'axios'

const API_BASE_URL = 'https://z5bmc2llf7.execute-api.us-east-1.amazonaws.com/dev'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Don't add token to login endpoint
    if (!config.url?.includes('/auth/login')) {
      const token = localStorage.getItem('idToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log('API Request:', config.method?.toUpperCase(), config.url, 'Token: Present')
      } else {
        console.log('API Request:', config.method?.toUpperCase(), config.url, 'Token: Missing')
      }
    } else {
      console.log('API Request:', config.method?.toUpperCase(), config.url, 'Token: Not needed for login')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api