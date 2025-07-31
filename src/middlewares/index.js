// middlewares/index.js
const express = require('express');
const session = require('./session');
const { checkAuth } = require('./auth');

module.exports = (app) => {
  // Core
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  
  // Session
  app.use(session);
  
  // You can now access checkAuth anywhere via:
  // const { checkAuth } = require('../middlewares');
};