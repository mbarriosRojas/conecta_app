#!/bin/bash

echo "🧹 Limpiando cachés y builds anteriores..."

# Eliminar cachés de Angular
rm -rf .angular

# Eliminar build anterior
rm -rf www

echo "✅ Limpieza completada"
echo ""
echo "🚀 Iniciando servidor de desarrollo..."
echo ""

# Iniciar ionic serve
ionic serve --port=8100

