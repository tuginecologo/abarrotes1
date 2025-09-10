const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

// Test connection but don't crash on error
pool.getConnection()
  .then(conn => {
    console.log('Successfully connected to MySQL database on Railway');
    conn.release();
  })
  .catch(err => {
    console.error('Railway database connection failed:', err.message);
    // Don't exit process - let the app continue without DB
  });

module.exports = pool;