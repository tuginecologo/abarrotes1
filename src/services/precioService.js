const precioRepository = require('../repositories/precioRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // Get public products with pagination and search
  getPrecios: async (page, limit, search) => {
    return await precioRepository.getPrecios(page, limit, search);
  },

  // Get single public product
  getPrecioById: async (id) => {
    const producto = await precioRepository.getPrecioById(id);
    if (!producto) {
      throw new Error('Precio no encontrado');
    }
    return producto;
  },

  // Update product price
  updatePrecio: async (id, precio) => {
    if (isNaN(precio) || precio <= 0) {
      throw new Error('El precio debe ser un número positivo');
    }
    return await precioRepository.updatePrecio(id, precio);
  },

  // Get available products for public listing
  getAvailableProducts: async () => {
    return await precioRepository.getAvailableProducts();
  },

  // Create new public product
  createPrecio: async (productoData) => {
    if (!productoData.id_producto || !productoData.precio) {
      throw new Error('Datos incompletos');
    }
    return await precioRepository.createPrecio(
      productoData.id_producto,
      productoData.precio
    );
  },

//   // Delete public product
//   deleteProductoPublico: async (id) => {
//     return await productopublicoRepository.deleteProductoPublico(id);
//   },

// Export to Excel
exportToExcel: async () => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Precios');

  const { productos } = await precioRepository.getPrecios(1, 10000);

  worksheet.columns = [
    { header: 'ID Producto', key: 'id_producto', width: 15 },
    { header: 'Producto', key: 'nombre', width: 30 },
    { header: 'Marca', key: 'marca', width: 20 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Variante', key: 'variante', width: 20 },
    { header: 'Precio', key: 'precio', width: 15 }
  ];

  productos.forEach(producto => {
    worksheet.addRow(producto);
  });

  // Format price
  worksheet.eachRow((row) => {
    const precioCell = row.getCell('precio');
    if (precioCell.value) {
      precioCell.numFmt = '"S/"#,##0.00';
    }
  });

  const exportDir = path.join(__dirname, '../public/exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportPath = path.join(exportDir, 'precios.xlsx');
  await workbook.xlsx.writeFile(exportPath);

  return exportPath;
}
};