const clienteService = require('../services/clienteService');
const dateFormatter = require('../helpers/dateFormatter');

module.exports = {
  // List clients with pagination and search
  listClientes: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await clienteService.getClientes(parseInt(page), parseInt(limit), q);

      res.render('clientes/list', {
        clientes: result.clientes,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        dateFormatter: dateFormatter // Make sure this is passed to the view

      });
    } catch (err) {
      next(err);
    }
  },

  // Show new client form
  showNewForm: (req, res) => {
    res.render('clientes/new');
  },

  // Create new client
  createCliente: async (req, res, next) => {
    try {
      await clienteService.createCliente(req.body);
      res.redirect('/clientes');
    } catch (err) {
      next(err);
    }
  },

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const cliente = await clienteService.getClienteByDni(req.params.dni);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }
      res.render('clientes/edit', { cliente });
    } catch (err) {
      next(err);
    }
  },

  // Update client
  updateCliente: async (req, res, next) => {
    try {
      await clienteService.updateCliente(req.params.dni, req.body);
      res.redirect('/clientes');
    } catch (err) {
      next(err);
    }
  },

  // Delete client
  deleteCliente: async (req, res, next) => {
    try {
      await clienteService.deleteCliente(req.params.dni);
      res.redirect('/clientes');
    } catch (err) {
      next(err);
    }
  },

  // Bulk delete clients
  // bulkDeleteClientes: async (req, res, next) => {
  //   try {
  //     const clienteDnis = Array.isArray(req.body.clienteDnis)
  //       ? req.body.clienteDnis
  //       : [req.body.clienteDnis].filter(Boolean);

  //     if (clienteDnis.length === 0) {
  //       throw new Error('No clientes selected');
  //     }

  //     await clienteService.bulkDeleteClientes(clienteDnis);
  //     res.redirect('/clientes');
  //   } catch (err) {
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await clienteService.exportToExcel();
      res.download(filePath, 'clientes.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/clientes?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};