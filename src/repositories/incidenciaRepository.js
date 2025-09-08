const pool = require('../config/database');

module.exports = {
  // Get all incidents with pagination and search
  getIncidencias: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        i.*, 
        CONCAT(e.nombres, ' ', e.apellidos) as empleado,
        (SELECT COUNT(*) FROM detalle_incidencia WHERE id_incidencia = i.id_incidencia) as items_count
      FROM incidencias i
      JOIN empleado e ON i.dnivend = e.dni
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM incidencias i JOIN empleado e ON i.dnivend = e.dni';
    
    // Add search conditions if search query is provided
    if (search) {
      const searchCondition = `
        WHERE i.tipo LIKE ? OR i.descripcion LIKE ? OR e.nombres LIKE ? OR e.apellidos LIKE ?
      `;
      query += searchCondition;
      countQuery += searchCondition;
    }
    
    query += ` ORDER BY i.fecha DESC, i.id_incidencia DESC LIMIT ? OFFSET ?`;
    
    const searchPattern = `%${search}%`;
    let queryParams, countParams;
    
    if (search) {
      queryParams = [searchPattern, searchPattern, searchPattern, searchPattern, limit, offset];
      countParams = [searchPattern, searchPattern, searchPattern, searchPattern];
    } else {
      queryParams = [limit, offset];
      countParams = [];
    }
    
    const [rows] = await pool.query(query, queryParams);
    const [count] = await pool.query(countQuery, countParams);
    
    return { 
      incidencias: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  // Get incident by ID
  getIncidenciaById: async (id) => {
    const [incidencia] = await pool.query(
      `SELECT 
         i.*, 
         CONCAT(e.nombres, ' ', e.apellidos) as empleado
       FROM incidencias i
       JOIN empleado e ON i.dnivend = e.dni
       WHERE i.id_incidencia = ?`,
      [id]
    );

    if (!incidencia || incidencia.length === 0) {
      return null;
    }

    const [detalles] = await pool.query(
      `SELECT 
         di.*,
         p.id_producto,
         p.nombre as producto_nombre,
         p.marca,
         p.variante,
         p.descripcion
       FROM detalle_incidencia di
       JOIN producto p ON di.id_producto = p.id_producto
       WHERE di.id_incidencia = ?`,
      [id]
    );

    return {
      ...incidencia[0],
      detalles
    };
  },

  // Create new incident
  createIncidencia: async (incidenciaData, connection = null) => {
    const conn = connection || await pool.getConnection();
    let shouldRelease = !connection;

    try {
      if (!connection) await conn.beginTransaction();

      // First, verify the employee exists
      const [empleado] = await conn.query(
        'SELECT dni FROM empleado WHERE dni = ?',
        [incidenciaData.dnivend]
      );

      if (!empleado || empleado.length === 0) {
        throw new Error(`Empleado con DNI ${incidenciaData.dnivend} no existe`);
      }

      // Insert incident
      const [result] = await conn.query(
        `INSERT INTO incidencias (fecha, tipo, descripcion, dnivend)
         VALUES (?, ?, ?, ?)`,
        [incidenciaData.fecha, incidenciaData.tipo, incidenciaData.descripcion, incidenciaData.dnivend]
      );

      const id_incidencia = result.insertId;

      // Insert incident details
      for (const detalle of incidenciaData.detalles) {
        await conn.query(
          `INSERT INTO detalle_incidencia (id_incidencia, id_producto, cantidad)
           VALUES (?, ?, ?)`,
          [id_incidencia, detalle.id_producto, detalle.cantidad]
        );
      }

      if (!connection) await conn.commit();
      return id_incidencia;
    } catch (err) {
      if (!connection) await conn.rollback();
      throw err;
    } finally {
      if (shouldRelease) conn.release();
    }
  },

  // Update incident
  updateIncidencia: async (id, incidenciaData) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete original details
      await connection.query(
        'DELETE FROM detalle_incidencia WHERE id_incidencia = ?',
        [id]
      );

      // Update incident
      await connection.query(
        `UPDATE incidencias 
         SET fecha = ?, tipo = ?, descripcion = ?, dnivend = ?
         WHERE id_incidencia = ?`,
        [incidenciaData.fecha, incidenciaData.tipo, incidenciaData.descripcion, incidenciaData.dnivend, id]
      );

      // Insert new details
      for (const detalle of incidenciaData.detalles) {
        await connection.query(
          `INSERT INTO detalle_incidencia (id_incidencia, id_producto, cantidad)
           VALUES (?, ?, ?)`,
          [id, detalle.id_producto, detalle.cantidad]
        );
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Delete incident
  deleteIncidencia: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete details
      await connection.query(
        'DELETE FROM detalle_incidencia WHERE id_incidencia = ?',
        [id]
      );

      // Delete incident
      await connection.query(
        'DELETE FROM incidencias WHERE id_incidencia = ?',
        [id]
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Get all incidencias for Excel export
  getAllIncidencias: async () => {
    const [incidencias] = await pool.query(
      `SELECT 
         i.*, 
         CONCAT(e.nombres, ' ', e.apellidos) as empleado,
         (SELECT COUNT(*) FROM detalle_incidencia WHERE id_incidencia = i.id_incidencia) as items_count
       FROM incidencias i
       JOIN empleado e ON i.dnivend = e.dni
       ORDER BY i.fecha DESC, i.id_incidencia DESC`
    );

    // Get details for each incident
    for (const incidencia of incidencias) {
      const [detalles] = await pool.query(
        `SELECT 
           di.*,
           p.nombre as producto_nombre,
           p.marca,
           p.variante,
           p.descripcion
         FROM detalle_incidencia di
         JOIN producto p ON di.id_producto = p.id_producto
         WHERE di.id_incidencia = ?`,
        [incidencia.id_incidencia]
      );
      incidencia.detalles = detalles;
    }

    return incidencias;
  }
};