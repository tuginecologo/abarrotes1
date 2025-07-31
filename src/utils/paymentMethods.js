// src/utils/paymentMethods.js
module.exports = {
    getMetodoPago: (codigo) => {
      switch(codigo) {
        case '1': return 'Efectivo';
        case '2': return 'Yape';
        case '3': return 'Plin';
        case '4': return 'Transferencia;'
        default: return 'Desconocido';
      }
    }
  };