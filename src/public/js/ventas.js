// public/js/ventas.js
function initializeVentas(productosData) {
    // Store products data for quick lookup
    window.productosData = productosData;
    window.agregarProductoPorBarcode = agregarProductoPorBarcode;
    window.actualizarTotal = actualizarTotal;
  
    // Mostrar campo de número de operación solo para métodos electrónicos
    document.getElementById('mediodepago').addEventListener('change', function() {
      const noperacionGroup = document.getElementById('noperacionGroup');
      noperacionGroup.style.display = (this.value === '2' || this.value === '3') ? 'block' : 'none';
    });
  
    // Focus on barcode input when page loads
    document.getElementById('barcodeInput').focus();
  
    // Handle barcode input (auto-submit on Enter or after scan)
    document.getElementById('barcodeInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        agregarProductoPorBarcode();
      }
    });
  
    // Handle manual add button click
    document.getElementById('agregarProducto').addEventListener('click', agregarProductoPorBarcode);
  
    function agregarProductoPorBarcode() {
      const barcodeInput = document.getElementById('barcodeInput');
      const cantidadInput = document.getElementById('barcodeCantidad');
      const barcode = barcodeInput.value.trim();
      
      if (!barcode) {
        alert('Ingrese un código de barras');
        return;
      }
  
      // Find product by barcode
      const producto = window.productosData[barcode];
      if (!producto) {
        alert('Producto no encontrado. Verifique el código de barras.');
        return;
      }
  
      const cantidad = parseInt(cantidadInput.value);
      const stock = parseInt(producto.stock);
  
      if (cantidad <= 0) {
        alert('La cantidad debe ser mayor a 0');
        return;
      }
  
      if (cantidad > stock) {
        alert(`No hay suficiente stock. Disponible: ${stock}`);
        return;
      }
  
      // Verificar si el producto ya está en la tabla
      const existingRow = document.querySelector(`#productosTable tr[data-id="${barcode}"]`);
      if (existingRow) {
        const existingCantidad = parseInt(existingRow.querySelector('.cantidad').textContent);
        const newCantidad = existingCantidad + cantidad;
        
        if (newCantidad > stock) {
          alert(`No hay suficiente stock para esta cantidad adicional. Disponible: ${stock - existingCantidad}`);
          return;
        }
        
        existingRow.querySelector('.cantidad').textContent = newCantidad;
        existingRow.querySelector('.subtotal').textContent = `S/ ${(producto.precio * newCantidad).toFixed(2)}`;
      } else {
        // Add new row
        const tbody = document.querySelector('#productosTable tbody');
        const row = document.createElement('tr');
        row.dataset.id = barcode;
        
        row.innerHTML = `
          <td>${producto.nombre} ${producto.variante ? ' - ' + producto.variante : ''}</td>
          <td class="precio">S/ ${producto.precio.toFixed(2)}</td>
          <td class="cantidad">${cantidad}</td>
          <td class="subtotal">S/ ${(producto.precio * cantidad).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-danger eliminar-producto">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
        
        tbody.appendChild(row);
      }
  
      // Actualizar total
      actualizarTotal();
  
      // Limpiar inputs
      barcodeInput.value = '';
      cantidadInput.value = 1;
      barcodeInput.focus();
    }
  
    // Manejar eliminar productos
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('eliminar-producto') || e.target.closest('.eliminar-producto')) {
        e.target.closest('tr').remove();
        actualizarTotal();
      }
    });
  
    // Actualizar total
    function actualizarTotal() {
      const subtotals = Array.from(document.querySelectorAll('.subtotal')).map(el => {
        return parseFloat(el.textContent.replace('S/ ', ''));
      });
      
      const total = subtotals.reduce((sum, current) => sum + current, 0);
      document.getElementById('totalVenta').textContent = `S/ ${total.toFixed(2)}`;
      
      // Update hidden input with cart data
      const productos = Array.from(document.querySelectorAll('#productosTable tbody tr')).map(row => {
        return {
          id_producto: row.dataset.id,
          nombre: row.querySelector('td:first-child').textContent,
          cantidad: parseInt(row.querySelector('.cantidad').textContent),
          precio: parseFloat(row.querySelector('.precio').textContent.replace('S/ ', ''))
        };
      });
      
      document.getElementById('productosInput').value = JSON.stringify(productos);
    }
  
    // Preparar datos antes de enviar el formulario
    document.getElementById('ventaForm').addEventListener('submit', function(e) {
      const productos = Array.from(document.querySelectorAll('#productosTable tbody tr')).map(row => {
        return {
          id_producto: row.dataset.id,
          nombre: row.querySelector('td:first-child').textContent,
          cantidad: parseInt(row.querySelector('.cantidad').textContent),
          precio: parseFloat(row.querySelector('.precio').textContent.replace('S/ ', ''))
        };
      });
  
      if (productos.length === 0) {
        e.preventDefault();
        alert('Debe agregar al menos un producto');
        return;
      }
  
      document.getElementById('productosInput').value = JSON.stringify(productos);
    });
  
    document.getElementById('refreshStock').addEventListener('click', async function() {
      const response = await fetch('/ventas/nueva');
      window.location.reload();
    });
  }