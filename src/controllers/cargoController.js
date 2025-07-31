// controllers/cargoController.js
const cargoService = require('../services/cargoService');

module.exports = {
  // List cargos with pagination and search
  listCargos: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await cargoService.getCargos(parseInt(page), parseInt(limit), q);

      res.render('cargos/list', {
        cargos: result.cargos,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q
      });
    } catch (err) {
      next(err);
    }
  },

  // Show new cargo form
  showNewForm: (req, res) => {
    res.render('cargos/new');
  },

  // Create new cargo
  createCargo: async (req, res, next) => {
    try {
      await cargoService.createCargo(req.body);
      res.redirect('/cargos');
    } catch (err) {
      next(err);
    }
  },

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const cargo = await cargoService.getCargoById(req.params.id);
      if (!cargo) {
        throw new Error('Cargo no encontrado');
      }
      res.render('cargos/edit', { cargo }); // Passing as 'cargo'
    } catch (err) {
      next(err);
    }
  },

  // Update cargo
  updateCargo: async (req, res, next) => {
    try {
      await cargoService.updateCargo(req.params.id, req.body);
      res.redirect('/cargos');
    } catch (err) {
      next(err);
    }
  },

  // Delete cargo
  deleteCargo: async (req, res, next) => {
    try {
      await cargoService.deleteCargo(req.params.id);
      res.redirect('/cargos');
    } catch (err) {
      next(err);
    }
  },

  // Bulk delete cargos
  // bulkDeleteCargos: async (req, res, next) => {
  //   try {
  //     // Convert to array if it's not already one
  //     const cargoIds = Array.isArray(req.body.cargoIds)
  //       ? req.body.cargoIds
  //       : [req.body.cargoIds].filter(Boolean);

  //     if (cargoIds.length === 0) {
  //       throw new Error('No cargos selected');
  //     }

  //     await cargoService.bulkDeleteCargos(cargoIds);
  //     res.redirect('/cargos');
  //   } catch (err) {
  //     // Pass the error to the error handler
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await cargoService.exportToExcel();
      res.download(filePath, 'cargos.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/cargos?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};