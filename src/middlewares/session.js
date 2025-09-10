const session = require('express-session');
let MySQLStore;
let sessionStore;

try {
  MySQLStore = require('express-mysql-session')(session);
  
  const options = {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  };

  sessionStore = new MySQLStore(options);
  
  sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
  });
  
  sessionStore.on('connect', () => {
    console.log('Session store connected successfully');
  });
} catch (error) {
  console.error('Failed to initialize MySQL session store:', error);
  // Fallback to memory store
  sessionStore = new session.MemoryStore();
}

module.exports = session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
});