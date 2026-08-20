const clienteService = require('../services/clienteService');
const dateFormatter = require('../helpers/dateFormatter');

module.exports = {
  listClientes: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await clienteService.getClientes(parseInt(page), parseInt(limit), q);
      res.render('clientes/list', {
        clientes: result.clientes,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        dateFormatter
      });
    } catch (err) { next(err); }
  },

  showNewForm: (req, res) => {
    res.render('clientes/new');
  },

  createCliente: async (req, res, next) => {
    try {
      await clienteService.createCliente(req.body);
      res.redirect('/clientes');
    } catch (err) { next(err); }
  },

  showEditForm: async (req, res, next) => {
    try {
      const cliente = await clienteService.getClienteById(req.params.id);
      if (!cliente) throw new Error('Cliente no encontrado');
      res.render('clientes/edit', { cliente });
    } catch (err) { next(err); }
  },

  updateCliente: async (req, res, next) => {
    try {
      await clienteService.updateCliente(req.params.id, req.body);
      res.redirect('/clientes');
    } catch (err) { next(err); }
  },

  deleteCliente: async (req, res, next) => {
    try {
      await clienteService.deleteCliente(req.params.id);
      res.redirect('/clientes');
    } catch (err) { next(err); }
  },

  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await clienteService.exportToExcel();
      res.download(filePath, 'clientes.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/clientes?error=export');
        }
      });
    } catch (err) { next(err); }
  }
};