#!/bin/bash

# --- Script para Subir Cambios a GitHub ---
# Este script añade todos los cambios actuales, crea un commit
# y lo sube a la rama especificada en GitHub, preservando el historial.

# --- CONFIGURACIÓN ---
# Carga las variables desde el archivo .env.local
ENV_FILE="src/.env.local"
if [ -f "$ENV_FILE" ]; then
  export $(cat "$ENV_FILE" | sed 's/#.*//g' | xargs)
  echo "✅ Credenciales cargadas desde $ENV_FILE"
else
  echo "⚠️  Advertencia: No se encontró el archivo $ENV_FILE. El script podría fallar si las credenciales no están configuradas de otra manera."
fi

# Verifica si las credenciales están cargadas
if [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: Las variables GITHUB_USER y GITHUB_TOKEN no están definidas en tu archivo $ENV_FILE."
  echo "Asegúrate de que el archivo exista y contenga tus credenciales."
  exit 1
fi

# Reemplaza esto con la URL de tu repositorio de GitHub.
GITHUB_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
BRANCH_NAME="principal2"

echo "--- Iniciando el proceso de despliegue a GitHub en la rama '$BRANCH_NAME' ---"
echo ""

# 1. Asegurarse de que el repositorio Git esté inicializado y conectado.
if [ ! -d ".git" ]; then
  echo "Paso 1: No se encontró repositorio Git. Inicializando uno nuevo..."
  git init
  git branch -M $BRANCH_NAME
else
  echo "Paso 1: Repositorio Git encontrado."
  git checkout -B $BRANCH_NAME
fi
echo ""

# 2. Conecta tu repositorio local con el de GitHub.
echo "Paso 2: Verificando la conexión con el repositorio remoto..."
if git remote | grep -q "origin"; then
    git remote set-url origin $GITHUB_URL
    echo "El remoto 'origin' ya existía, URL actualizada si fue necesario."
else
    git remote add origin $GITHUB_URL
    echo "¡Conectado al repositorio remoto en GitHub!"
fi
echo ""

# 2.5 Guardar cambios locales temporalmente
echo "Paso 2.5: Guardando cambios locales temporalmente..."
git stash
echo ""

# 2.6 Sincroniza con la rama remota.
echo "Paso 2.6: Descargando cambios remotos..."
git pull origin $BRANCH_NAME --rebase
if [ $? -ne 0 ]; then
    echo "⚠️  Error al hacer 'git pull'. Puede haber conflictos que necesites resolver manualmente."
    git stash pop # Intenta recuperar los cambios guardados
    exit 1
fi
echo ""

# 2.7 Vuelve a aplicar los cambios locales
echo "Paso 2.7: Aplicando cambios locales guardados..."
git stash pop
echo ""

# 3. Añade todos los archivos modificados y nuevos al área de preparación.
echo "Paso 3: Añadiendo todos los cambios al área de preparación (git add .)..."
git add .
echo "¡Archivos añadidos!"
echo ""

# 4. Pide un mensaje para el commit y crea el commit.
echo "Paso 4: Creando un nuevo commit..."
echo "Por favor, introduce un mensaje para este commit (o presiona Enter para usar uno por defecto):"
read COMMIT_MESSAGE

# Si el mensaje está vacío, usamos uno por defecto.
if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="Actualización de archivos y funcionalidades"
fi

# Usamos --allow-empty para asegurarnos de que el commit se cree incluso si no hay cambios,
# lo que es útil si el único cambio fue descartado por el stash.
git commit --allow-empty -m "$COMMIT_MESSAGE"
if [ $? -ne 0 ]; then
  echo "No se encontraron cambios nuevos para commitear. Verificando historial..."
fi
echo ""

# 5. Sube todos los commits a GitHub.
echo "Paso 5: Subiendo los cambios a la rama '$BRANCH_NAME' en GitHub..."
git push -u origin $BRANCH_NAME
if [ $? -ne 0 ]; then
    echo "❌ Error al subir los cambios a GitHub. Revisa los mensajes de error anteriores."
    exit 1
fi
echo ""

echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
echo "Tus cambios han sido subidos a GitHub. Revisa tu repositorio para confirmarlo."
