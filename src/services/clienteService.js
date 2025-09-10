const clienteRepository = require('../repositories/clienteRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // Get clients with pagination and search
  getClientes: async (page, limit, search) => {
    return await clienteRepository.getClientes(page, limit, search);
  },

  // Get single client by DNI
  getClienteByDni: async (dni) => {
    const cliente = await clienteRepository.getClienteByDni(dni);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    return cliente;
  },

  // Create new client
  createCliente: async (clienteData) => {
    return await clienteRepository.createCliente(
      clienteData.dni,
      clienteData.nombres,
      clienteData.apellidos,
      clienteData.sexo
    );
  },

  // Update client
  updateCliente: async (dni, clienteData) => {
    return await clienteRepository.updateCliente(
      dni,
      clienteData.nombres,
      clienteData.apellidos,
      clienteData.sexo
    );
  },

  // Delete client
  deleteCliente: async (dni) => {
    return await clienteRepository.deleteCliente(dni);
  },

  // Bulk delete clients
  // bulkDeleteClientes: async (dnis) => {
  //   if (!dnis || dnis.length === 0) {
  //     throw new Error('No se proporcionaron DNIs de clientes');
  //   }
  //   return await clienteRepository.bulkDeleteClientes(dnis);
  // },

  // Export to Excel
  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Clientes');

    const clientes = await clienteRepository.getAllClientes();

    worksheet.columns = [
      { header: 'DNI', key: 'dni', width: 15 },
      { header: 'Nombres', key: 'nombres', width: 30 },
      { header: 'Apellidos', key: 'apellidos', width: 30 },
      { header: 'Sexo', key: 'sexo', width: 10 }
    ];

    clientes.forEach(cliente => {
      worksheet.addRow(cliente);
    });

    // Format date
    // worksheet.eachRow((row) => {
    //   const fechaCell = row.getCell('fecnac');
    //   if (fechaCell.value) {
    //     fechaCell.numFmt = 'dd/mm/yyyy';
    //   }
    // });

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'clientes.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  }
};