const deudaService = require('../services/deudaService');
const clienteService = require('../services/clienteService');

module.exports = {
  listarDeudas: async (req, res, next) => {
    try {
      const deudas = await deudaService.listarDeudas();
      res.render('deudas/list', { deudas });
    } catch (err) {
      next(err);
    }
  },

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

  registrarPago: async (req, res, next) => {
    try {
      const { id_cliente, monto, observacion } = req.body;
      if (!id_cliente || !monto || monto <= 0) {
        req.flash('error', 'Datos de pago inválidos');
        return res.redirect(`/deudas/pagar/${id_cliente}`);
      }
      await deudaService.registrarPago(id_cliente, monto, observacion);
      req.flash('success', 'Pago registrado correctamente');
      res.redirect(`/deudas/cliente/${id_cliente}`);
    } catch (err) {
      console.error('Error registrando pago:', err);
      req.flash('error', err.message || 'Error al registrar el pago');
      res.redirect(`/deudas/pagar/${req.body.id_cliente}`);
    }
  },

  // NUEVO: Revertir un pago
  revertirPago: async (req, res, next) => {
    try {
      const id_pago = req.params.id_pago;
      await deudaService.revertirPago(id_pago);
      req.flash('success', 'Pago revertido correctamente');
      res.redirect('back');
    } catch (err) {
      console.error('Error revirtiendo pago:', err);
      req.flash('error', err.message || 'Error al revertir el pago');
      res.redirect('back');
    }
  }
};