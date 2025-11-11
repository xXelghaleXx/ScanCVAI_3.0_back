const {
  Alumno,
  CV,
  Informe,
  Entrevista,
  RespuestaEntrevista,
  HistorialEntrevista
} = require("../../database/models");
const { Op } = require('sequelize');
const sequelize = require("../../config/database.config");
const logger = require("../../shared/services/logger.service");
const utilsService = require("../../shared/services/utils.service");
const excelExportService = require("../../shared/services/excel-export.service");

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

        // Informes del usuario - Primero obtenemos los CVs del usuario
        (async () => {
          const userCVs = await CV.findAll({
            where: { alumnoId: userId },
            attributes: ['id'],
            raw: true
          });
          const cvIds = userCVs.map(cv => cv.id);

          if (cvIds.length === 0) return [];

          return await Informe.findAll({
            where: { cvId: { [Op.in]: cvIds } },
            include: [{
              model: CV,
              as: 'cv',
              attributes: ['archivo']
            }],
            attributes: ['id', 'resumen', 'fecha_generacion'],
            order: [['fecha_generacion', 'DESC']],
            limit: 10
          });
        })(),

        // Estadísticas de entrevistas
        (async () => {
          const stats = await Entrevista.findAll({
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
          });
          // Si no hay resultados o el total es 0, devolver null
          return (stats[0] && stats[0].total > 0) ? stats : [null];
        })(),

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
            attributes: ['id', 'archivo', 'fecha_creacion'],
            order: [['fecha_creacion', 'DESC']],
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
          fecha: cv.fecha_creacion
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
      // Estadísticas generales - OPTIMIZADO: Hacer consultas en lotes pequeños
      // para no saturar el pool de conexiones de Clever Cloud (max 2-3 conexiones)

      // Bloque 1: Conteos básicos (max 2 conexiones simultáneas)
      const [totalUsuarios, totalCVs] = await Promise.all([
        Alumno.count(),
        CV.count()
      ]);

      // Bloque 2: Más conteos
      const [totalEntrevistas, totalInformes] = await Promise.all([
        Entrevista.count(),
        Informe.count()
      ]);

      // Bloque 3: Usuarios activos y promedio
      const [usuariosActivos, promedioGeneralEntrevistas] = await Promise.all([
        Alumno.count({
          where: {
            fecha_ultimo_acceso: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        Entrevista.findOne({
          where: {
            promedio_puntuacion: { [Op.not]: null }
          },
          attributes: [
            [sequelize.fn('AVG', sequelize.col('promedio_puntuacion')), 'promedio']
          ],
          raw: true
        })
      ]);

      // Bloque 4: Distribuciones
      const [distribucionRoles, distribucionEstados] = await Promise.all([
        Alumno.findAll({
          attributes: [
            'rol',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
          ],
          group: ['rol'],
          raw: true
        }),
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

      // Obtener datos mensuales - OPTIMIZADO: En lotes de 2 consultas
      const [usuariosRaw, cvsRaw] = await Promise.all([
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
        })
      ]);

      // Consulta separada para no saturar el pool
      const entrevistasRaw = await Entrevista.findAll({
        where: {
          fecha: { [Op.gte]: fechaInicio }
        },
        attributes: ['fecha'],
        raw: true
      });

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

      // Métricas adicionales
      const [
        usuariosSuspendidos,
        usuariosInactivos,
        entrevistasHoy,
        cvsHoy,
        tasaConversionCV
      ] = await Promise.all([
        Alumno.count({ where: { estado: 'suspendido' } }),
        Alumno.count({ where: { estado: 'inactivo' } }),
        Entrevista.count({
          where: {
            fecha: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        CV.count({
          where: {
            fecha_creacion: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        // Tasa de conversión: usuarios que tienen al menos 1 CV / total usuarios
        (async () => {
          const usuariosConCV = await CV.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('alumnoId')), 'alumnoId']],
            raw: true
          });
          const totalConCV = usuariosConCV.length;
          return totalUsuarios > 0 ? ((totalConCV / totalUsuarios) * 100).toFixed(2) : 0;
        })()
      ]);

      // Promedio de CVs por usuario activo
      const promedioCVsPorUsuario = usuariosActivos > 0 ?
        (totalCVs / usuariosActivos).toFixed(2) : 0;

      // Promedio de entrevistas por usuario activo
      const promedioEntrevistasPorUsuario = usuariosActivos > 0 ?
        (totalEntrevistas / usuariosActivos).toFixed(2) : 0;

      logger.info("Dashboard general obtenido por admin", {
        admin_id: req.user.id
      });

      res.json({
        success: true,
        data: {
          resumen: {
            total_usuarios: totalUsuarios,
            usuarios_activos: usuariosActivos,
            usuarios_suspendidos: usuariosSuspendidos,
            usuarios_inactivos: usuariosInactivos,
            total_cvs: totalCVs,
            total_entrevistas: totalEntrevistas,
            total_informes: totalInformes,
            promedio_entrevistas_global: promedioGeneralEntrevistas?.promedio ?
              parseFloat(promedioGeneralEntrevistas.promedio).toFixed(2) : null,
            // Métricas adicionales
            actividad_hoy: {
              cvs: cvsHoy,
              entrevistas: entrevistasHoy
            },
            promedios: {
              cvs_por_usuario: promedioCVsPorUsuario,
              entrevistas_por_usuario: promedioEntrevistasPorUsuario
            },
            tasas: {
              conversion_cv: tasaConversionCV,
              actividad: usuariosActivos > 0 ?
                ((usuariosActivos / totalUsuarios) * 100).toFixed(2) : 0
            }
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

  // 🗑️ Eliminar usuario y todos sus datos relacionados
  static async eliminarUsuario(req, res) {
    try {
      const { userId } = req.params;

      const usuario = await Alumno.findByPk(userId);

      if (!usuario) {
        return res.status(404).json({
          error: "Usuario no encontrado"
        });
      }

      // Evitar que el admin se elimine a sí mismo
      if (usuario.id === req.user.id) {
        return res.status(400).json({
          error: "No puede eliminarse a sí mismo",
          message: "No puede eliminar su propia cuenta de administrador"
        });
      }

      // Guardar información para el log antes de eliminar
      const usuarioInfo = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      };

      // Obtener todos los CVs del usuario para eliminar datos relacionados
      const cvs = await CV.findAll({
        where: { alumnoId: userId },
        attributes: ['id']
      });

      const cvIds = cvs.map(cv => cv.id);

      // Usar transacción para asegurar integridad de datos
      await sequelize.transaction(async (t) => {
        // Eliminar informes relacionados con los CVs del usuario
        if (cvIds.length > 0) {
          await Informe.destroy({
            where: { cvId: { [Op.in]: cvIds } },
            transaction: t
          });
        }

        // Eliminar respuestas de entrevistas del usuario
        await RespuestaEntrevista.destroy({
          where: {
            entrevistaId: {
              [Op.in]: sequelize.literal(`(
                SELECT id FROM entrevistas WHERE "alumnoId" = ${userId}
              )`)
            }
          },
          transaction: t
        });

        // Eliminar historial de entrevistas del usuario
        await HistorialEntrevista.destroy({
          where: { alumnoId: userId },
          transaction: t
        });

        // Eliminar entrevistas del usuario
        await Entrevista.destroy({
          where: { alumnoId: userId },
          transaction: t
        });

        // Eliminar CVs del usuario
        await CV.destroy({
          where: { alumnoId: userId },
          transaction: t
        });

        // Finalmente, eliminar el usuario
        await usuario.destroy({ transaction: t });
      });

      logger.info("Usuario eliminado por admin", {
        admin_id: req.user.id,
        usuario_eliminado: usuarioInfo
      });

      res.json({
        success: true,
        message: "Usuario eliminado correctamente",
        data: {
          usuario_eliminado: usuarioInfo
        }
      });

    } catch (error) {
      logger.error("Error eliminando usuario", error, {
        admin_id: req.user?.id,
        user_id: req.params.userId
      });
      res.status(500).json({
        error: "Error eliminando usuario",
        details: error.message
      });
    }
  }

  // 📥 EXPORTACIONES A EXCEL

  /**
   * Exportar todos los usuarios a Excel
   */
  static async exportarUsuarios(req, res) {
    try {
      logger.info('Exportando usuarios a Excel', {
        adminId: req.user.id
      });

      // Obtener todos los usuarios con sus métricas
      const usuarios = await Alumno.findAll({
        attributes: [
          'id',
          'nombre',
          'correo',
          'rol',
          'estado',
          'createdAt',
          'fecha_ultimo_acceso'
        ],
        order: [['createdAt', 'DESC']]
      });

      // Enriquecer con métricas
      const usuariosConMetricas = await Promise.all(
        usuarios.map(async (usuario) => {
          const [totalCVs, totalEntrevistas, totalInformes] = await Promise.all([
            CV.count({ where: { alumnoId: usuario.id } }),
            Entrevista.count({ where: { alumnoId: usuario.id } }),
            Informe.count({
              include: [{ model: CV, as: 'cv', where: { alumnoId: usuario.id } }]
            })
          ]);

          return {
            ...usuario.toJSON(),
            total_cvs: totalCVs,
            total_entrevistas: totalEntrevistas,
            total_informes: totalInformes
          };
        })
      );

      // Generar Excel
      const buffer = excelExportService.exportarUsuarios(usuariosConMetricas);
      const filename = excelExportService.generarNombreArchivo('usuarios_tecsup');

      // Enviar archivo
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('Usuarios exportados exitosamente', {
        adminId: req.user.id,
        totalUsuarios: usuariosConMetricas.length
      });

    } catch (error) {
      logger.error('Error exportando usuarios', error, {
        adminId: req.user.id
      });
      res.status(500).json({
        error: 'Error al exportar usuarios',
        details: error.message
      });
    }
  }

  /**
   * Exportar todos los CVs a Excel
   */
  static async exportarCVs(req, res) {
    try {
      logger.info('Exportando CVs a Excel', {
        adminId: req.user.id
      });

      const cvs = await CV.findAll({
        include: [
          {
            model: Alumno,
            as: 'alumno',
            attributes: ['nombre', 'correo']
          },
          {
            model: Informe,
            as: 'informes',
            attributes: ['id']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const buffer = excelExportService.exportarCVs(cvs);
      const filename = excelExportService.generarNombreArchivo('cvs_tecsup');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('CVs exportados exitosamente', {
        adminId: req.user.id,
        totalCVs: cvs.length
      });

    } catch (error) {
      logger.error('Error exportando CVs', error, {
        adminId: req.user.id
      });
      res.status(500).json({
        error: 'Error al exportar CVs',
        details: error.message
      });
    }
  }

  /**
   * Exportar todas las entrevistas a Excel
   */
  static async exportarEntrevistas(req, res) {
    try {
      logger.info('Exportando entrevistas a Excel', {
        adminId: req.user.id
      });

      const entrevistas = await Entrevista.findAll({
        include: [
          {
            model: Alumno,
            as: 'alumno',
            attributes: ['nombre', 'correo']
          },
          {
            model: RespuestaEntrevista,
            as: 'respuestas',
            attributes: ['id']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const buffer = excelExportService.exportarEntrevistas(entrevistas);
      const filename = excelExportService.generarNombreArchivo('entrevistas_tecsup');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('Entrevistas exportadas exitosamente', {
        adminId: req.user.id,
        totalEntrevistas: entrevistas.length
      });

    } catch (error) {
      logger.error('Error exportando entrevistas', error, {
        adminId: req.user.id
      });
      res.status(500).json({
        error: 'Error al exportar entrevistas',
        details: error.message
      });
    }
  }

  /**
   * Exportar todos los informes a Excel
   */
  static async exportarInformes(req, res) {
    try {
      logger.info('Exportando informes a Excel', {
        adminId: req.user.id
      });

      const informes = await Informe.findAll({
        include: [
          {
            model: CV,
            as: 'cv',
            attributes: ['nombre_archivo', 'alumnoId'],
            include: [
              {
                model: Alumno,
                as: 'alumno',
                attributes: ['nombre', 'correo']
              }
            ]
          }
        ],
        order: [['fecha_generacion', 'DESC']]
      });

      const buffer = excelExportService.exportarInformes(informes);
      const filename = excelExportService.generarNombreArchivo('informes_tecsup');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('Informes exportados exitosamente', {
        adminId: req.user.id,
        totalInformes: informes.length
      });

    } catch (error) {
      logger.error('Error exportando informes', error, {
        adminId: req.user.id
      });
      res.status(500).json({
        error: 'Error al exportar informes',
        details: error.message
      });
    }
  }

  /**
   * Exportar estadísticas generales a Excel
   */
  static async exportarEstadisticas(req, res) {
    try {
      logger.info('Exportando estadísticas generales a Excel', {
        adminId: req.user.id
      });

      // Obtener estadísticas
      const [
        totalUsuarios,
        usuariosActivos,
        totalCVs,
        cvsProcessed,
        totalEntrevistas,
        entrevistasFinalizadas,
        totalInformes
      ] = await Promise.all([
        Alumno.count(),
        Alumno.count({ where: { estado: 'activo' } }),
        CV.count(),
        CV.count({ where: { contenido_extraido: { [Op.not]: null } } }),
        Entrevista.count(),
        Entrevista.count({ where: { estado: 'finalizada' } }),
        Informe.count()
      ]);

      // Promedios
      const cvsConScoring = await CV.findAll({
        attributes: ['scoring_data'],
        where: { scoring_data: { [Op.not]: null } }
      });

      const promedioPuntuacionCVs = cvsConScoring.length > 0
        ? cvsConScoring.reduce((acc, cv) => acc + (cv.scoring_data?.puntuacion_final || 0), 0) / cvsConScoring.length
        : 0;

      const entrevistasConPuntuacion = await Entrevista.findAll({
        attributes: ['puntuacion_final'],
        where: { puntuacion_final: { [Op.not]: null } }
      });

      const promedioPuntuacionEntrevistas = entrevistasConPuntuacion.length > 0
        ? entrevistasConPuntuacion.reduce((acc, e) => acc + (e.puntuacion_final || 0), 0) / entrevistasConPuntuacion.length
        : 0;

      // Top usuarios
      const topUsuarios = await Alumno.findAll({
        attributes: ['id', 'nombre', 'correo'],
        limit: 10,
        order: [['createdAt', 'DESC']]
      });

      const topUsuariosConMetricas = await Promise.all(
        topUsuarios.map(async (usuario) => {
          const [total_cvs, total_entrevistas, total_informes] = await Promise.all([
            CV.count({ where: { alumnoId: usuario.id } }),
            Entrevista.count({ where: { alumnoId: usuario.id } }),
            Informe.count({
              include: [{ model: CV, as: 'cv', where: { alumnoId: usuario.id } }]
            })
          ]);

          return {
            ...usuario.toJSON(),
            total_cvs,
            total_entrevistas,
            total_informes
          };
        })
      );

      const stats = {
        totalUsuarios,
        usuariosActivos,
        totalCVs,
        cvsProcessed,
        totalEntrevistas,
        entrevistasFinalizadas,
        totalInformes,
        promedioPuntuacionCVs,
        promedioPuntuacionEntrevistas,
        topUsuarios: topUsuariosConMetricas
      };

      const buffer = excelExportService.exportarEstadisticasGenerales(stats);
      const filename = excelExportService.generarNombreArchivo('estadisticas_tecsup');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('Estadísticas exportadas exitosamente', {
        adminId: req.user.id
      });

    } catch (error) {
      logger.error('Error exportando estadísticas', error, {
        adminId: req.user.id
      });
      res.status(500).json({
        error: 'Error al exportar estadísticas',
        details: error.message
      });
    }
  }

}

module.exports = AdminController;
