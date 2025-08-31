const productoService = require('../services/productoService');

module.exports = {
  listProducts: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '', success, error } = req.query;
      const result = await productoService.getProducts(parseInt(page), parseInt(limit), q);

      res.render('productos/list', {
        products: result.products,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        success_msg: success,
        error_msg: error,
        formatDate: (date) => new Date(date).toLocaleDateString('es-PE')
      });
    } catch (err) {
      next(err);
    }
  },

  showNewForm: (req, res) => {
    res.render('productos/new');
  },

  createProduct: async (req, res, next) => {
    try {
      const productData = req.body;
      await productoService.createProduct(productData);
      res.redirect('/productos');
    } catch (err) {
      // Handle duplicate entry error
      if (err.code === 'ER_DUP_ENTRY') {
        return res.render('productos/new', {
          error_msg: 'El código de barras ya existe. Por favor use otro.',
          // Keep the form data to avoid re-typing
          formData: req.body
        });
      }
      next(err);
    }
  },

  showEditForm: async (req, res, next) => {
    try {
      const product = await productoService.getProductById(req.params.id);
      res.render('productos/edit', { product });
    } catch (err) {
      next(err);
    }
  },

  updateProduct: async (req, res, next) => {
    try {
      const productData = req.body;
      await productoService.updateProduct(req.params.id, productData);
      res.redirect('/productos');
    } catch (err) {
      next(err);
    }
  },

  deleteProduct: async (req, res, next) => {
    try {
      await productoService.deleteProduct(req.params.id);
      res.redirect('/productos');
    } catch (err) {
      next(err);
    }
  },

  // bulkDeleteProducts: async (req, res, next) => {
  //   try {
  //     let productIds = req.body.productIds;

  //     if (!productIds) {
  //       req.flash('error', 'No se seleccionaron productos');
  //       return res.redirect('/productos');
  //     }

  //     if (!Array.isArray(productIds)) {
  //       productIds = [productIds];
  //     }

  //     productIds = productIds.map(id => parseInt(id));

  //     await productoService.bulkDeleteProducts(productIds);
  //     req.flash('success', `${productIds.length} productos eliminados correctamente`);
  //     res.redirect('/productos');
  //   } catch (err) {
  //     req.flash('error', 'Error al eliminar productos');
  //     next(err);
  //   }
  // },

  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await productoService.exportToExcel();
      res.download(filePath, 'productos.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/productos?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};