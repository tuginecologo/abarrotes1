module.exports = {
    getTipoNombre: (tipo) => {
      const tipos = {
        '0': 'Total',
        '1': 'Administrador',
        '2': 'Ventas'
      };
      return tipos[tipo] || 'Desconocido';
    },
    
    getBadgeClass: (tipo) => {
      switch(tipo) {
        case '0': return 'badge-success';
        case '1': return 'badge-warning';
        case '2': return 'badge-info';
        default: return 'badge-secondary';
      }
    }
  };