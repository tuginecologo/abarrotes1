// Create routes/health.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const [result] = await pool.query('SELECT 1 as test');
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;