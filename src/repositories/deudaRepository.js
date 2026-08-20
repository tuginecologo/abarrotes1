const pool = require('../config/database');

module.exports = {
  // Obtener deuda
  getDeudaCliente: async (id_cliente, conn = pool) => {
    const [rows] = await conn.query(
      'SELECT total_deuda FROM deuda_cliente WHERE id_cliente = ?',
      [id_cliente]
    );
    return rows[0] ? rows[0].total_deuda : 0;
  },

  listarDeudas: async () => {
    const [rows] = await pool.query(
      `SELECT c.id_cliente, c.nombres, c.apellidos, d.total_deuda
       FROM cliente c
       JOIN deuda_cliente d ON c.id_cliente = d.id_cliente
       WHERE d.total_deuda > 0
       ORDER BY c.apellidos, c.nombres`
    );
    return rows;
  },

  getPagosCliente: async (id_cliente) => {
    const [rows] = await pool.query(
      `SELECT id_pago, monto_pago, fecha_pago, observacion
       FROM pagos_cliente
       WHERE id_cliente = ?
       ORDER BY fecha_pago DESC`,
      [id_cliente]
    );
    return rows;
  },

  insertPago: async (id_cliente, monto, observacion, conn) => {
    const [result] = await conn.query(
      `INSERT INTO pagos_cliente (id_cliente, monto_pago, fecha_pago, observacion)
       VALUES (?, ?, ?, ?)`,
      [id_cliente, monto, new Date(), observacion]
    );
    return result.insertId;
  },

  reducirDeuda: async (id_cliente, monto, conn) => {
    await conn.query(
      `UPDATE deuda_cliente 
       SET total_deuda = total_deuda - ? 
       WHERE id_cliente = ?`,
      [monto, id_cliente]
    );
  },

  // ---- NUEVOS MÉTODOS PARA REVERTIR ----
  getPagoById: async (id_pago, conn = pool) => {
    const [rows] = await conn.query(
      'SELECT id_pago, id_cliente, monto_pago FROM pagos_cliente WHERE id_pago = ?',
      [id_pago]
    );
    return rows[0];
  },

  eliminarPago: async (id_pago, conn) => {
    await conn.query('DELETE FROM pagos_cliente WHERE id_pago = ?', [id_pago]);
  },

  aumentarDeuda: async (id_cliente, monto, conn) => {
    await conn.query(
      'UPDATE deuda_cliente SET total_deuda = total_deuda + ? WHERE id_cliente = ?',
      [monto, id_cliente]
    );
  }
}