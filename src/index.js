require('dotenv').config();
console.log('Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  MYSQLHOST: process.env.MYSQLHOST ? '****' : 'MISSING',
  MYSQLUSER: process.env.MYSQLUSER ? '****' : 'MISSING',
  MYSQLDATABASE: process.env.MYSQLDATABASE,
  PORT: process.env.PORT
});
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');

// const pool = require('./database');

// // Initialize basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"], // Added https: for ngrok
      connectSrc: ["'self'", "https://*.ngrok.io"] // Added for ngrok
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" } // Needed for ngrok
}));
app.use(compression());

// Session and flash configuration
require('./middlewares')(app);
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.user = req.user || null;
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
// Serve static files
// app.use(express.static('public', {
//   maxAge: '1y',
//   setHeaders: function (res, path) {
//     if (path.endsWith('.css')) {
//       res.setHeader('Content-Type', 'text/css');
//     }
//   }
// }));

app.use(express.static(publicPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.set('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.set('Content-Type', 'text/css');
    } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      res.set('Content-Type', `image/${ext.substring(1)}`);
    }
  }
}));
// Add this with your other static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/test-static', (req, res) => {
  res.json({
    css: `${res.locals.baseUrl}/css/index.css`,
    logo: `${res.locals.baseUrl}/images/logo.png`,
    js: `${res.locals.baseUrl}/js/recepciones.js`
  });
});

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
  require('./routes/deudaRoutes'),
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
  require('./routes/gananciaRoutes'),
  require('./routes/accesoRoutes'),
  require('./routes/incidenciaRoutes'),
  require('./routes/health') 
];

routes.forEach(route => app.use(route));

// Error handling
app.use(require('./middlewares/errorHandler'));

// Start server
const port = process.env.PORT || 4001;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Add database connection test
    // pool.getConnection()
    // .then(conn => {
    //   console.log('Database connection successful');
    //   conn.release();
    // })
    // .catch(err => {
    //   console.error('Database connection failed:', err);
    // });
  
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

// Add these before your other routes
app.get('/debug/env', (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV,
    mysql_connected: pool && pool._freeConnections ? pool._freeConnections.length : 'pool not initialized',
    session_config: {
      store: req.sessionStore ? 'connected' : 'disconnected',
      secret: !!process.env.SESSION_SECRET
    }
  });
});

app.get('/debug/db', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        db_connection: 'failed',
        error: 'Database pool not initialized'
      });
    }
    
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    res.json({ 
      db_connection: 'success',
      test_query: rows[0].solution === 2
    });
  } catch (err) {
    res.status(500).json({
      db_connection: 'failed',
      error: err.message
    });
  }
});
app.get('/health', async (req, res) => {
  try {
    let dbStatus = 'unknown';
    
    if (pool) {
      try {
        const [rows] = await pool.query('SELECT 1 as health_check');
        dbStatus = 'connected';
      } catch (err) {
        dbStatus = 'disconnected';
      }
    }
    
    res.status(200).json({ 
      status: 'OK', 
      database: dbStatus,
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: err.message,
      timestamp: new Date().toISOString() 
    });
  }
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