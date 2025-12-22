#!/bin/bash

# --- Script para Subir Cambios a GitHub (Versión Robusta) ---
# Sube los cambios locales, forzando la actualización en la rama remota.

BRANCH_NAME="principal2"
REMOTE_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"

echo "--- Iniciando despliegue a GitHub en la rama '$BRANCH_NAME' ---"
echo ""

# 1. Asegurarse de que el repositorio Git esté inicializado y configurado.
echo "Paso 1: Configurando repositorio remoto..."
if git remote | grep -q "origin"; then
    git remote set-url origin $REMOTE_URL
else
    git remote add origin $REMOTE_URL
fi
echo "✅ Remoto 'origin' configurado."
echo ""

# 2. Preparar los cambios para subir
echo "Paso 2: Añadiendo todos los cambios..."
git add .
echo ""

# 3. Crear un commit (si hay cambios)
echo "Paso 3: Creando commit..."
if git diff-index --quiet HEAD --; then
    echo "ℹ️ No hay nuevos cambios para commitear."
else
    git commit -m "Despliegue automático de cambios"
    echo "✅ Commit creado."
fi
echo ""

# 4. Subir los cambios forzando la actualización
echo "Paso 4: Subiendo cambios a GitHub..."
echo "ℹ️ Si se te solicita, sigue las instrucciones para autenticarte con GitHub."

if git push --force origin "HEAD:$BRANCH_NAME"; then
  echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
  echo "Tus cambios han sido subidos a GitHub en la rama '$BRANCH_NAME'."
else
  echo "❌ Error al subir los cambios a GitHub. Revisa los mensajes de error."
fi
