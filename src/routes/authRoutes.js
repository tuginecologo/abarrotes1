const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

router.post('/login', async (req, res) => {
  const { dni, password } = req.body;
  const result = await authService.validateLogin(dni, password);

  if (result.isValid) {
    req.session.authenticated = true;
    req.session.user = result.user;
    res.redirect('/dashboard');
  } else {
    let errorMessage = 'Error en el inicio de sesión';
    if (result.error === 'empty') errorMessage = 'DNI y contraseña son requeridos';
    if (result.error === 'auth') errorMessage = 'Credenciales incorrectas';
    
    res.render('login', { error: errorMessage });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;