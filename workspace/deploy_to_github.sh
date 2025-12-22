#!/bin/bash

# --- Script para Subir Cambios a GitHub (Versión Robusta) ---
# Sube los cambios locales, forzando la actualización en la rama remota.

# --- CONFIGURACIÓN ---
ENV_FILE="src/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: No se encontró el archivo de secretos en '$ENV_FILE'."
  exit 1
fi

# Carga las variables de entorno desde el archivo
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Verifica que las credenciales se hayan cargado
if [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_USER o GITHUB_TOKEN no están definidas en '$ENV_FILE'."
  exit 1
fi

BRANCH_NAME="principal2"
REMOTE_NAME="origin-deploy"
REMOTE_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"

echo "--- Iniciando despliegue a GitHub en la rama '$BRANCH_NAME' ---"
echo ""

# 1. Configurar un remoto temporal con las credenciales
echo "Paso 1: Configurando remoto temporal para el despliegue..."
# Elimina el remoto si ya existe para evitar errores
git remote remove $REMOTE_NAME 2>/dev/null
git remote add $REMOTE_NAME "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
echo "✅ Remoto temporal '$REMOTE_NAME' configurado."
echo ""

# 2. Preparar los cambios para subir
echo "Paso 2: Añadiendo todos los cambios..."
git add .
echo ""

# 3. Crear un commit (si hay cambios)
echo "Paso 3: Creando commit..."
# Comprueba si hay algo para commitear. Si no, solo lo informa.
if git diff-index --quiet HEAD --; then
    echo "ℹ️ No hay nuevos cambios para commitear."
else
    git commit -m "Despliegue automático de cambios"
    echo "✅ Commit creado."
fi
echo ""

# 4. Subir los cambios forzando la actualización
echo "Paso 4: Subiendo cambios a GitHub..."
if git push --force $REMOTE_NAME "HEAD:$BRANCH_NAME"; then
  echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
  echo "Tus cambios han sido subidos a GitHub en la rama '$BRANCH_NAME'."
else
  echo "❌ Error al subir los cambios a GitHub. Revisa los mensajes de error."
fi

# 5. Limpiar el remoto temporal por seguridad
git remote remove $REMOTE_NAME
echo "✅ Remoto temporal limpiado."
