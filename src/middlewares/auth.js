// middlewares/auth.js
module.exports = {
    checkAuth: (req, res, next) => {
      if (req.session?.authenticated) {
        next(); // Allow access
      } else {
        res.redirect('/'); // Redirect to login
      }
    },
    checkRole: (allowedRoles) => {
      return (req, res, next) => {
        if (!req.session.user) {
          return res.redirect('/');
        }
  
        const userRole = req.session.user.tipo;
        
        // Check if user's role is included in allowedRoles
        if (allowedRoles.includes(userRole)) {
          next();
        } else {
          res.status(403).render('error', {
            message: 'No tienes permiso para acceder a esta página.'
          });
        }
      };
    }
  };