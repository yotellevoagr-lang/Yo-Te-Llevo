#!/bin/bash

# --- Script para Borrar una Rama Localmente y en GitHub ---

# Verifica si se proporcionó un nombre de rama como argumento.
if [ -z "$1" ]; then
  echo "❌ Error: No se especificó un nombre de rama."
  echo "Uso: ./delete_branch.sh <nombre_de_la_rama_a_borrar>"
  exit 1
fi

BRANCH_TO_DELETE=$1

echo "--- Iniciando el proceso para borrar la rama: $BRANCH_TO_DELETE ---"

# 1. Borra la rama localmente.
# Usamos -D para forzar el borrado incluso si no está fusionada.
echo "Paso 1: Borrando la rama localmente..."
git branch -D $BRANCH_TO_DELETE
if [ $? -eq 0 ]; then
  echo "✅ Rama local '$BRANCH_TO_DELETE' borrada exitosamente."
else
  echo "⚠️  No se encontró la rama local '$BRANCH_TO_DELETE' o ya fue borrada."
fi
echo ""

# 2. Borra la rama remota (en GitHub).
echo "Paso 2: Borrando la rama en el repositorio remoto (GitHub)..."
git push origin --delete $BRANCH_TO_DELETE
if [ $? -eq 0 ]; then
  echo "✅ Rama remota '$BRANCH_TO_DELETE' borrada exitosamente de GitHub."
else
  echo "⚠️  Error al borrar la rama remota. Puede que no exista en GitHub o que no tengas permisos."
fi
echo ""

echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
