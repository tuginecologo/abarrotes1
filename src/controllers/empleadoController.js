const empleadoServicePath = require.resolve('../services/empleadoService');
console.log('Loading empleadoService from:', empleadoServicePath);
const empleadoService = require(empleadoServicePath);
const path = require('path');
const dateFormatter = require('../helpers/dateFormatter');

module.exports = {
  // List employees with pagination and search
  listEmpleados: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, q = '' } = req.query;
      const result = await empleadoService.getEmpleados(parseInt(page), parseInt(limit), q);
      const cargos = await empleadoService.getCargos();

      res.render('empleados/list', {
        empleados: result.empleados,
        cargos,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q,
        formatDate: (date) => date ? dateFormatter.format(date) : ''
      });
    } catch (err) {
      next(err);
    }
  },

  // Show new employee form
  showNewForm: async (req, res, next) => {
    try {
      const cargos = await empleadoService.getCargos();
      res.render('empleados/new', {
        cargos,
        empleado: {
          dni: '',
          nombres: '',
          apellidos: '',
          fecnac: '',
          sexo: 'M',
          fecini: new Date().toISOString().split('T')[0]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  listExEmpleados: async (req, res, next) => {
    try {
        const { page = 1, limit = 10, q = '' } = req.query;
        const result = await empleadoService.getExEmpleados(parseInt(page), parseInt(limit), q);
        const cargos = await empleadoService.getCargos();

        res.render('empleados/ex-empleados', {
            empleados: result.empleados,
            cargos,
            currentPage: parseInt(page),
            totalPages: result.totalPages,
            searchQuery: q,
            formatDate: (date) => date ? dateFormatter.format(date) : ''
        });
    } catch (err) {
        next(err);
    }
  },

  rehireEmpleado: async (req, res, next) => {
    try {
        const { id_cargo, fecini } = req.body;
        await empleadoService.rehireEmpleado(req.params.dni, id_cargo, fecini);
        req.flash('success', 'Empleado recontratado exitosamente');
        res.redirect('/empleados');
    } catch (err) {
        next(err);
    }
  },

  // Create new employee (fixed image path handling)
  createEmpleado: async (req, res, next) => {
    try {
      const empleadoData = req.body;
      await empleadoService.createEmpleado(empleadoData);
      res.redirect('/empleados');
    } catch (err) {
      next(err);
    }
  },

  updateEmpleado: async (req, res, next) => {
    try {
        console.log('Request body received:', req.body); // Debug log
        
        if (!req.body) {
            throw new Error('No data received in request body');
        }

        const requiredFields = ['nombres', 'apellidos', 'fecnac', 'sexo', 'id_cargo'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        const empleadoData = {
            dni: req.params.dni,
            nombres: req.body.nombres,
            apellidos: req.body.apellidos,
            fecnac: req.body.fecnac,
            sexo: req.body.sexo,
            id_cargo: req.body.id_cargo
        };

        await empleadoService.updateEmpleado(empleadoData.dni, empleadoData);

        req.flash('success', 'Empleado actualizado correctamente');
        res.redirect('/empleados');
    } catch (err) {
        console.error('Error updating employee:', err);
        req.flash('error', err.message);
        res.redirect(`/empleados/editar/${req.params.dni}`);
    }
},

  // Show edit form
  showEditForm: async (req, res, next) => {
    try {
      const empleado = await empleadoService.getEmpleadoById(req.params.dni);
      if (!empleado) {
        throw new Error('Empleado no encontrado');
      }

      const cargos = await empleadoService.getCargos();

      // Format date for the input field
      const formattedEmpleado = {
        ...empleado,
        fecnac: empleado.fecnac ? new Date(empleado.fecnac).toISOString().split('T')[0] : ''
      };

      res.render('empleados/edit', {
        empleado: formattedEmpleado,
        cargos
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete employee
  terminateEmpleado: async (req, res, next) => {
    try {
        const { motivosalida, fecfin } = req.body;
        await empleadoService.terminateEmpleado(req.params.dni, motivosalida, fecfin);
        req.flash('success', 'Empleado dado de baja correctamente');
        res.redirect('/empleados');
    } catch (err) {
        next(err);
    }
  },

  // Bulk delete employees
  // bulkDeleteEmpleados: async (req, res, next) => {
  //   try {
  //     let empleadoIds = req.body.empleadoIdsJson
  //       ? JSON.parse(req.body.empleadoIdsJson)
  //       : req.body.empleadoIds;

  //     if (!empleadoIds || (Array.isArray(empleadoIds) && empleadoIds.length === 0)) {
  //       req.flash('error', 'No se seleccionaron empleados');
  //       return res.redirect('/empleados');
  //     }

  //     empleadoIds = empleadoIds.map(id => parseInt(id));

  //     const result = await empleadoService.bulkDeleteEmpleados(empleadoIds);
  //     req.flash('success', `${result.count} empleado(s) eliminado(s) correctamente`);
  //     res.redirect('/empleados');
  //   } catch (err) {
  //     console.error('Error in bulkDeleteEmpleados:', err);
  //     req.flash('error', 'Error al eliminar empleados');
  //     next(err);
  //   }
  // },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await empleadoService.exportToExcel();
      res.download(filePath, 'empleados.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/empleados?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Save employee image (fixed path handling)
  // saveEmpleadoImage: async (req, res, next) => {
  //   try {
  //     const imagePath = await empleadoService.saveEmpleadoImage(req.params.dni, req.file);
  //     console.log('Image saved at:', imagePath);
  //     res.redirect(`/empleados/editar/${req.params.dni}`);
  //   } catch (err) {
  //     console.error('Error saving image:', err);
  //     next(err);
  //   }
  // },
  showTerminateForm: async (req, res, next) => {
    try {
        const empleado = await empleadoService.getEmpleadoById(req.params.dni);
        if (!empleado) {
            throw new Error('Empleado no encontrado');
        }
        res.render('empleados/terminate', { empleado });
    } catch (err) {
        next(err);
    }
  },
  terminateEmpleado: async (req, res, next) => {
    try {
        const { motivosalida } = req.body;
        await empleadoService.terminateEmpleado(req.params.dni, motivosalida);
        req.flash('success', 'Empleado dado de baja correctamente');
        res.redirect('/empleados');
    } catch (err) {
        next(err);
    }
  }
};