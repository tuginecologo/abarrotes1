// const { getVideoEmbed } = require('../helpers/videoHelper');
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

  // productoController.js - Add these methods

// Show product media management page
showMediaForm: async (req, res, next) => {
  try {
    const product = await productoService.getProductById(req.params.id);
    const images = await productoService.getProductImages(req.params.id);
    const videos = await productoService.getProductVideos(req.params.id);
    
    res.render('productos/media', { 
      product, 
      images, 
      videos,
      // getVideoEmbed, // Pass the helper function to the view
      success_msg: req.query.success,
      error_msg: req.query.error
    });
  } catch (err) {
    next(err);
  }
},

// Handle image upload
uploadImage: async (req, res, next) => {
  try {
    if (!req.file) {
      return res.redirect(`/productos/media/${req.params.id}?error=No se seleccionó ninguna imagen`);
    }

    await productoService.addProductImage(req.params.id, req.file.filename);
    res.redirect(`/productos/media/${req.params.id}?success=Imagen subida correctamente`);
  } catch (err) {
    next(err);
  }
},

// Handle video link addition
addVideo: async (req, res, next) => {
  try {
    const { video_url } = req.body;
    
    if (!video_url) {
      return res.redirect(`/productos/media/${req.params.id}?error=URL de video requerida`);
    }

    await productoService.addProductVideo(req.params.id, video_url);
    res.redirect(`/productos/media/${req.params.id}?success=Video agregado correctamente`);
  } catch (err) {
    next(err);
  }
},

// Delete image
deleteImage: async (req, res, next) => {
  try {
    await productoService.deleteProductImage(req.params.imageId);
    res.redirect(`/productos/media/${req.params.id}?success=Imagen eliminada correctamente`);
  } catch (err) {
    next(err);
  }
},

// Delete video
deleteVideo: async (req, res, next) => {
  try {
    await productoService.deleteProductVideo(req.params.videoId);
    res.redirect(`/productos/media/${req.params.id}?success=Video eliminado correctamente`);
  } catch (err) {
    next(err);
  }
},

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