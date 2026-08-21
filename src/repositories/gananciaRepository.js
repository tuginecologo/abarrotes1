const pool = require('../config/database');

module.exports = {
  getMonthlyEarnings: async () => {
    const [rows] = await pool.query(`
      SELECT 
        ym,
        SUM(ventas) as total_ventas,
        SUM(compras) as total_compras,
        SUM(credito_ventas) as total_credito_ventas,
        SUM(pagos_credito) as total_pagos_credito
      FROM (
        SELECT DATE_FORMAT(v.fecha, '%Y-%m') as ym, 
               m.total as ventas, 
               0 as compras,
               CASE WHEN v.mediodepago = '6' THEN m.total ELSE 0 END as credito_ventas,
               0 as pagos_credito
        FROM venta v
        JOIN monto_venta m ON v.id_venta = m.id_venta
        UNION ALL
        SELECT DATE_FORMAT(c.fecha, '%Y-%m') as ym,
               0 as ventas,
               (c.cantidad * c.preciounitario) as compras,
               0 as credito_ventas,
               0 as pagos_credito
        FROM compra c
        UNION ALL
        SELECT DATE_FORMAT(p.fecha_pago, '%Y-%m') as ym,
               0 as ventas,
               0 as compras,
               0 as credito_ventas,
               p.monto_pago as pagos_credito
        FROM pagos_cliente p
      ) t
      GROUP BY ym
      ORDER BY ym DESC
    `);
    return rows;
  }
};