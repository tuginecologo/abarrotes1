const recepcionService = require('../services/recepcionService');
const recepcionRepository = require('../repositories/recepcionRepository');
const dateFormatter = require('../helpers/dateFormatter'); // adjust path as needed

module.exports = {
  // List recepciones with pagination and search
  listRecepciones: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await recepcionService.getRecepciones(parseInt(page), parseInt(limit), q);

      res.render('recepciones/list', {
        recepciones: result.recepciones,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        dateFormatter: dateFormatter // Make sure this is passed to the view
      });
    } catch (err) {
      next(err);
    }
  },

// Show new recepcion form
showNewForm: async (req, res, next) => {
  try {
    const options = await recepcionService.getDropdownOptions();
    res.render('recepciones/new', {
      options,
      recepcion: {
        id_compra: '',
        dni: '',
        cantidad: '',
        fecha: new Date().toISOString().split('T')[0],
        observacion: ''
      },
      messages: req.flash() // Add this line to pass flash messages
    });
  } catch (err) {
    next(err);
  }
},

// Create new recepcion
createRecepcion: async (req, res, next) => {
  try {
    await recepcionService.createRecepcion(req.body);
    req.flash('success', 'Recepción registrada correctamente');
    res.redirect('/recepciones');
  } catch (err) {
    console.error('Error creating reception:', err);
    
    // Handle specific validation errors
    if (err.message.includes('fecha de recepción no puede ser anterior')) {
      req.flash('error', err.message);
    } else if (err.message.includes('cantidad recibida excede')) {
      req.flash('error', err.message);
    } else {
      req.flash('error', 'Error al crear la recepción');
    }
    
    // Redirect back to form with error message and form data
    const options = await recepcionService.getDropdownOptions();
    res.render('recepciones/new', {
      options,
      recepcion: req.body,
      messages: req.flash() // Add this line to pass flash messages
    });
  }
},
// In recepcionController.js - update showEditForm
showEditForm: async (req, res, next) => {
  try {
    const recepcion = await recepcionService.getRecepcionById(req.params.id);
    if (!recepcion) {
      req.flash('error', 'Recepción no encontrada');
      return res.redirect('/recepciones');
    }

    const options = await recepcionService.getDropdownOptions();
    if (!options || !options.proveedores) {
      throw new Error('No se pudieron cargar las opciones del formulario');
    }

    // Get the purchase date if this reception is linked to a purchase
    let compraFecha = null;
    if (recepcion.id_compra) {
      compraFecha = await recepcionRepository.getCompraFecha(recepcion.id_compra);
    }

    res.render('recepciones/edit', { 
      recepcion, 
      options,
      compraFecha: compraFecha ? new Date(compraFecha).toISOString().split('T')[0] : null,
      messages: req.flash() // Add flash messages
    });
  } catch (err) {
    next(err);
  }
},

// In recepcionController.js - update updateRecepcion
updateRecepcion: async (req, res, next) => {
  try {
    await recepcionService.updateRecepcion(req.params.id, req.body);
    req.flash('success', 'Recepción actualizada correctamente');
    res.redirect('/recepciones');
  } catch (err) {
    console.error('Error updating reception:', err);
    
    // Handle specific validation errors
    if (err.message.includes('fecha de recepción no puede ser anterior')) {
      req.flash('error', err.message);
    } else {
      req.flash('error', 'Error al actualizar la recepción');
    }
    
    // Redirect back to edit form
    res.redirect(`/recepciones/editar/${req.params.id}`);
  }
},

  // Delete recepcion
  deleteRecepcion: async (req, res, next) => {
    try {
      await recepcionService.deleteRecepcion(req.params.id);
      res.redirect('/recepciones');
    } catch (err) {
      next(err);
    }
  },

  // Bulk delete recepciones
  // bulkDeleteRecepciones: async (req, res, next) => {
  //   try {
  //     const recepcionIds = Array.isArray(req.body.recepcionIds)
  //       ? req.body.recepcionIds
  //       : [req.body.recepcionIds].filter(Boolean);

  //     if (recepcionIds.length === 0) {
  //       throw new Error('No recepciones selected');
  //     }

  //     await recepcionService.bulkDeleteRecepciones(recepcionIds);
  //     res.redirect('/recepciones');
  //   } catch (err) {
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await recepcionService.exportToExcel();
      res.download(filePath, 'recepciones.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/recepciones?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};