#!/bin/bash

# --- Script para Sincronizar el Entorno Local desde GitHub ---
# Trae los cambios más recientes de la rama 'principal2' de GitHub.
# ADVERTENCIA: Este script descartará cualquier cambio local que no se haya subido.

BRANCH_NAME="principal2"
REMOTE_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"

echo "--- Iniciando sincronización desde GitHub en la rama '$BRANCH_NAME' ---"
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

# 2. Descarga todos los datos del repositorio remoto sin fusionar.
echo "Paso 2: Descargando todos los datos del repositorio remoto (git fetch)..."
echo "ℹ️ Si se te solicita, sigue las instrucciones para autenticarte con GitHub."
if ! git fetch origin; then
    echo "❌ Error al descargar datos de GitHub. Verifica tu conexión."
    exit 1
fi
echo "¡Datos descargados!"
echo ""

# 3. Cambia a la rama local, asegurándose de que rastree la rama remota.
echo "Paso 3: Cambiando a la rama '$BRANCH_NAME'..."
git checkout -B $BRANCH_NAME "origin/$BRANCH_NAME"
echo ""

# 4. Restablece la rama local para que sea idéntica a la rama remota.
echo "Paso 4: Restableciendo el entorno local para que coincida con GitHub (git reset --hard)..."
git reset --hard "origin/$BRANCH_NAME"
if [ $? -ne 0 ]; then
    echo "❌ Error al restablecer la rama. No se pudo sincronizar."
    exit 1
fi
echo "¡Entorno local sincronizado!"
echo ""

echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
echo "Tu entorno local ahora es idéntico a la rama '$BRANCH_NAME' en GitHub."
echo "⚠️  Recuerda que todos tus cambios locales que no estaban en GitHub han sido eliminados."
