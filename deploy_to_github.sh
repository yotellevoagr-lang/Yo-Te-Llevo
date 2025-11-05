#!/bin/bash

# --- Script para Subir Cambios a GitHub ---
# Este script añade todos los cambios actuales, crea un commit
# y lo sube a la rama especificada en GitHub, preservando el historial.

# --- CONFIGURACIÓN ---
# Reemplaza esto con la URL de tu repositorio de GitHub.
GITHUB_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
BRANCH_NAME="principal2" # Puedes cambiar esto a la rama que prefieras

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

# 2. Conecta tu repositorio local con el de GitHub y descarga cambios.
echo "Paso 2: Verificando la conexión con el repositorio remoto..."
if git remote | grep -q "origin"; then
    git remote set-url origin $GITHUB_URL
    echo "El remoto 'origin' ya existía, URL actualizada si fue necesario."
else
    git remote add origin $GITHUB_URL
    echo "¡Conectado al repositorio remoto en GitHub!"
fi
echo ""

# Sincroniza con la rama remota antes de hacer cualquier cambio.
echo "Paso 2.5: Descargando cambios remotos..."
git pull origin $BRANCH_NAME --rebase
if [ $? -ne 0 ]; then
    echo "⚠️  Error al hacer 'git pull'. Puede haber conflictos que necesites resolver manualmente."
    exit 1
fi
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

git commit -m "$COMMIT_MESSAGE"
# Verificamos si el commit se creó o si no había nada que commitear.
if [ $? -eq 0 ]; then
  echo "¡Commit creado exitosamente!"
else
  echo "No se encontraron cambios para commitear. Sincronizando con el repositorio remoto..."
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
