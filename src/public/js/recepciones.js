// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get all required elements
    const compraSelect = document.getElementById('id_compra');
    const productoDisplay = document.getElementById('producto-display');
    const proveedorDisplay = document.getElementById('proveedor-display');
    const cantidadInput = document.getElementById('cantidad');
    const maxCantidadSpan = document.getElementById('max-cantidad');
    const recepcionForm = document.getElementById('recepcionForm');
  
    // Only proceed if all elements exist
    if (compraSelect && productoDisplay && proveedorDisplay && cantidadInput && maxCantidadSpan && recepcionForm) {
      // Handle compra selection changes
      compraSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        
        if (selectedOption.value) {
          productoDisplay.value = selectedOption.dataset.producto || '';
          proveedorDisplay.value = selectedOption.dataset.proveedor || '';
          cantidadInput.max = selectedOption.dataset.cantidad || '';
          maxCantidadSpan.textContent = selectedOption.dataset.cantidad || '0';
        } else {
          productoDisplay.value = '';
          proveedorDisplay.value = '';
          cantidadInput.max = '';
          maxCantidadSpan.textContent = '0';
        }
      });
  
      // Handle form submission
      recepcionForm.addEventListener('submit', function(e) {
        const cantidad = parseInt(cantidadInput.value);
        const maxCantidad = parseInt(cantidadInput.max);
        
        if (cantidad > maxCantidad) {
          e.preventDefault();
          alert(`La cantidad no puede exceder ${maxCantidad}`);
          return false;
        }
      });
    }
  });