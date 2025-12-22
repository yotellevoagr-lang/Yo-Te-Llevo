#!/bin/bash

# --- Script para Sincronizar el Entorno Local desde GitHub ---
# Trae los cambios más recientes de la rama 'principal2' de GitHub.
# ADVERTENCIA: Este script descartará cualquier cambio local que no se haya subido.

# Carga las variables desde el archivo .env si existe
if [ -f ".env" ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Verifica si las credenciales están cargadas
if [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: Las variables GITHUB_USER y GITHUB_TOKEN no están definidas en tu archivo .env."
  echo "Asegúrate de que el archivo .env exista y contenga tus credenciales."
  exit 1
fi

echo "✅ Credenciales de GitHub encontradas en el archivo .env."
echo ""

# 2. Configura el nombre de la rama a 'principal2'.
BRANCH_NAME="principal2"
echo "--- Iniciando el proceso de sincronización desde GitHub en la rama: '$BRANCH_NAME' ---"
echo ""

# 3. Asegurarse de que el repositorio Git esté inicializado.
if [ ! -d ".git" ]; then
  echo "Paso 1: No se encontró repositorio Git. Inicializando uno nuevo..."
  git init
else
  echo "Paso 1: Repositorio Git encontrado."
fi

# 4. Conecta tu repositorio local con el de GitHub si no lo está.
echo "Paso 2: Verificando la conexión con el repositorio remoto..."
REMOTE_URL_WITH_CREDS="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
REMOTE_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"

if git remote | grep -q "origin"; then
    git remote set-url origin $REMOTE_URL_WITH_CREDS
    echo "El remoto 'origin' ya existía, URL actualizada con credenciales para esta operación."
else
    git remote add origin $REMOTE_URL_WITH_CREDS
    echo "¡Conectado al repositorio remoto en GitHub con credenciales!"
fi
echo ""

# 5. Descarga todos los datos del repositorio remoto sin fusionar.
echo "Paso 3: Descargando todos los datos del repositorio remoto (git fetch)..."
if ! git fetch origin; then
    echo "❌ Error al descargar datos de GitHub. Verifica la URL del repositorio y tus credenciales."
    # Limpia la URL para no dejar el token visible
    git remote set-url origin $REMOTE_URL
    exit 1
fi
echo "¡Datos descargados!"
echo ""

# 6. Cambia a la rama local, asegurándose de que rastree la rama remota.
echo "Paso 4: Cambiando a la rama '$BRANCH_NAME' y configurando seguimiento..."
git checkout -B $BRANCH_NAME "origin/$BRANCH_NAME"
echo ""

# 7. Restablece la rama local para que sea idéntica a la rama remota.
# Esto descarta todos los cambios locales.
echo "Paso 5: Restableciendo el entorno local para que coincida con GitHub (git reset --hard)..."
git reset --hard "origin/$BRANCH_NAME"
if [ $? -ne 0 ]; then
    echo "❌ Error al restablecer la rama. No se pudo sincronizar."
    git remote set-url origin $REMOTE_URL
    exit 1
fi
echo "¡Entorno local sincronizado!"
echo ""

# Limpia la URL remota para no dejar las credenciales guardadas en la configuración
git remote set-url origin $REMOTE_URL

echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
echo "¡Tu entorno local ahora es idéntico a la rama '$BRANCH_NAME' en GitHub!"
echo "⚠️  Recuerda que todos tus cambios locales que no estaban en GitHub han sido eliminados."
