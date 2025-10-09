// Script de prueba para verificar el endpoint de métricas de usuario
const axios = require('axios');

async function testAdminEndpoint() {
  try {
    // Primero necesitas obtener un token de admin
    // Reemplaza con las credenciales de un usuario administrador real
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      correo: 'admin@example.com', // Cambia esto
      password: 'admin123' // Cambia esto
    });

    const token = loginResponse.data.accessToken;
    console.log('✅ Login exitoso, token obtenido');

    // Ahora prueba el endpoint de métricas de usuario
    // Reemplaza con un ID de usuario real
    const userId = 1; // Cambia esto por un ID de usuario real

    const metricsResponse = await axios.get(
      `http://localhost:3000/api/admin/usuarios/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('✅ Métricas obtenidas exitosamente:');
    console.log(JSON.stringify(metricsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error en la prueba:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testAdminEndpoint();
