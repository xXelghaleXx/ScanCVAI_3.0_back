// src/shared/services/excel-export.service.js
const XLSX = require('xlsx');

class ExcelExportService {
  /**
   * Exportar usuarios a Excel
   */
  exportarUsuarios(usuarios) {
    const data = usuarios.map(usuario => ({
      'ID': usuario.id,
      'Nombre': usuario.nombre,
      'Correo': usuario.correo,
      'Rol': usuario.rol,
      'Estado': usuario.estado,
      'Fecha Registro': usuario.createdAt ? new Date(usuario.createdAt).toLocaleDateString('es-PE') : '',
      'Último Acceso': usuario.fecha_ultimo_acceso ? new Date(usuario.fecha_ultimo_acceso).toLocaleDateString('es-PE') : 'Nunca',
      'CVs Subidos': usuario.total_cvs || 0,
      'Entrevistas': usuario.total_entrevistas || 0,
      'Informes': usuario.total_informes || 0
    }));

    return this.crearExcel(data, 'Usuarios');
  }

  /**
   * Exportar CVs a Excel
   */
  exportarCVs(cvs) {
    const data = cvs.map(cv => ({
      'ID': cv.id,
      'Alumno': cv.alumno?.nombre || 'N/A',
      'Correo': cv.alumno?.correo || 'N/A',
      'Nombre Archivo': cv.nombre_archivo,
      'Fecha Subida': cv.createdAt ? new Date(cv.createdAt).toLocaleDateString('es-PE') : '',
      'Procesado': cv.contenido_extraido ? 'Sí' : 'No',
      'Puntuación': cv.scoring_data?.puntuacion_final || 'N/A',
      'Nivel CV': cv.scoring_data?.nivel_cv || 'N/A',
      'Puntos Rúbrica': cv.rubrica_evaluation?.puntuacion_total || 'N/A',
      'Nivel Desempeño': cv.rubrica_evaluation?.nivel_desempeno || 'N/A',
      'Tiene Informe': cv.informes?.length > 0 ? 'Sí' : 'No'
    }));

    return this.crearExcel(data, 'CVs');
  }

  /**
   * Exportar entrevistas a Excel
   */
  exportarEntrevistas(entrevistas) {
    const data = entrevistas.map(entrevista => ({
      'ID': entrevista.id,
      'Alumno': entrevista.alumno?.nombre || 'N/A',
      'Correo': entrevista.alumno?.correo || 'N/A',
      'Carrera': entrevista.carrera_id || 'N/A',
      'Dificultad': entrevista.dificultad || 'N/A',
      'Modalidad': entrevista.modalidad || 'N/A',
      'Estado': entrevista.estado,
      'Fecha Inicio': entrevista.createdAt ? new Date(entrevista.createdAt).toLocaleDateString('es-PE') : '',
      'Fecha Fin': entrevista.fecha_fin ? new Date(entrevista.fecha_fin).toLocaleDateString('es-PE') : 'En curso',
      'Puntuación': entrevista.puntuacion_final || 'N/A',
      'Nivel': entrevista.nivel_entrevista || 'N/A',
      'Respuestas': entrevista.respuestas?.length || 0
    }));

    return this.crearExcel(data, 'Entrevistas');
  }

  /**
   * Exportar informes a Excel
   */
  exportarInformes(informes) {
    const data = informes.map(informe => ({
      'ID': informe.id,
      'Alumno': informe.cv?.alumno?.nombre || 'N/A',
      'Correo': informe.cv?.alumno?.correo || 'N/A',
      'CV': informe.cv?.nombre_archivo || 'N/A',
      'Fecha Generación': informe.fecha_generacion ? new Date(informe.fecha_generacion).toLocaleDateString('es-PE') : '',
      'Resumen': informe.resumen ? informe.resumen.substring(0, 100) + '...' : 'N/A',
      'Fortalezas': informe.fortalezas?.length || 0,
      'Habilidades': informe.habilidades?.length || 0,
      'Áreas de Mejora': informe.areas_mejora?.length || 0
    }));

    return this.crearExcel(data, 'Informes');
  }

  /**
   * Exportar estadísticas generales a Excel
   */
  exportarEstadisticasGenerales(stats) {
    // Crear libro con múltiples hojas
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Resumen General
    const resumenData = [
      ['Métrica', 'Valor'],
      ['Total Usuarios', stats.totalUsuarios || 0],
      ['Usuarios Activos', stats.usuariosActivos || 0],
      ['Total CVs', stats.totalCVs || 0],
      ['CVs Procesados', stats.cvsProcessed || 0],
      ['Total Entrevistas', stats.totalEntrevistas || 0],
      ['Entrevistas Finalizadas', stats.entrevistasFinalizadas || 0],
      ['Total Informes', stats.totalInformes || 0],
      ['Promedio Puntuación CVs', stats.promedioPuntuacionCVs?.toFixed(2) || 'N/A'],
      ['Promedio Puntuación Entrevistas', stats.promedioPuntuacionEntrevistas?.toFixed(2) || 'N/A']
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    // Hoja 2: Top Usuarios (si existe)
    if (stats.topUsuarios && stats.topUsuarios.length > 0) {
      const topUsuariosData = stats.topUsuarios.map(u => ({
        'Nombre': u.nombre,
        'Correo': u.correo,
        'CVs': u.total_cvs || 0,
        'Entrevistas': u.total_entrevistas || 0,
        'Informes': u.total_informes || 0
      }));
      const wsTopUsuarios = XLSX.utils.json_to_sheet(topUsuariosData);
      XLSX.utils.book_append_sheet(workbook, wsTopUsuarios, 'Top Usuarios');
    }

    // Convertir a buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Método genérico para crear Excel desde datos
   */
  crearExcel(data, sheetName = 'Datos') {
    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Crear hoja de trabajo desde JSON
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas automáticamente
    const maxWidth = 50;
    const colWidths = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;

        const cellValue = worksheet[cellAddress].v;
        if (cellValue) {
          const len = cellValue.toString().length;
          if (len > maxLen) maxLen = len;
        }
      }
      colWidths.push({ wch: Math.min(maxLen + 2, maxWidth) });
    }
    worksheet['!cols'] = colWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Convertir a buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
  }

  /**
   * Generar nombre de archivo con timestamp
   */
  generarNombreArchivo(base) {
    const fecha = new Date();
    const timestamp = fecha.toISOString().split('T')[0].replace(/-/g, '');
    return `${base}_${timestamp}.xlsx`;
  }
}

module.exports = new ExcelExportService();
