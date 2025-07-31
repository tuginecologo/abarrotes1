const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const empleadoService=require('./empleadoService');

module.exports = {
  validateLogin: async (usernameOrDni, password) => {
    if (!usernameOrDni || !password) {
      return { isValid: false, error: 'empty' };
    }

    // 1. First check admin login (from environment variables)
    if (usernameOrDni === process.env.ADMIN_USERNAME) {
      try {
        const isPasswordValid = await bcrypt.compare(password, process.env.ADMIN_HASHED_PW);
        if (isPasswordValid) {
          return {
            isValid: true,
            user: {
              dni: 'admin',
              nombre: 'Administrador',
              tipo: '0' // Total access
            }
          };
        }
      } catch (err) {
        console.error('Admin login error:', err);
      }
      return { isValid: false, error: 'auth' };
    }

    // 2. Check employee credentials in database
    try {
      const [rows] = await pool.query(
        'SELECT a.dni, a.password, a.tipo FROM acceso a WHERE a.dni = ?',
        [usernameOrDni]
      );

      if (rows.length === 0) {
        return { isValid: false, error: 'auth' };
      }

      const access = rows[0];
      const isPasswordValid = await bcrypt.compare(password, access.password);

      if (!isPasswordValid) {
        return { isValid: false, error: 'auth' };
      }

      // Get employee details - using the correct method
      const empleado = await empleadoService.getEmpleadoByDni(usernameOrDni);
      if (!empleado) {
        return { isValid: false, error: 'auth' };
      }

      return {
        isValid: true,
        user: {
          dni: empleado.dni,
          nombre: `${empleado.nombres} ${empleado.apellidos}`,
          tipo: access.tipo
        }
      };
    } catch (err) {
      console.error('Employee login error:', err);
      return { isValid: false, error: 'server' };
    }
  }
}
//Forma de generar la contraseña encriptada para el archivo .env:

//node -e "require('bcryptjs').hash('your_actual_password', 10).then(console.log)"
//Esto se ingresa en el terminal