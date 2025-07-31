const pool = require('../config/database'); // Add this import at the top
const stockRepository = require('../repositories/stockRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // In stockService.js - add this method
initializeStock: async () => {
  const connection = await pool.getConnection();
  try {
      await connection.beginTransaction();
      
      // Clear existing stock
      await connection.query('TRUNCATE TABLE stock');
      
      // Initialize from recepcion records
      await connection.query(
          `INSERT INTO stock (id_producto, cantidad)
           SELECT id_producto, SUM(cantidad) 
           FROM recepcion 
           GROUP BY id_producto`
      );
      
      await connection.commit();
  } catch (err) {
      await connection.rollback();
      throw err;
  } finally {
      connection.release();
  }
},
  // Get stock with pagination and search
  getStock: async (page, limit, search) => {
    return await stockRepository.getStock(page, limit, search);
  },

  // Update stock (add or remove quantity)
  updateStock: async (id_producto, cantidad, operation = 'add', { connection } = {}) => {
    const conn = connection || await pool.getConnection();
    let shouldRelease = !connection;
    
    try {
        if (!connection) await conn.beginTransaction();

        // For removals, check current stock first
        if (operation === 'remove') {
            const [current] = await conn.query(
                'SELECT cantidad FROM stock WHERE id_producto = ?',
                [id_producto]
            );
            
            if (current.length === 0 || current[0].cantidad < cantidad) {
                throw new Error(`Insufficient stock for product ${id_producto}`);
            }
        }

        // Update existing record
        const updateResult = await conn.query(
            `UPDATE stock SET cantidad = cantidad ${operation === 'add' ? '+' : '-'} ? 
             WHERE id_producto = ?`,
            [cantidad, id_producto]
        );
        
        // Insert new record if needed (only for additions)
        if (updateResult[0].affectedRows === 0 && operation === 'add') {
            await conn.query(
                'INSERT INTO stock (id_producto, cantidad) VALUES (?, ?)',
                [id_producto, cantidad]
            );
        }

        if (!connection) await conn.commit();
    } catch (err) {
        if (!connection) await conn.rollback();
        throw err;
    } finally {
        if (shouldRelease) conn.release();
    }
},

  // Get stock by product ID (returns total quantity)
  getStockByProducto: async (id_producto) => {
    return await stockRepository.getStockByProducto(id_producto);
  },

  exportToExcel: async () => {
    // const excel = require('exceljs');
    // const path = require('path');
    // const fs = require('fs');
    
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Stock');
  
    const stock = await stockRepository.getAllStock();
  
    worksheet.columns = [
      { header: 'ID Producto', key: 'id_producto', width: 15 },
      { header: 'Producto', key: 'producto_nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Variante', key: 'variante', width: 20 },
      { header: 'Cantidad', key: 'cantidad', width: 15 },
      { header: 'Precio (S/)', key: 'precio_publico', width: 15 },
    ];
  
    stock.forEach(item => {
      worksheet.addRow(item);
    });

    // Format price column
    worksheet.eachRow((row) => {
      const precioCell = row.getCell('precio_publico');
      if (precioCell.value) {
        precioCell.numFmt = '"S/"#,##0.00';
      }
    });
  
    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
  
    const exportPath = path.join(exportDir, 'stock.xlsx');
    await workbook.xlsx.writeFile(exportPath);
  
    return exportPath;
  }
};
