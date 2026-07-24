const deudaRepository = require('../repositories/deudaRepository');
const pool = require('../config/database');

module.exports = {
  getDeudaCliente: async (id_cliente) => {
    const result = await deudaRepository.getDeudaCliente(id_cliente);
    return Number(result) || 0;  // <--- CONVERTIR A NÚMERO
  },

  listarDeudas: async () => {
    const deudas = await deudaRepository.listarDeudas();
    // Convertir total_deuda a número para cada registro
    return deudas.map(d => ({
      ...d,
      total_deuda: Number(d.total_deuda) || 0
    }));
  },

  getPagosCliente: async (id_cliente) => {
    const pagos = await deudaRepository.getPagosCliente(id_cliente);
    // Convertir monto_pago a número para cada pago
    return pagos.map(p => ({
      ...p,
      monto_pago: Number(p.monto_pago) || 0
    }));
  },



  registrarPago: async (id_cliente, monto, observacion, id_venta = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await deudaRepository.insertPago(id_cliente, monto, observacion, id_venta, connection);
      await deudaRepository.reducirDeuda(id_cliente, monto, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};