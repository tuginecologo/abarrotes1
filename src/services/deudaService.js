const deudaRepository = require('../repositories/deudaRepository');
const pool = require('../config/database');

module.exports = {
  getDeudaCliente: async (id_cliente) => {
    const result = await deudaRepository.getDeudaCliente(id_cliente);
    return Number(result) || 0;
  },

  listarDeudas: async () => {
    const deudas = await deudaRepository.listarDeudas();
    return deudas.map(d => ({
      ...d,
      total_deuda: Number(d.total_deuda) || 0
    }));
  },

  getPagosCliente: async (id_cliente) => {
    const pagos = await deudaRepository.getPagosCliente(id_cliente);
    return pagos.map(p => ({
      ...p,
      monto_pago: Number(p.monto_pago) || 0,
      fecha_pago: new Date(p.fecha_pago) // Aseguramos que sea objeto Date
    }));
  },

  registrarPago: async (id_cliente, monto, observacion) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await deudaRepository.insertPago(id_cliente, monto, observacion, connection);
      await deudaRepository.reducirDeuda(id_cliente, monto, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // NUEVO: Revertir un pago
// En deudaService.js - método revertirPago
revertirPago: async (id_pago) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Obtener el pago
    const pago = await deudaRepository.getPagoById(id_pago, connection);
    if (!pago) {
      throw new Error('Pago no encontrado');
    }
    // Guardar id_cliente antes de eliminar
    const id_cliente = pago.id_cliente;
    // Eliminar el registro de pago
    await deudaRepository.eliminarPago(id_pago, connection);
    // Restaurar la deuda (sumar el monto)
    await deudaRepository.aumentarDeuda(id_cliente, pago.monto_pago, connection);
    await connection.commit();
    return id_cliente; // <--- Retorna el id del cliente
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
};