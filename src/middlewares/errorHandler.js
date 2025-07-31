module.exports = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Set default error message and status
    const status = err.status || 500;
    const message = err.message || 'Ocurrió un error inesperado';
    
    // Determine if we should show detailed errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(status).render('error', {
        message: message,
        error: isDevelopment ? err.stack : null
    });
};