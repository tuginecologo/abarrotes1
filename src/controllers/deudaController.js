const deudaService = require('../services/deudaService');
const clienteService = require('../services/clienteService');

module.exports = {
  // Listar todos los clientes con deuda > 0
  listarDeudas: async (req, res, next) => {
    try {
      const deudas = await deudaService.listarDeudas();
      res.render('deudas/list', { deudas });
    } catch (err) {
      next(err);
    }
  },

  // Ver detalle de deuda de un cliente (incluye pagos realizados)
  verDeuda: async (req, res, next) => {
    try {
      const id_cliente = req.params.id;
      const cliente = await clienteService.getClienteById(id_cliente);
      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/deudas');
      }
      const deuda = await deudaService.getDeudaCliente(id_cliente);
      const pagos = await deudaService.getPagosCliente(id_cliente);
      res.render('deudas/detail', { cliente, deuda, pagos });
    } catch (err) {
      next(err);
    }
  },

  // Mostrar formulario para registrar un pago
  showPagoForm: async (req, res, next) => {
    try {
      const id_cliente = req.params.id;
      const cliente = await clienteService.getClienteById(id_cliente);
      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/deudas');
      }
      const deuda = await deudaService.getDeudaCliente(id_cliente);
      if (deuda <= 0) {
        req.flash('info', 'Este cliente no tiene deuda pendiente');
        return res.redirect(`/deudas/cliente/${id_cliente}`);
      }
      res.render('deudas/pagar', { cliente, deuda });
    } catch (err) {
      next(err);
    }
  },

  // Registrar un pago
  registrarPago: async (req, res, next) => {
    try {
      const { id_cliente, monto, observacion, id_venta } = req.body;
      if (!id_cliente || !monto || monto <= 0) {
        req.flash('error', 'Datos de pago inválidos');
        return res.redirect(`/deudas/pagar/${id_cliente}`);
      }
      await deudaService.registrarPago(id_cliente, monto, observacion, id_venta || null);
      req.flash('success', 'Pago registrado correctamente');
      res.redirect(`/deudas/cliente/${id_cliente}`);
    } catch (err) {
      console.error('Error registrando pago:', err);
      req.flash('error', err.message || 'Error al registrar el pago');
      res.redirect(`/deudas/pagar/${req.body.id_cliente}`);
    }
  }
};