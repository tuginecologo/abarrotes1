const proveedorService = require('../services/proveedorService');

module.exports = {
  // List proveedores with pagination and search
  listProveedores: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await proveedorService.getProveedores(parseInt(page), parseInt(limit), q);

      res.render('proveedores/list', {
        proveedores: result.proveedores,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q
      });
    } catch (err) {
      next(err);
    }
  },

  // Show new proveedor form
  showNewForm: (req, res) => {
    res.render('proveedores/new');
  },

  // Create new proveedor
  createProveedor: async (req, res, next) => {
    try {
      await proveedorService.createProveedor(req.body);
      res.redirect('/proveedores');
    } catch (err) {
      next(err);
    }
  },

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const proveedor = await proveedorService.getProveedorById(req.params.id);
      if (!proveedor) {
        throw new Error('Proveedor no encontrado');
      }
      res.render('proveedores/edit', { proveedor });
    } catch (err) {
      next(err);
    }
  },

  // Update proveedor
  updateProveedor: async (req, res, next) => {
    try {
      await proveedorService.updateProveedor(req.params.id, req.body);
      res.redirect('/proveedores');
    } catch (err) {
      next(err);
    }
  },

  // Delete proveedor
  deleteProveedor: async (req, res, next) => {
    try {
      await proveedorService.deleteProveedor(req.params.id);
      res.redirect('/proveedores');
    } catch (err) {
      next(err);
    }
  },

  // Bulk delete proveedores
  // bulkDeleteProveedores: async (req, res, next) => {
  //   try {
  //     const proveedorIds = Array.isArray(req.body.proveedorIds)
  //       ? req.body.proveedorIds
  //       : [req.body.proveedorIds].filter(Boolean);

  //     if (proveedorIds.length === 0) {
  //       throw new Error('No proveedores selected');
  //     }

  //     await proveedorService.bulkDeleteProveedores(proveedorIds);
  //     res.redirect('/proveedores');
  //   } catch (err) {
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await proveedorService.exportToExcel();
      res.download(filePath, 'proveedores.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/proveedores?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};