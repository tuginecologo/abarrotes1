const ventaService = require('../services/ventaService');
const stockService = require('../services/stockService');
const fs = require('fs');

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
    
    // Obtener el DNI del usuario logueado desde la sesión
    const sessionUserDni = req.session?.user?.dni || '';
    
    // Verificar si ese DNI está en la lista de empleados disponibles
    const isEmployeeInOptions = options.empleados.some(emp => emp.dni === sessionUserDni);
    
    // Si el usuario logueado es un empleado, usarlo; si no, usar el primer empleado
    const defaultDnivend = isEmployeeInOptions 
      ? sessionUserDni 
      : (options.empleados.length > 0 ? options.empleados[0].dni : '');
    
    res.render('ventas/new', { 
      options,
      venta: {
        dnicomp: '',
        dnivend: defaultDnivend,
        productos: [],
        mediodepago: '',
        noperacion: ''
      }
    });
  } catch (err) {
    next(err);
  }
},

  showNewForm: async (req, res, next) => {
    try {
      const options = await ventaService.getDropdownOptions();
      const userDni = req.user?.dni || '';
      
      res.render('ventas/new', { 
        options,
        venta: {
          id_cliente: '',
          dnivend: userDni,
          productos: [],
          mediodepago: '',
          noperacion: ''
        }
      });
    } catch (err) {
      next(err);
    }
  },


  // Create new sale (modified for individual discounts)
  createVenta: async (req, res, next) => {
    try {
      const { id_cliente, dnivend, fecha, mediodepago, payment_details, productos } = req.body;
      let { noperacion } = req.body;
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

      // Validate each product's discount
      for (const producto of productosArray) {
        const descuento = parseFloat(producto.descuento) || 0;
        if (descuento < 0) {
          req.flash('error', 'El descuento no puede ser negativo para el producto ' + producto.id_producto);
          return res.render('ventas/new', {
            options,
            venta: req.body,
            productos: productosArray
          });
        }
        
        // Get product price to validate discount doesn't exceed price
        try {
          const [price] = await ventaService.getProductPrice(producto.id_producto);
          if (price && price.length > 0) {
            const precioOriginal = price[0].precio;
            if (descuento > precioOriginal) {
              req.flash('error', `El descuento (${descuento}) no puede ser mayor al precio (${precioOriginal}) del producto ${producto.id_producto}`);
              return res.render('ventas/new', {
                options,
                venta: req.body,
                productos: productosArray
              });
            }
          }
        } catch (err) {
          console.error('Error validating discount:', err);
          req.flash('error', 'Error al validar los descuentos');
          return res.render('ventas/new', {
            options,
            venta: req.body,
            productos: productosArray
          });
        }
      }

      // Validate electronic payments
      if (mediodepago === '2' || mediodepago === '3' || mediodepago === '4') {
        if (!noperacion || noperacion.trim() === '') {
          req.flash('error', 'Número de operación requerido para pagos electrónicos');
          return res.render('ventas/new', {
            options,
            venta: req.body,
            productos: productosArray
          });
        }
      }

      // Validate mixed payment
      if (mediodepago === '5') {
        try {
          const mixedData = JSON.parse(payment_details);
          if (!mixedData.efectivo || !mixedData.electronico || !mixedData.metodo_electronico) {
            req.flash('error', 'Datos de pago mixto incompletos');
            return res.render('ventas/new', {
              options,
              venta: req.body,
              productos: productosArray
            });
          }
          noperacion = mixedData.operacion_electronica || '';
          req.body.noperacion = noperacion;
        } catch (e) {
          req.flash('error', 'Formato inválido para pago mixto');
          return res.render('ventas/new', {
            options,
            venta: req.body,
            productos: productosArray
          });
        }
      }

      // Validate products and stock
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
          const stock = await stockService.getStockByProducto(producto.id_producto);
          if (stock.cantidad < producto.cantidad) {
            req.flash('error', `No hay suficiente stock para ${producto.nombre}`);
            return res.render('ventas/new', {
              options,
              venta: req.body,
              productos: productosArray
            });
          }

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

      // Create the sale (descuento global eliminado)
      const ventaId = await ventaService.createVenta({
        dnivend,
        id_cliente,
        fecha: fecha || new Date().toISOString().split('T')[0],
        mediodepago,
        noperacion,
        payment_details,
        productos: productosArray
      });
      
      req.flash('success', `Venta #${ventaId} registrada correctamente`);
      res.redirect('/ventas');
    } catch (err) {
      console.error('Error creating sale:', err);
      req.flash('error', 'Error al registrar la venta: ' + err.message);
      res.redirect('/ventas/nueva');
    }
  },

  // Get sale details
  getVentaDetails: async (req, res, next) => {
    try {
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
      if (err.message.includes('no encontrada')) {
        req.flash('error', err.message);
        return res.redirect('/ventas');
      }
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
      const { dnivend, motivo, mediodepago, noperacion, payment_details, productos } = req.body;
      const options = await ventaService.getDropdownOptions();
      
      let productosArray = [];
      try {
        productosArray = typeof productos === 'string' ? JSON.parse(productos) : productos;
        if (!Array.isArray(productosArray)) {
          productosArray = [productosArray].filter(Boolean);
        }
      } catch (e) {
        console.error('Error parsing productos:', e);
        req.flash('error', 'Error en el formato de productos');
        return res.redirect(`/ventas/${id}/devolver`);
      }

      const venta = await ventaService.getVentaDetails(id);
      
      for (const producto of productosArray) {
        if (producto.cantidad > 0) {
          const originalProduct = venta.detalles.find(d => d.id_producto === producto.id_producto);
          if (!originalProduct) {
            req.flash('error', `Producto ${producto.id_producto} no encontrado en la venta original`);
            return res.redirect(`/ventas/${id}/devolver`);
          }
          if (producto.cantidad > originalProduct.maxReturnable) {
            req.flash('error', `No puede devolver más de ${originalProduct.maxReturnable} unidades del producto ${producto.id_producto}. Ya se han devuelto ${originalProduct.alreadyReturned} unidades.`);
            return res.redirect(`/ventas/${id}/devolver`);
          }
        }
      }

      if (productosArray.length === 0) {
        req.flash('error', 'Debe seleccionar al menos un producto para devolver');
        return res.redirect(`/ventas/${id}/devolver`);
      }

      await ventaService.processReturn({
        originalVentaId: id,
        dnivend,
        motivo,
        mediodepago,
        noperacion: noperacion || '',
        payment_details: payment_details || null,
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

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await ventaService.exportToExcel();
      
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo Excel no se generó correctamente');
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=ventas.xlsx');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

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
      let errorMessage = 'Error al generar el archivo Excel';
      if (err.message.includes('No hay ventas para exportar')) {
        errorMessage = 'No hay datos de ventas para exportar';
      } else if (err.message.includes('no se generó correctamente')) {
        errorMessage = 'El archivo Excel no se pudo generar';
      }
      req.flash('error', errorMessage);
      res.redirect('/ventas');
    }
  },

  // Export history to Excel
  exportHistoryToExcel: async (req, res, next) => {
    try {
      const { id } = req.params;
      const venta = await ventaService.getVentaDetails(id);
      const history = await ventaService.getVentaHistory(id);
      const filePath = await ventaService.exportHistoryToExcel(venta, history);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo Excel no se generó correctamente');
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=historial_venta_${id}.xlsx`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

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
        res.redirect(`/ventas/${id}/historial`);
      });

    } catch (err) {
      console.error('Error exporting history to Excel:', err);
      let errorMessage = 'Error al generar el archivo Excel';
      if (err.message.includes('No hay historial para exportar')) {
        errorMessage = 'No hay datos de historial para exportar';
      } else if (err.message.includes('no se generó correctamente')) {
        errorMessage = 'El archivo Excel no se pudo generar';
      }
      req.flash('error', errorMessage);
      res.redirect(`/ventas/${id}/historial`);
    }
  }
};