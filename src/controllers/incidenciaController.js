const incidenciaService = require('../services/incidenciaService');
const stockService = require('../services/stockService');
const fs = require('fs');
const pool = require('../config/database'); // Add this import

// Helper function to get employees
async function getEmpleados() {
  try {
    const [empleados] = await pool.query(
      'SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM empleado ORDER BY nombre'
    );
    return empleados;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

module.exports = {
  // List all incidents with search functionality
  listIncidencias: async (req, res, next) => {
    try {
      console.log('Entering listIncidencias controller');
      const { page = 1, limit = 10, q = '' } = req.query;
      console.log(`Params - page: ${page}, limit: ${limit}, search: ${q}`);

      const result = await incidenciaService.getIncidencias(parseInt(page), parseInt(limit), q);
      console.log('Incidencias data retrieved:', result.incidencias);

      res.render('incidencias/list', {
        incidencias: result.incidencias,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q
      });
    } catch (err) {
      console.error('Error in listIncidencias:', err);
      next(err);
    }
  },

  // Show new incident form
  showNewForm: async (req, res, next) => {
    try {
      // Get products in stock
      const productos = await stockService.getStock(1, 1000, '');
      
      // Get employees for dropdown
      const empleados = await getEmpleados();
      
      res.render('incidencias/new', { 
        productos: productos.stock,
        empleados: empleados,
        incidencia: {
          fecha: new Date().toISOString().split('T')[0],
          tipo: '',
          descripcion: '',
          dnivend: req.user?.dni || '',
          detalles: []
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Create new incident
  createIncidencia: async (req, res, next) => {
    try {
      const { fecha, tipo, descripcion, dnivend, productos } = req.body;
      
      // Validate that dnivend is provided
      if (!dnivend || dnivend.trim() === '') {
        req.flash('error', 'Debe seleccionar un empleado');
        
        // Get products and employees again for rendering the form
        const productos = await stockService.getStock(1, 1000, '');
        const empleados = await getEmpleados();
        
        return res.render('incidencias/new', { 
          productos: productos.stock,
          empleados: empleados,
          incidencia: {
            fecha,
            tipo,
            descripcion,
            dnivend: '',
            detalles: []
          }
        });
      }
      
      let productosArray = [];
      try {
        productosArray = typeof productos === 'string' ? JSON.parse(productos) : productos;
        if (!Array.isArray(productosArray)) {
          productosArray = [];
        }
      } catch (e) {
        req.flash('error', 'Error en el formato de productos');
        return res.redirect('/incidencias/nueva');
      }

      // Validate products
      for (const producto of productosArray) {
        if (!producto.id_producto || !producto.cantidad || producto.cantidad <= 0) {
          req.flash('error', 'Datos de producto incompletos o inválidos');
          return res.redirect('/incidencias/nueva');
        }

        try {
          // Check stock availability
          const stock = await stockService.getStockByProducto(producto.id_producto);
          if (stock.cantidad < producto.cantidad) {
            req.flash('error', `No hay suficiente stock para ${producto.nombre}`);
            return res.redirect('/incidencias/nueva');
          }
        } catch (err) {
          console.error('Validation error:', err);
          req.flash('error', 'Error al validar los datos');
          return res.redirect('/incidencias/nueva');
        }
      }

      const incidenciaId = await incidenciaService.createIncidencia({
        fecha,
        tipo,
        descripcion,
        dnivend,
        detalles: productosArray
      });
      
      req.flash('success', `Incidencia #${incidenciaId} registrada correctamente`);
      res.redirect('/incidencias');
    } catch (err) {
      console.error('Error creating incidencia:', err);
      
      // Handle specific errors
      if (err.message.includes('Empleado con DNI')) {
        req.flash('error', err.message);
        
        // Get products and employees again for rendering the form
        const productos = await stockService.getStock(1, 1000, '');
        const empleados = await getEmpleados();
        
        return res.render('incidencias/new', { 
          productos: productos.stock,
          empleados: empleados,
          incidencia: {
            fecha: req.body.fecha,
            tipo: req.body.tipo,
            descripcion: req.body.descripcion,
            dnivend: '',
            detalles: []
          }
        });
      }
      
      next(err);
    }
  },

  // Get incident details
  getIncidenciaDetails: async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id || isNaN(id)) {
        req.flash('error', 'ID de incidencia inválido');
        return res.redirect('/incidencias');
      }

      const incidencia = await incidenciaService.getIncidenciaById(id);
      
      if (!incidencia) {
        req.flash('error', `Incidencia con ID ${id} no encontrada`);
        return res.redirect('/incidencias');
      }
      
      res.render('incidencias/details', { incidencia });
    } catch (err) {
      console.error('Error en controlador getIncidenciaDetails:', err);
      
      if (err.message.includes('no encontrada')) {
        req.flash('error', err.message);
        return res.redirect('/incidencias');
      }
      
      req.flash('error', 'Error al cargar los detalles de la incidencia');
      res.redirect('/incidencias');
    }
  },

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id || isNaN(id)) {
        req.flash('error', 'ID de incidencia inválido');
        return res.redirect('/incidencias');
      }

      const incidencia = await incidenciaService.getIncidenciaById(id);
      
      if (!incidencia) {
        req.flash('error', `Incidencia con ID ${id} no encontrada`);
        return res.redirect('/incidencias');
      }

      // Get products in stock
      const productos = await stockService.getStock(1, 1000, '');
      
      // Get employees for dropdown
      const empleados = await getEmpleados();
      
      res.render('incidencias/edit', { 
        productos: productos.stock,
        empleados: empleados,
        incidencia: incidencia
      });
    } catch (err) {
      next(err);
    }
  },

  // Update incident
  updateIncidencia: async (req, res, next) => {
    try {
      const id = req.params.id;
      const { fecha, tipo, descripcion, dnivend, productos } = req.body;
      
      // Validate that dnivend is provided
      if (!dnivend || dnivend.trim() === '') {
        req.flash('error', 'Debe seleccionar un empleado');
        return res.redirect(`/incidencias/${id}/editar`);
      }
      
      let productosArray = [];
      try {
        productosArray = typeof productos === 'string' ? JSON.parse(productos) : productos;
        if (!Array.isArray(productosArray)) {
          productosArray = [];
        }
      } catch (e) {
        req.flash('error', 'Error en el formato de productos');
        return res.redirect(`/incidencias/${id}/editar`);
      }

      // Validate products
      for (const producto of productosArray) {
        if (!producto.id_producto || !producto.cantidad || producto.cantidad <= 0) {
          req.flash('error', 'Datos de producto incompletos o inválidos');
          return res.redirect(`/incidencias/${id}/editar`);
        }

        try {
          // Check stock availability (we need to consider the original incident quantities)
          const stock = await stockService.getStockByProducto(producto.id_producto);
          const originalIncidencia = await incidenciaService.getIncidenciaById(id);
          
          // Find if this product was in the original incident
          const originalProduct = originalIncidencia.detalles.find(d => d.id_producto === producto.id_producto);
          const originalQuantity = originalProduct ? originalProduct.cantidad : 0;
          
          // The effective change is (new quantity - original quantity)
          const quantityChange = producto.cantidad - originalQuantity;
          
          if (stock.cantidad < quantityChange) {
            req.flash('error', `No hay suficiente stock para ${producto.nombre}`);
            return res.redirect(`/incidencias/${id}/editar`);
          }
        } catch (err) {
          console.error('Validation error:', err);
          req.flash('error', 'Error al validar los datos');
          return res.redirect(`/incidencias/${id}/editar`);
        }
      }

      await incidenciaService.updateIncidencia(id, {
        fecha,
        tipo,
        descripcion,
        dnivend,
        detalles: productosArray
      });
      
      req.flash('success', `Incidencia #${id} actualizada correctamente`);
      res.redirect('/incidencias');
    } catch (err) {
      console.error('Error updating incidencia:', err);
      
      // Handle specific errors
      if (err.message.includes('Empleado con DNI')) {
        req.flash('error', err.message);
        return res.redirect(`/incidencias/${id}/editar`);
      }
      
      next(err);
    }
  },

  // Delete incident
  deleteIncidencia: async (req, res, next) => {
    try {
      const id = req.params.id;
      
      await incidenciaService.deleteIncidencia(id);
      
      req.flash('success', `Incidencia #${id} eliminada correctamente`);
      res.redirect('/incidencias');
    } catch (err) {
      console.error('Error deleting incidencia:', err);
      req.flash('error', 'Error al eliminar la incidencia');
      res.redirect('/incidencias');
    }
  },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await incidenciaService.exportToExcel();
      
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo Excel no se generó correctamente');
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=incidencias.xlsx');

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
        res.redirect('/incidencias');
      });

    } catch (err) {
      console.error('Error exporting to Excel:', err);
      
      let errorMessage = 'Error al generar el archivo Excel';
      if (err.message.includes('No hay incidencias para exportar')) {
        errorMessage = 'No hay datos de incidencias para exportar';
      } else if (err.message.includes('no se generó correctamente')) {
        errorMessage = 'El archivo Excel no se pudo generar';
      }
      
      req.flash('error', errorMessage);
      res.redirect('/incidencias');
    }
  }
};