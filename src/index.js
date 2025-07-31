require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');

// // Initialize basic middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));
app.use(compression());

// Session and flash configuration
require('./middlewares')(app);
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  next();
});

// Application settings
app.set('case sensitive routing', true);
app.set('appName', 'Empresa Plantilla');
app.set('port', 4001);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from src/public directory
const publicPath = path.join(__dirname, 'public');
console.log(`Static files served from: ${publicPath}`);

app.use('/public', express.static(publicPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.set('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Debugging routes
app.get('/debug/files', (req, res) => {
  const filesToCheck = [
    'public/js/recepciones.js',
    'public/css/main.css',
    'public/images/logo.png'
  ];
  
  const results = {};
  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    results[file] = {
      exists: fs.existsSync(fullPath),
      readable: fs.accessSync(fullPath, fs.constants.R_OK) ? false : true,
      size: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0
    };
  });
  
  res.json(results);
});

app.get('/verify-static', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'js', 'recepciones.js');
  
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).json({
        error: 'File not found',
        path: filePath,
        absolutePath: path.resolve(filePath),
        exists: fs.existsSync(filePath)
      });
    }
    
    res.json({
      status: 'File accessible',
      path: filePath,
      size: fs.statSync(filePath).size
    });
  });
});

// Import and use routes
const routes = [
  require('./routes/home'),
  require('./routes/productoRoutes'),
  require('./routes/cargoRoutes'),
  require('./routes/empleadoRoutes'),
  require('./routes/proveedorRoutes'),
  require('./routes/compraRoutes'),
  require('./routes/recepcionRoutes'),
  require('./routes/stockRoutes'),
  require('./routes/clienteRoutes'),
  require('./routes/precioRoutes'),
  require('./routes/ventaRoutes'),
  require('./routes/accesoRoutes')
];

routes.forEach(route => app.use(route));

// Error handling
app.use(require('./middlewares/errorHandler'));

// Start server
const port = process.env.PORT || 4001;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Verify static files configuration
  console.log('\nStatic files configuration:');
  console.log(`- Public directory: ${path.join(__dirname, 'public')}`);
  console.log(`- JS files should be at: ${path.join(__dirname, 'public', 'js')}`);
  
  // Verify recepciones.js exists
  const recepcionesPath = path.join(__dirname, 'public', 'js', 'recepciones.js');
  fs.access(recepcionesPath, fs.constants.R_OK, (err) => {
    if (err) {
      console.error('\x1b[31m', `ERROR: recepciones.js not found at ${recepcionesPath}`);
    } else {
      console.log('\x1b[32m', `SUCCESS: recepciones.js found at ${recepcionesPath}`);
    }
  });
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});