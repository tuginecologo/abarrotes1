

const pool = require('../config/database'); // Add this line
const ventaService = require('../services/ventaService');
const stockService = require('../services/stockService');

module.exports = {
  // List all sales
  listVentas: async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await ventaService.getVentas(parseInt(page), parseInt(limit));
      
      res.render('ventas/list', { 
        ventas: result.ventas,
        currentPage: parseInt(page),
        totalPages: result.totalPages
      });
    } catch (err) {
      next(err);
    }
  },

  // Show new sale form
showNewForm: async (req, res, next) => {
    try {
      const options = await ventaService.getDropdownOptions();
      
      // Default to empty string if no user or dni
      const userDni = req.user?.dni || '';
      
      res.render('ventas/new', { 
        options,
        venta: {
          dnicomp: '',
          dnivend: userDni, // Use the safe value
          productos: [],
          mediodepago: '',
          noperacion: ''
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Create new sale
  createVenta: async (req, res, next) => {
    try {
      const { dnicomp, dnivend, fecha, mediodepago, noperacion, productos } = req.body;
      const options = await ventaService.getDropdownOptions();
    
      let productosArray = [];
      try {
        productosArray = typeof productos === 'string' ? JSON.parse(productos) : productos;
        if (!Array.isArray(productosArray)) {
          productosArray = [];
        }
      } catch (e) {
        req.flash('error', 'Error en el formato de productos');
        return res.render('ventas/new', { 
          options,
          venta: req.body,
          productos: []
        });
      }
    
      // Validate products
      for (const producto of productosArray) {
        if (!producto.id_producto || !producto.cantidad) {
          req.flash('error', 'Datos de producto incompletos');
          return res.render('ventas/new', {
            options,
            venta: req.body,
            productos: productosArray
          });
        }
  
        try {
          // Check stock availability
          const stock = await stockService.getStockByProducto(producto.id_producto);
          if (stock.cantidad < producto.cantidad) {
            req.flash('error', `No hay suficiente stock para ${producto.nombre}`);
            return res.render('ventas/new', {
              options,
              venta: req.body,
              productos: productosArray
            });
          }
  
// Verify price exists
const [price] = await ventaService.getProductPrice(producto.id_producto);
if (!price || price.length === 0) {
  req.flash('error', `No se encontró precio para ${producto.nombre}`);
  return res.render('ventas/new', {
    options,
    venta: req.body,
    productos: productosArray
  });
}
        } catch (err) {
          console.error('Validation error:', err);
          req.flash('error', 'Error al validar los datos');
          return res.render('ventas/new', {
            options,
            venta: req.body,
            productos: productosArray
          });
        }
      }
    
      const ventaId = await ventaService.createVenta({
        dnivend,
        dnicomp,
        fecha: fecha || new Date().toISOString().split('T')[0],
        mediodepago,
        noperacion,
        productos: productosArray
      });
      
      req.flash('success', `Venta #${ventaId} registrada correctamente`);
      res.redirect('/ventas');
    } catch (err) {
      next(err);
    }
  },
  // Get sale details
// In ventaController.js - update getVentaDetails
// In ventaController.js - update getVentaDetails
getVentaDetails: async (req, res, next) => {
  try {
    // First check if the ID is valid
    const id = req.params.id;
    if (!id || isNaN(id)) {
      req.flash('error', 'ID de venta inválido');
      return res.redirect('/ventas');
    }

    const venta = await ventaService.getVentaDetails(id);
    
    if (!venta) {
      req.flash('error', `Venta con ID ${id} no encontrada`);
      return res.redirect('/ventas');
    }
    
    res.render('ventas/details', { venta });
  } catch (err) {
    console.error('Error en controlador getVentaDetails:', err);
    
    // Specific error for not found
    if (err.message.includes('no encontrada')) {
      req.flash('error', err.message);
      return res.redirect('/ventas');
    }
    
    // Generic error for other cases
    req.flash('error', 'Error al cargar los detalles de la venta');
    res.redirect('/ventas');
  }
},
  // Show return form
showReturnForm: async (req, res, next) => {
  try {
    const venta = await ventaService.getVentaDetails(req.params.id);
    const options = await ventaService.getDropdownOptions();
    
    res.render('ventas/return', { 
      options,
      venta,
      currentUserDni: req.user?.dni || ''
    });
  } catch (err) {
    next(err);
  }
},

// Process return
processReturn: async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dnivend, motivo, mediodepago, noperacion, productos } = req.body;
    const options = await ventaService.getDropdownOptions();
    
    let productosArray = [];
    try {
      // Check if productos is already an object/array or needs parsing
      productosArray = typeof productos === 'string' ? JSON.parse(productos) : productos;
      if (!Array.isArray(productosArray)) {
        // Handle case where it might be a single product object
        productosArray = [productosArray].filter(Boolean);
      }
    } catch (e) {
      console.error('Error parsing productos:', e);
      req.flash('error', 'Error en el formato de productos');
      return res.redirect(`/ventas/${id}/devolver`);
    }

    if (productosArray.length === 0) {
      req.flash('error', 'Debe seleccionar al menos un producto para devolver');
      return res.redirect(`/ventas/${id}/devolver`);
    }

    // Process the return
    await ventaService.processReturn({
      originalVentaId: id,
      dnivend,
      motivo,
      mediodepago,
      noperacion: noperacion || '',
      productos: productosArray
    });
    
    req.flash('success', 'Devolución registrada correctamente');
    res.redirect('/ventas');
  } catch (err) {
    console.error('Error processing return:', err);
    req.flash('error', err.message);
    res.redirect(`/ventas/${id}/devolver`);
  }
},

// Get sale modification history
getVentaHistory: async (req, res, next) => {
  try {
    const venta = await ventaService.getVentaDetails(req.params.id);
    const history = await ventaService.getVentaHistory(req.params.id);
    
    res.render('ventas/history', { 
      venta,
      history
    });
  } catch (err) {
    next(err);
  }
},
// In ventaController.js
exportToExcel: async (req, res, next) => {
  try {
    const filePath = await ventaService.exportToExcel();
    
    // Verify file exists before attempting to download
    if (!fs.existsSync(filePath)) {
      throw new Error('El archivo Excel no se generó correctamente');
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ventas.xlsx');

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up after download completes
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
      req.flash('error', 'Error al descargar el archivo Excel');
      res.redirect('/ventas');
    });

  } catch (err) {
    console.error('Error exporting to Excel:', err);
    
    // More specific error messages
    let errorMessage = 'Error al generar el archivo Excel';
    if (err.message.includes('No hay ventas para exportar')) {
      errorMessage = 'No hay datos de ventas para exportar';
    } else if (err.message.includes('no se generó correctamente')) {
      errorMessage = 'El archivo Excel no se pudo generar';
    }
    
    req.flash('error', errorMessage);
    res.redirect('/ventas');
  }
}
};
