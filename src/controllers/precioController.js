const precioService = require('../services/precioService');
const dateFormatter = require('../helpers/dateFormatter');

module.exports = {
  // List public products
  listPrecios: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await precioService.getPrecios(parseInt(page), parseInt(limit), q);

      res.render('precio/list', {
        productos: result.productos,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        dateFormatter
      });
    } catch (err) {
      next(err);
    }
  },

  // Show form to add new public product
  showNewForm: async (req, res, next) => {
    try {
      const availableProducts = await precioService.getAvailableProducts();
      res.render('precio/new', { availableProducts });
    } catch (err) {
      next(err);
    }
  },

  // Create new public product
  createPrecio: async (req, res, next) => {
    try {
      await precioService.createPrecio(req.body);
      res.redirect('/precio');
    } catch (err) {
      next(err);
    }
  },

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const producto = await precioService.getPrecioById(req.params.id);
      res.render('precio/edit', { producto });
    } catch (err) {
      next(err);
    }
  },

  // Update product price
  updatePrecio: async (req, res, next) => {
    try {
      await precioService.updatePrecio(req.params.id, req.body.precio);
      res.redirect('/precio');
    } catch (err) {
      next(err);
    }
  },

  // Delete public product
  // deleteProductoPublico: async (req, res, next) => {
  //   try {
  //     await productopublicoService.deleteProductoPublico(req.params.id);
  //     res.redirect('/productopublico');
  //   } catch (err) {
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await precioService.exportToExcel();
      res.download(filePath, 'precios.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/precio?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};