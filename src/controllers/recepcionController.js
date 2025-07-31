const recepcionService = require('../services/recepcionService');
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
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Create new recepcion
  createRecepcion: async (req, res, next) => {
    try {
      await recepcionService.createRecepcion(req.body);
      res.redirect('/recepciones');
    } catch (err) {
      next(err);
    }
  },

  // Show edit form
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

      res.render('recepciones/edit', { recepcion, options });
    } catch (err) {
      next(err);
    }
  },

  // Update recepcion
  updateRecepcion: async (req, res, next) => {
    try {
      await recepcionService.updateRecepcion(req.params.id, req.body);
      res.redirect('/recepciones');
    } catch (err) {
      next(err);
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