const clienteRepository = require('../repositories/clienteRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  getClientes: async (page, limit, search) => {
    return await clienteRepository.getClientes(page, limit, search);
  },

  getClienteById: async (id) => {
    const cliente = await clienteRepository.getClienteById(id);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    return cliente;
  },

  createCliente: async (clienteData) => {
    return await clienteRepository.createCliente(
      clienteData.nombres,
      clienteData.apellidos,
      clienteData.sexo
    );
  },

  updateCliente: async (id, clienteData) => {
    return await clienteRepository.updateCliente(
      id,
      clienteData.nombres,
      clienteData.apellidos,
      clienteData.sexo
    );
  },

  deleteCliente: async (id) => {
    return await clienteRepository.deleteCliente(id);
  },

  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Clientes');
    const clientes = await clienteRepository.getAllClientes();
    worksheet.columns = [
      { header: 'ID', key: 'id_cliente', width: 10 },
      { header: 'Nombres', key: 'nombres', width: 30 },
      { header: 'Apellidos', key: 'apellidos', width: 30 },
      { header: 'Sexo', key: 'sexo', width: 10 }
    ];
    clientes.forEach(cliente => worksheet.addRow(cliente));

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    const exportPath = path.join(exportDir, 'clientes.xlsx');
    await workbook.xlsx.writeFile(exportPath);
    return exportPath;
  }
};