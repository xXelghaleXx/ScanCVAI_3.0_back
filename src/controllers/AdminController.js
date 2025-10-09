const {
  Alumno,
  CV,
  Informe,
  Entrevista,
  RespuestaEntrevista,
  HistorialEntrevista
} = require("../models");
const { Op } = require('sequelize');
const sequelize = require("../config/database");
const logger = require("../services/LoggerService");
const utilsService = require("../services/UtilsService");

class AdminController {

  // 📊 Obtener lista de todos los usuarios con métricas básicas
  static async obtenerUsuarios(req, res) {
    try {
      const { page = 1, limit = 20, search = '', rol = '', estado = '' } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros
      const where = {};

      if (search) {
        where[Op.or] = [
          { nombre: { [Op.iLike]: `%${search}%` } },
          { correo: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (rol && ['alumno', 'administrador'].includes(rol)) {
        where.rol = rol;
      }

      if (estado && ['activo', 'inactivo', 'suspendido'].includes(estado)) {
        where.estado = estado;
      }

      // Obtener usuarios con métricas básicas
      const { count, rows: usuarios } = await Alumno.findAndCountAll({
        where,
        attributes: [
          'id',
          'nombre',
          'correo',
          'rol',
          'estado',
          'fecha_ultimo_acceso',
          'createdAt',
          'intentos_fallidos'
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Obtener métricas para cada usuario
      const usuariosConMetricas = await Promise.all(
        usuarios.map(async (usuario) => {
          const [totalCVs, totalEntrevistas, totalInformes, promedioEntrevistas] = await Promise.all([
            CV.count({ where: { alumnoId: usuario.id } }),
            Entrevista.count({ where: { alumnoId: usuario.id } }),
            Informe.count({
              include: [{
                model: CV,
                as: 'cv',
                where: { alumnoId: usuario.id }
              }]
            }),
            Entrevista.findOne({
              where: {
                alumnoId: usuario.id,
                promedio_puntuacion: { [Op.not]: null }
              },
              attributes: [
                [sequelize.fn('AVG', sequelize.col('promedio_puntuacion')), 'promedio']
              ]
            })
          ]);

          return {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
            estado: usuario.estado,
            fecha_registro: usuario.createdAt,
            ultimo_acceso: usuario.fecha_ultimo_acceso,
            intentos_fallidos: usuario.intentos_fallidos,
            metricas: {
              total_cvs: totalCVs,
              total_entrevistas: totalEntrevistas,
              total_informes: totalInformes,
              promedio_entrevistas: promedioEntrevistas ?
                parseFloat(promedioEntrevistas.getDataValue('promedio')).toFixed(2) : null
            }
          };
        })
      );

      logger.info("Lista de usuarios obtenida por admin", {
        admin_id: req.user.id,
        total_usuarios: count,
        page,
        limit
      });

      res.json({
        success: true,
        data: {
          usuarios: usuariosConMetricas,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(count / limit)
          },
          filtros_aplicados: {
            search,
            rol,
            estado
          }
        }
      });

    } catch (error) {
      logger.error("Error obteniendo lista de usuarios", error, {
        admin_id: req.user?.id
      });
      res.status(500).json({
        error: "Error obteniendo lista de usuarios",
        details: error.message
      });
    }
  }

  // 📈 Obtener métricas detalladas de un usuario específico
  static async obtenerMetricasUsuario(req, res) {
    try {
      const { userId } = req.params;

      // Verificar que el usuario existe
      const usuario = await Alumno.findByPk(userId, {
        attributes: ['id', 'nombre', 'correo', 'rol', 'estado', 'fecha_ultimo_acceso', 'createdAt']
      });

      if (!usuario) {
        return res.status(404).json({
          error: "Usuario no encontrado"
        });
      }

      // Obtener todas las métricas del usuario
      const [
        cvs,
        entrevistas,
        informes,
        estadisticasEntrevistas,
        distribucionResultados,
        ultimasActividades
      ] = await Promise.all([
        // CVs del usuario
        CV.findAll({
          where: { alumnoId: userId },
          attributes: ['id', 'archivo', 'fecha_creacion', 'contenido_extraido'],
          order: [['fecha_creacion', 'DESC']],
          limit: 10
        }),

        // Entrevistas del usuario
        Entrevista.findAll({
          where: { alumnoId: userId },
          attributes: ['id', 'fecha', 'promedio_puntuacion', 'resultado_final'],
          order: [['fecha', 'DESC']],
          limit: 10
        }),

        // Informes del usuario
        Informe.findAll({
          include: [{
            model: CV,
            as: 'cv',
            where: { alumnoId: userId },
            attributes: ['archivo']
          }],
          attributes: ['id', 'resumen', 'fecha_generacion'],
          order: [['fecha_generacion', 'DESC']],
          limit: 10
        }),

        // Estadísticas de entrevistas
        Entrevista.findAll({
          where: {
            alumnoId: userId,
            promedio_puntuacion: { [Op.not]: null }
          },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
            [sequelize.fn('AVG', sequelize.col('promedio_puntuacion')), 'promedio'],
            [sequelize.fn('MAX', sequelize.col('promedio_puntuacion')), 'maximo'],
            [sequelize.fn('MIN', sequelize.col('promedio_puntuacion')), 'minimo']
          ],
          raw: true
        }),

        // Distribución de resultados de entrevistas
        Entrevista.findAll({
          where: {
            alumnoId: userId,
            resultado_final: { [Op.not]: null }
          },
          attributes: [
            'resultado_final',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
          ],
          group: ['resultado_final'],
          raw: true
        }),

        // Últimas actividades (CVs y entrevistas combinadas)
        Promise.all([
          CV.findAll({
            where: { alumnoId: userId },
            attributes: ['id', 'archivo', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 5,
            raw: true
          }),
          Entrevista.findAll({
            where: { alumnoId: userId },
            attributes: ['id', 'fecha'],
            order: [['fecha', 'DESC']],
            limit: 5,
            raw: true
          })
        ])
      ]);

      // Procesar últimas actividades
      const actividades = [
        ...ultimasActividades[0].map(cv => ({
          tipo: 'cv',
          descripcion: `CV subido: ${cv.archivo}`,
          fecha: cv.createdAt
        })),
        ...ultimasActividades[1].map(ent => ({
          tipo: 'entrevista',
          descripcion: `Entrevista realizada`,
          fecha: ent.fecha
        }))
      ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);

      // Calcular tendencia de entrevistas (últimos 3 meses)
      const fechaTendencia = new Date();
      fechaTendencia.setMonth(fechaTendencia.getMonth() - 3);

      const entrevistasTendencia = await Entrevista.findAll({
        where: {
          alumnoId: userId,
          fecha: { [Op.gte]: fechaTendencia },
          promedio_puntuacion: { [Op.not]: null }
        },
        attributes: ['fecha', 'promedio_puntuacion'],
        order: [['fecha', 'ASC']],
        raw: true
      });

      logger.info("Métricas de usuario obtenidas por admin", {
        admin_id: req.user.id,
        user_id: userId
      });

      res.json({
        success: true,
        data: {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
            estado: usuario.estado,
            fecha_registro: usuario.createdAt,
            ultimo_acceso: usuario.fecha_ultimo_acceso
          },
          metricas: {
            resumen: {
              total_cvs: cvs.length,
              total_entrevistas: entrevistas.length,
              total_informes: informes.length,
              estadisticas_entrevistas: estadisticasEntrevistas[0] || null
            },
            cvs_recientes: cvs.map(cv => ({
              id: cv.id,
              archivo: cv.archivo,
              fecha: cv.fecha_creacion,
              procesado: !!cv.contenido_extraido
            })),
            entrevistas_recientes: entrevistas,
            informes_recientes: informes.map(inf => ({
              id: inf.id,
              resumen: inf.resumen,
              fecha: inf.fecha_generacion,
              cv_archivo: inf.cv?.archivo
            })),
            distribucion_resultados: distribucionResultados,
            tendencia_entrevistas: entrevistasTendencia,
            ultimas_actividades: actividades
          }
        }
      });

    } catch (error) {
      logger.error("Error obteniendo métricas de usuario", error, {
        admin_id: req.user?.id,
        user_id: req.params.userId
      });
      res.status(500).json({
        error: "Error obteniendo métricas del usuario",
        details: error.message
      });
    }
  }

  // 📊 Dashboard con estadísticas generales de todos los usuarios
  static async obtenerDashboardGeneral(req, res) {
    try {
      // Estadísticas generales
      const [
        totalUsuarios,
        totalCVs,
        totalEntrevistas,
        totalInformes,
        usuariosActivos,
        promedioGeneralEntrevistas,
        distribucionRoles,
        distribucionEstados
      ] = await Promise.all([
        // Total de usuarios
        Alumno.count(),

        // Total de CVs
        CV.count(),

        // Total de entrevistas
        Entrevista.count(),

        // Total de informes
        Informe.count(),

        // Usuarios activos (último acceso < 30 días)
        Alumno.count({
          where: {
            fecha_ultimo_acceso: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        // Promedio general de entrevistas
        Entrevista.findOne({
          where: {
            promedio_puntuacion: { [Op.not]: null }
          },
          attributes: [
            [sequelize.fn('AVG', sequelize.col('promedio_puntuacion')), 'promedio']
          ],
          raw: true
        }),

        // Distribución por roles
        Alumno.findAll({
          attributes: [
            'rol',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
          ],
          group: ['rol'],
          raw: true
        }),

        // Distribución por estados
        Alumno.findAll({
          attributes: [
            'estado',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
          ],
          group: ['estado'],
          raw: true
        })
      ]);

      // Registros por mes (últimos 6 meses)
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - 6);

      // Obtener datos mensuales de forma más compatible
      const [usuariosRaw, cvsRaw, entrevistasRaw] = await Promise.all([
        Alumno.findAll({
          where: {
            createdAt: { [Op.gte]: fechaInicio }
          },
          attributes: ['createdAt'],
          raw: true
        }),
        CV.findAll({
          where: {
            fecha_creacion: { [Op.gte]: fechaInicio }
          },
          attributes: ['fecha_creacion'],
          raw: true
        }),
        Entrevista.findAll({
          where: {
            fecha: { [Op.gte]: fechaInicio }
          },
          attributes: ['fecha'],
          raw: true
        })
      ]);

      // Agrupar por mes manualmente
      const agruparPorMes = (datos, campo) => {
        const grupos = {};
        datos.forEach(item => {
          const fecha = new Date(item[campo]);
          const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          grupos[mesKey] = (grupos[mesKey] || 0) + 1;
        });
        return Object.entries(grupos)
          .map(([mes, cantidad]) => ({ mes: mes + '-01', cantidad }))
          .sort((a, b) => a.mes.localeCompare(b.mes));
      };

      const usuariosPorMes = agruparPorMes(usuariosRaw, 'createdAt');
      const cvsPorMes = agruparPorMes(cvsRaw, 'fecha_creacion');
      const entrevistasPorMes = agruparPorMes(entrevistasRaw, 'fecha');

      // Top 10 usuarios más activos - método simplificado
      const todosLosUsuarios = await Alumno.findAll({
        attributes: ['id', 'nombre', 'correo'],
        raw: true
      });

      // Obtener conteos para cada usuario
      const usuariosConActividad = await Promise.all(
        todosLosUsuarios.map(async (usuario) => {
          const [totalCVs, totalEntrevistas] = await Promise.all([
            CV.count({ where: { alumnoId: usuario.id } }),
            Entrevista.count({ where: { alumnoId: usuario.id } })
          ]);
          return {
            ...usuario,
            total_cvs: totalCVs,
            total_entrevistas: totalEntrevistas,
            total_actividad: totalCVs + totalEntrevistas
          };
        })
      );

      // Ordenar y tomar top 10
      const usuariosActivos10 = usuariosConActividad
        .sort((a, b) => b.total_actividad - a.total_actividad)
        .slice(0, 10);

      // Distribución de resultados de entrevistas globales
      const distribucionResultadosGlobal = await Entrevista.findAll({
        where: {
          resultado_final: { [Op.not]: null }
        },
        attributes: [
          'resultado_final',
          [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
        ],
        group: ['resultado_final'],
        raw: true
      });

      logger.info("Dashboard general obtenido por admin", {
        admin_id: req.user.id
      });

      res.json({
        success: true,
        data: {
          resumen: {
            total_usuarios: totalUsuarios,
            usuarios_activos: usuariosActivos,
            total_cvs: totalCVs,
            total_entrevistas: totalEntrevistas,
            total_informes: totalInformes,
            promedio_entrevistas_global: promedioGeneralEntrevistas?.promedio ?
              parseFloat(promedioGeneralEntrevistas.promedio).toFixed(2) : null
          },
          distribucion: {
            por_roles: distribucionRoles,
            por_estados: distribucionEstados,
            resultados_entrevistas: distribucionResultadosGlobal
          },
          tendencias: {
            usuarios_por_mes: usuariosPorMes,
            cvs_por_mes: cvsPorMes,
            entrevistas_por_mes: entrevistasPorMes
          },
          top_usuarios: usuariosActivos10,
          periodo_analizado: {
            desde: fechaInicio.toISOString(),
            hasta: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      logger.error("Error obteniendo dashboard general", error, {
        admin_id: req.user?.id
      });
      res.status(500).json({
        error: "Error obteniendo dashboard general",
        details: error.message
      });
    }
  }

  // 🔧 Actualizar rol de un usuario
  static async actualizarRolUsuario(req, res) {
    try {
      const { userId } = req.params;
      const { rol } = req.body;

      if (!rol || !['alumno', 'administrador'].includes(rol)) {
        return res.status(400).json({
          error: "Rol inválido",
          message: "El rol debe ser 'alumno' o 'administrador'"
        });
      }

      const usuario = await Alumno.findByPk(userId);

      if (!usuario) {
        return res.status(404).json({
          error: "Usuario no encontrado"
        });
      }

      // Evitar que el admin se quite sus propios permisos
      if (usuario.id === req.user.id && rol === 'alumno') {
        return res.status(400).json({
          error: "No puede cambiar su propio rol",
          message: "No puede quitarse permisos de administrador a usted mismo"
        });
      }

      const rolAnterior = usuario.rol;
      usuario.rol = rol;
      await usuario.save();

      logger.info("Rol de usuario actualizado por admin", {
        admin_id: req.user.id,
        user_id: userId,
        rol_anterior: rolAnterior,
        rol_nuevo: rol
      });

      res.json({
        success: true,
        message: "Rol actualizado correctamente",
        data: {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
          }
        }
      });

    } catch (error) {
      logger.error("Error actualizando rol de usuario", error, {
        admin_id: req.user?.id,
        user_id: req.params.userId
      });
      res.status(500).json({
        error: "Error actualizando rol del usuario",
        details: error.message
      });
    }
  }

  // 🔧 Actualizar estado de un usuario
  static async actualizarEstadoUsuario(req, res) {
    try {
      const { userId } = req.params;
      const { estado } = req.body;

      if (!estado || !['activo', 'inactivo', 'suspendido'].includes(estado)) {
        return res.status(400).json({
          error: "Estado inválido",
          message: "El estado debe ser 'activo', 'inactivo' o 'suspendido'"
        });
      }

      const usuario = await Alumno.findByPk(userId);

      if (!usuario) {
        return res.status(404).json({
          error: "Usuario no encontrado"
        });
      }

      // Evitar que el admin se suspenda a sí mismo
      if (usuario.id === req.user.id && estado !== 'activo') {
        return res.status(400).json({
          error: "No puede cambiar su propio estado",
          message: "No puede suspender o inactivar su propia cuenta"
        });
      }

      const estadoAnterior = usuario.estado;
      usuario.estado = estado;
      await usuario.save();

      logger.info("Estado de usuario actualizado por admin", {
        admin_id: req.user.id,
        user_id: userId,
        estado_anterior: estadoAnterior,
        estado_nuevo: estado
      });

      res.json({
        success: true,
        message: "Estado actualizado correctamente",
        data: {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            estado: usuario.estado
          }
        }
      });

    } catch (error) {
      logger.error("Error actualizando estado de usuario", error, {
        admin_id: req.user?.id,
        user_id: req.params.userId
      });
      res.status(500).json({
        error: "Error actualizando estado del usuario",
        details: error.message
      });
    }
  }

}

module.exports = AdminController;
