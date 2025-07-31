const { Router } = require('express');
const router = Router();
const { checkAuth, checkRole } = require('../middlewares/auth'); // Import middleware
const authService = require('../services/authService'); // Import the service
const bcrypt = require('bcryptjs');

// Login Page (GET)
router.get('/', (req, res) => {
  res.render('index', { 
    error: req.query.error,
    csrfToken: req.csrfToken?.() // Only if you added CSRF protection
  });
});

// Handle Login Form (POST)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.validateLogin(username, password);

    if (result.isValid) {
      req.session.authenticated = true;
      req.session.user = result.user;
      return res.redirect('/dashboard');
    }
    
    // More specific error handling
    let errorMessage = 'Credenciales incorrectas';
    if (result.error === 'empty') errorMessage = 'Usuario y contraseña son requeridos';
    if (result.error === 'server') errorMessage = 'Error del servidor';
    
    return res.render('index', { 
      error: errorMessage,
      username: req.body.username // To repopulate the form
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.render('index', { 
      error: 'Error del servidor',
      username: req.body.username
    });
  }
});

// Protected Dashboard (GET)
router.get('/dashboard', checkAuth, (req, res) => {
  res.render('dashboard', { 
    username: req.session.username 
  });
});

// Logout (GET)
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Error destroying session:', err);
    res.redirect('/');
  });
});

module.exports = router;