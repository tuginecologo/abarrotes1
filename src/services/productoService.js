// src/services/productoService.js
const productoRepository = require('../repositories/productoRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/database');

module.exports = {
  // Get products with pagination and search
  getProducts: async (page, limit, search) => {
    const { rows, total } = await productoRepository.getProducts(page, limit, search);
    return {
      products: rows,
      totalPages: Math.ceil(total / limit)
    };
  },

  // productoService.js - agregar después de getProducts
// productoService.js
getProductByIdExacto: async (id, page, limit) => {
  const { rows, total } = await productoRepository.getProductByIdExacto(id, page, limit);
  return {
    products: rows,
    totalPages: Math.ceil(total / limit)
  };
},

  // Get single product
  getProductById: async (id) => {
    return await productoRepository.getProductById(id);
  },

  // Create new product
  createProduct: async (productData) => {
    return await productoRepository.createProduct(productData);
  },

  // Update product
  updateProduct: async (id, productData) => {
    await productoRepository.updateProduct(id, productData);
  },

  // Delete product
  deleteProduct: async function(id) {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    // Check for references in compra table
    const [compraReferences] = await pool.query(
      'SELECT COUNT(*) as count FROM compra WHERE id_producto = ?',
      [id]
    );

    if (compraReferences[0].count > 0) {
      throw new Error('No se puede eliminar: El producto tiene registros de compra asociados');
    }

    await productoRepository.deleteProduct(id);
  },

  // Bulk delete products
  // bulkDeleteProducts: async function(ids) {
  //   const idArray = Array.isArray(ids) ? ids : [ids];
  //   const results = [];
  //
  //   for (const id of idArray) {
  //     try {
  //       await this.deleteProduct(id);
  //       results.push({ id, success: true });
  //     } catch (err) {
  //       results.push({
  //         id,
  //         success: false,
  //         error: err.message.includes('registros asociados')
  //           ? err.message
  //           : 'Error al eliminar producto'
  //       });
  //     }
  //   }
  //
  //   return results;
  // },

  // productoService.js - Add these methods

// Image methods
getProductImages: async (idProducto) => {
  return await productoRepository.getProductImages(idProducto);
},

addProductImage: async (idProducto, imagePath) => {
  return await productoRepository.addProductImage(idProducto, imagePath);
},

deleteProductImage: async (idImagen) => {
  await productoRepository.deleteProductImage(idImagen);
},

// Video methods
getProductVideos: async (idProducto) => {
  return await productoRepository.getProductVideos(idProducto);
},

addProductVideo: async (idProducto, videoUrl) => {
  return await productoRepository.addProductVideo(idProducto, videoUrl);
},

deleteProductVideo: async (idVideo) => {
  await productoRepository.deleteProductVideo(idVideo);
},

  // Export to Excel
  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Productos');

    const [products] = await pool.query('SELECT * FROM producto');

    worksheet.columns = [
      { header: 'ID', key: 'id_producto', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Marca', key: 'marca', width: 20 },
      { header: 'Variante', key: 'variante', width: 20 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Fecha Registro', key: 'fecha', width: 15 }
    ];

    products.forEach(product => {
      worksheet.addRow(product);
    });

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'productos.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  }
};