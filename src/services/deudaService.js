const deudaRepository = require('../repositories/deudaRepository');
const pool = require('../config/database');

module.exports = {
  getDeudaCliente: async (id_cliente) => {
    return await deudaRepository.getDeudaCliente(id_cliente);
  },
  listarDeudas: async () => {
    return await deudaRepository.listarDeudas();
  },
  getPagosCliente: async (id_cliente) => {
    return await deudaRepository.getPagosCliente(id_cliente);
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