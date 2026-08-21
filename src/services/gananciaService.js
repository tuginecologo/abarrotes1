const gananciaRepository = require('../repositories/gananciaRepository');

module.exports = {
  getMonthlyEarnings: async () => {
    const rows = await gananciaRepository.getMonthlyEarnings();
    return rows.map(row => ({
      mes: row.ym,
      total_ventas: Number(row.total_ventas) || 0,
      total_compras: Number(row.total_compras) || 0,
      total_credito_ventas: Number(row.total_credito_ventas) || 0,
      total_pagos_credito: Number(row.total_pagos_credito) || 0,
      ganancia_neta: (Number(row.total_ventas) || 0) 
                    - (Number(row.total_compras) || 0) 
                    - (Number(row.total_credito_ventas) || 0) 
                    + (Number(row.total_pagos_credito) || 0)
    }));
  }
};