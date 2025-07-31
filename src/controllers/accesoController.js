const accesoService = require('../services/accesoService');
const empleadoService = require('../services/empleadoService');

module.exports = {
  listAccesos: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await accesoService.getAccesos(parseInt(page), parseInt(limit), q);

      res.render('accesos/list', {
        accesos: result.accesos,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q
      });
    } catch (err) {
      next(err);
    }
  },

  showNewForm: async (req, res, next) => {
    try {
      const empleados = await empleadoService.getEmpleadosSinAcceso();
      res.render('accesos/new', { empleados });
    } catch (err) {
      next(err);
    }
  },

  createAcceso: async (req, res, next) => {
    try {
      // Validate required fields
      if (!req.body.dni || !req.body.password || !req.body.tipo) {
        throw new Error('Todos los campos son requeridos');
      }

      // Clean and validate input
      req.body.dni = req.body.dni.toString().trim();

      await accesoService.createAcceso(req.body);
      req.flash('success', 'Acceso creado correctamente');
      res.redirect('/accesos');
    } catch (err) {
      console.error('Error creating access:', err);
      req.flash('error', err.message);

      try {
        const empleados = await empleadoService.getEmpleadosSinAcceso();
        res.render('accesos/new', {
          empleados,
          formData: req.body,
          error: err.message
        });
      } catch (fetchErr) {
        console.error('Error fetching employees:', fetchErr);
        next(fetchErr);
      }
    }
  },

  showEditForm: async (req, res, next) => {
    try {
      const acceso = await accesoService.getAccesoById(req.params.dni);
      if (!acceso) {
        throw new Error('Acceso no encontrado');
      }
      res.render('accesos/edit', { acceso });
    } catch (err) {
      next(err);
    }
  },

  updateAcceso: async (req, res, next) => {
    try {
      await accesoService.updateAcceso(req.params.dni, req.body);
      req.flash('success', 'Acceso actualizado correctamente');
      res.redirect('/accesos');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/accesos/editar/${req.params.dni}`);
    }
  },

  deleteAcceso: async (req, res, next) => {
    try {
      await accesoService.deleteAcceso(req.params.dni);
      req.flash('success', 'Acceso eliminado correctamente');
      res.redirect('/accesos');
    } catch (err) {
      next(err);
    }
  },

  // Add this to the exports
  // exportToExcel: async (req, res, next) => {
  //   try {
  //     const filePath = await accesoService.exportToExcel();
  //     res.download(filePath, 'accesos.xlsx', (err) => {
  //       if (err) {
  //         console.error(err);
  //         res.redirect('/accesos?error=export');
  //       }
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  // bulkDeleteAccesos: async (req, res, next) => {
  //   try {
  //     const dniList = Array.isArray(req.body.dniList)
  //       ? req.body.dniList
  //       : [req.body.dniList].filter(Boolean);

  //     if (dniList.length === 0) {
  //       throw new Error('No se seleccionaron accesos');
  //     }

  //     await accesoService.bulkDeleteAccesos(dniList);
  //     req.flash('success', 'Accesos eliminados correctamente');
  //     res.redirect('/accesos');
  //   } catch (err) {
  //     next(err);
  //   }
  // }
};