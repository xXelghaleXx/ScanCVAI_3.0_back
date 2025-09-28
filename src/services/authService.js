import api from './Api';

class AuthService {
  // 🔐 Login tradicional
  async login(credentials) {
    try {
      console.log('🔐 Iniciando login tradicional...');
      
      const response = await api.post('/auth/login', {
        correo: credentials.email,
        contrasena: credentials.password,
        client_id: 'frontend_app',
        client_secret: '123456'
      });

      const { access_token, refresh_token, token_type, expires_in } = response.data;

      // Guardar tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('expires_in', expires_in);

      // Obtener información del usuario decodificando el JWT
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]));
        const userData = {
          id: payload.id,
          email: payload.correo,
          iat: payload.iat,
          exp: payload.exp
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('nombre', userData.email); // Para el header
        
        console.log('✅ Login exitoso:', userData);
        return { success: true, user: userData };
      } catch (jwtError) {
        console.warn('⚠️ No se pudo decodificar el JWT:', jwtError);
        return { success: true, user: { email: credentials.email } };
      }

    } catch (error) {
      console.error('❌ Error en login:', error);
      const errorMessage = error.response?.data?.error || 'Error al iniciar sesión';
      return { success: false, error: errorMessage };
    }
  }

  // 🔐 Login con Google
  async loginWithGoogle(googleCredential) {
    try {
      console.log('🔐 Iniciando login con Google...');
      
      const response = await api.post('/auth/google', {
        token: googleCredential
      });

      const { access_token, refresh_token, token_type, expires_in } = response.data;

      // Guardar tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('expires_in', expires_in);

      // Obtener información del usuario
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]));
        const userData = {
          id: payload.id,
          email: payload.correo,
          iat: payload.iat,
          exp: payload.exp
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('nombre', userData.email);
        
        console.log('✅ Login con Google exitoso:', userData);
        return { success: true, user: userData };
      } catch (jwtError) {
        console.warn('⚠️ No se pudo decodificar el JWT:', jwtError);
        return { success: true, user: { email: 'Usuario Google' } };
      }

    } catch (error) {
      console.error('❌ Error en login con Google:', error);
      const errorMessage = error.response?.data?.error || 'Error al iniciar sesión con Google';
      return { success: false, error: errorMessage };
    }
  }

  // 📝 Registro de usuario
  async register(userData) {
    try {
      console.log('📝 Iniciando registro...');
      
      const response = await api.post('/auth/register', {
        nombre: userData.nombre,
        correo: userData.email,
        contrasena: userData.password
      });

      console.log('✅ Registro exitoso:', response.data);
      return { success: true, data: response.data };

    } catch (error) {
      console.error('❌ Error en registro:', error);
      const errorMessage = error.response?.data?.error || 'Error al registrarse';
      return { success: false, error: errorMessage };
    }
  }

  // 🚪 Logout
  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        await api.post('/auth/logout', {
          refresh_token: refreshToken
        });
      }
      
      console.log('🚪 Logout exitoso');
    } catch (error) {
      console.error('❌ Error en logout:', error);
    } finally {
      // Limpiar localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('expires_in');
      localStorage.removeItem('user');
      localStorage.removeItem('nombre');
      localStorage.removeItem('alumno_id');
    }
  }

  // ✅ Verificar si está autenticado
  isAuthenticated() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) return false;

    try {
      // Verificar si el token no ha expirado
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp < now) {
        console.log('⏰ Token expirado');
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      this.logout();
      return false;
    }
  }

  // 👤 Obtener usuario actual
  getCurrentUser() {
    try {
      const userString = localStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      return null;
    }
  }

  // 🔄 Renovar token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No hay refresh token');
      }

      const response = await api.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      
      console.log('🔄 Token renovado exitosamente');
      return { success: true };

    } catch (error) {
      console.error('❌ Error renovando token:', error);
      this.logout();
      return { success: false, error: error.message };
    }
  }
}

// Exportar instancia singleton
export const authService = new AuthService();
export default authService;