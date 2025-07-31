const compraService = require('../services/compraService');
const dateFormatter = require('../helpers/dateFormatter'); // adjust path as needed

module.exports = {
  // List compras with pagination and search
  listCompras: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await compraService.getCompras(parseInt(page), parseInt(limit), q);

      res.render('compras/list', {
        compras: result.compras,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        dateFormatter: dateFormatter // Make sure this is passed to the view

      });
    } catch (err) {
      next(err);
    }
  },

  // Show new compra form
  showNewForm: async (req, res, next) => {
    try {
      const options = await compraService.getDropdownOptions();
      res.render('compras/new', { options });
    } catch (err) {
      next(err);
    }
  },

  // Create new compra
  createCompra: async (req, res, next) => {
    try {
      await compraService.createCompra(req.body);
      res.redirect('/compras');
    } catch (err) {
      next(err);
    }
  },

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const compra = await compraService.getCompraById(req.params.id);
      if (!compra) {
        throw new Error('Compra no encontrada');
      }
      const options = await compraService.getDropdownOptions();
      res.render('compras/edit', { compra, options });
    } catch (err) {
      next(err);
    }
  },

  // Update compra
  updateCompra: async (req, res, next) => {
    try {
      await compraService.updateCompra(req.params.id, req.body);
      res.redirect('/compras');
    } catch (err) {
      next(err);
    }
  },

  // Delete compra
  deleteCompra: async (req, res, next) => {
    try {
      await compraService.deleteCompra(req.params.id);
      res.redirect('/compras');
    } catch (err) {
      next(err);
    }
  },

  // Bulk delete compras
  // bulkDeleteCompras: async (req, res, next) => {
  //   try {
  //     const compraIds = Array.isArray(req.body.compraIds)
  //       ? req.body.compraIds
  //       : [req.body.compraIds].filter(Boolean);

  //     if (compraIds.length === 0) {
  //       throw new Error('No compras selected');
  //     }

  //     await compraService.bulkDeleteCompras(compraIds);
  //     res.redirect('/compras');
  //   } catch (err) {
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await compraService.exportToExcel();
      res.download(filePath, 'compras.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/compras?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};