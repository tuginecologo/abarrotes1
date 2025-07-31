const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure storage for product images
const productStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/productos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const id = req.params.id || Date.now(); // Use ID if available, otherwise timestamp
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${id}${ext}`);
  }
});

// Configure storage for employee images
const employeeStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/empleados');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const dni = req.params.dni || Date.now(); // Use DNI if available, otherwise timestamp
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `empleado_${dni}${ext}`);
  }
});

const uploadProductImage = multer({ 
  storage: productStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadEmployeeImage = multer({ 
  storage: employeeStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = {
  uploadProductImage,
  uploadEmployeeImage
};