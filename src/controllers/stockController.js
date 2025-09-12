// In stockController.js - improve error handling
const stockService = require('../services/stockService');
const productoService = require('../services/productoService');

module.exports = {
  // List stock with pagination and search
  listStock: async (req, res, next) => {
    try {
      console.log('Entering listStock controller');
      const { page = 1, limit = 10, q = '' } = req.query;
      console.log(`Params - page: ${page}, limit: ${limit}, search: ${q}`);

      const result = await stockService.getStock(parseInt(page), parseInt(limit), q);
      console.log('Stock data retrieved:', result.stock);

      res.render('stock/list', {
        stock: result.stock,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q
      });
    } catch (err) {
      console.error('Error in listStock:', err);
      
      // Check if it's a connection error
      if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        req.flash('error', 'Error de conexión con la base de datos. Por favor, intente nuevamente.');
      } else {
        req.flash('error', 'Error al cargar el inventario');
      }
      
      // Render the page with empty stock and error message
      res.render('stock/list', {
        stock: [],
        currentPage: 1,
        totalPages: 1,
        searchQuery: q || ''
      });
    }
  },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await stockService.exportToExcel();
      res.download(filePath, 'stock.xlsx', (err) => {
        if (err) {
          console.error(err);
          req.flash('error', 'Error al descargar el archivo');
          res.redirect('/stock');
        }
      });
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      req.flash('error', 'Error al generar el archivo Excel');
      res.redirect('/stock');
    }
  },
  // Public stock view (no authentication required)
  publicStock: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await stockService.getStock(parseInt(page), parseInt(limit), q);
      
      // Check if result has stock property (like listStock method)
      const stockItems = result.stock || result.rows || [];
      
      // Get media for all products
      const stockWithMedia = await Promise.all(
        stockItems.map(async (item) => {
          try {
            const images = await productoService.getProductImages(item.id_producto);
            const videos = await productoService.getProductVideos(item.id_producto);
            return {
              ...item,
              images,
              videos
            };
          } catch (error) {
            console.error(`Error getting media for product ${item.id_producto}:`, error);
            return {
              ...item,
              images: [],
              videos: []
            };
          }
        })
      );
  
      res.render('stock/public', {
        stock: stockWithMedia,
        currentPage: parseInt(page),
        totalPages: result.totalPages || Math.ceil((result.total || 0) / parseInt(limit)),
        searchQuery: q,
        // Disable authentication requirements for this view
        noAuth: true
      });
    } catch (err) {
      console.error('Error in publicStock:', err);
      next(err);
    }
  },
  // Public product media view (no authentication required)
publicProductMedia: async (req, res, next) => {
  try {
    const productId = req.params.id;
    
    // Get product details
    const product = await productoService.getProductById(productId);
    if (!product) {
      return res.status(404).render('error', { 
        message: 'Producto no encontrado',
        noAuth: true
      });
    }
    
    // Get product media
    const images = await productoService.getProductImages(productId);
    const videos = await productoService.getProductVideos(productId);
    
    res.render('stock/public-media', {
      product,
      images,
      videos,
      noAuth: true
    });
  } catch (err) {
    console.error('Error in publicProductMedia:', err);
    next(err);
  }
},
}
