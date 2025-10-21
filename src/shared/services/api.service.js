// Api.js - Con manejo mejorado de renovación de tokens

import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar múltiples intentos de refresh simultáneos
let isRefreshing = false;
let refreshSubscribers = [];

// Agregar requests a la cola de espera
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

// Notificar a todos los requests en espera
function onTokenRefreshed(token) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

// ========== INTERCEPTOR PARA REQUESTS ==========
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token añadido a la petición');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

// ========== INTERCEPTOR PARA RESPONSES ==========
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no hemos intentado renovar aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Si ya hay un refresh en proceso, esperar
      if (isRefreshing) {
        console.log('⏳ Esperando renovación de token en proceso...');
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axios(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No hay refresh token');
        }

        console.log('🔄 Renovando token expirado...');
        
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        
        if (!access_token) {
          throw new Error('No se recibió access token');
        }

        // Guardar nuevo token
        localStorage.setItem('access_token', access_token);
        
        console.log('✅ Token renovado exitosamente');
        
        // Actualizar header del request original
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        // Notificar a todos los requests en espera
        onTokenRefreshed(access_token);
        
        isRefreshing = false;
        
        // Reintentar el request original
        return axios(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Error renovando token:', refreshError);
        
        isRefreshing = false;
        refreshSubscribers = [];
        
        // Limpiar storage y redirigir
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        
        // Redirigir al login
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        
        return Promise.reject(refreshError);
      }
    }

    // Manejo de otros errores
    if (error.response?.status === 403) {
      toast.error('No tienes permisos para realizar esta acción');
    } else if (error.response?.status === 404) {
      toast.error('Recurso no encontrado');
    } else if (error.response?.status >= 500) {
      toast.error('Error del servidor. Inténtalo más tarde');
    } else if (error.response?.status === 429) {
      toast.warning('Demasiadas peticiones. Espera un momento.');
    }

    return Promise.reject(error);
  }
);

export default api;