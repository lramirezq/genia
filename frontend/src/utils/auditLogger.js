import api from '../config/api'

export const logEvent = async (action, resourceType, resourceId, resourceName, details = null) => {
  try {
    const token = localStorage.getItem('idToken')
    if (!token) {
      console.log('No token found, skipping audit log')
      return
    }
    
    // Decode token to get user info
    const payload = JSON.parse(atob(token.split('.')[1]))
    
    console.log('Logging event:', action, 'for user:', payload.email)
    
    const response = await api.post('/audit-logs', {
      userId: payload.sub,
      userEmail: payload.email,
      action,
      resourceType,
      resourceId,
      resourceName,
      details
    })
    
    console.log('Event logged successfully:', response.data)
  } catch (error) {
    console.error('Error logging event:', error)
  }
}

export const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_CATALOG: 'CREATE_CATALOG',
  DELETE_CATALOG: 'DELETE_CATALOG',
  UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
  START_CHAT: 'START_CHAT',
  CREATE_USER: 'CREATE_USER',
  DELETE_USER: 'DELETE_USER',
  ASSIGN_PERMISSION: 'ASSIGN_PERMISSION',
  REVOKE_PERMISSION: 'REVOKE_PERMISSION'
}
