#!/bin/bash

# --- Script para Subir Cambios a GitHub ---
# Pide credenciales interactivamente y sube los cambios a una nueva rama
# para evitar conflictos con ramas protegidas.

# 1. Pide las credenciales al usuario de forma segura.
echo "--- Configuración de Credenciales de GitHub ---"
read -p "Introduce tu nombre de usuario de GitHub: " GITHUB_USERNAME
read -sp "Introduce tu Token de Acceso Personal (no se mostrará): " GITHUB_TOKEN
echo ""
echo ""

# Verifica que las credenciales no estén vacías.
if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: El nombre de usuario y el token son obligatorios."
  exit 1
fi

# 2. Configura el nombre de la nueva rama.
# Usa la fecha y hora para garantizar que sea un nombre único.
BRANCH_NAME="update-$(date +'%Y-%m-%d-%H%M%S')"
echo "--- Iniciando el proceso de despliegue a GitHub en la nueva rama: '$BRANCH_NAME' ---"
echo ""

# 3. Asegurarse de que el repositorio Git esté inicializado.
if [ ! -d ".git" ]; then
  echo "Paso 1: No se encontró repositorio Git. Inicializando uno nuevo..."
  git init
else
  echo "Paso 1: Repositorio Git encontrado."
fi
git checkout -B $BRANCH_NAME
echo ""

# 4. Conecta tu repositorio local con el de GitHub usando la URL estándar.
echo "Paso 2: Verificando la conexión con el repositorio remoto..."
REMOTE_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
if git remote | grep -q "origin"; then
    git remote set-url origin $REMOTE_URL
    echo "El remoto 'origin' ya existía, URL actualizada."
else
    git remote add origin $REMOTE_URL
    echo "¡Conectado al repositorio remoto en GitHub!"
fi
echo ""

# 5. Añade todos los archivos modificados y nuevos al área de preparación.
echo "Paso 3: Añadiendo todos los cambios al área de preparación (git add .)..."
git add .
echo "¡Archivos añadidos!"
echo ""

# 6. Pide un mensaje para el commit y crea el commit.
echo "Paso 4: Creando un nuevo commit..."
read -p "Por favor, introduce un mensaje para este commit (o presiona Enter para usar 'Actualización de archivos'): " COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="Actualización de archivos y funcionalidades"
fi

# Verifica si hay algo que commitear antes de intentarlo.
if git diff-index --quiet HEAD --; then
    echo "No se encontraron cambios para commitear. No se subirá nada."
    echo ""
    echo "🎉 --- ¡PROCESO COMPLETADO (SIN CAMBIOS)! --- 🎉"
    exit 0
fi

git commit -m "$COMMIT_MESSAGE"
echo "¡Commit creado exitosamente!"
echo ""

# 7. Sube todos los commits a la NUEVA rama en GitHub.
# Construye la URL con las credenciales solo para el comando PUSH.
echo "Paso 5: Subiendo los cambios a la rama '$BRANCH_NAME' en GitHub..."
PUSH_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/yotellevoagr-lang/Yo-Te-Llevo.git"

if ! git push -u "$PUSH_URL" "$BRANCH_NAME"; then
    echo "❌ Error al subir los cambios a GitHub. Revisa los mensajes de error anteriores y verifica tus credenciales."
    exit 1
fi
echo ""

# 8. Proporciona el enlace para crear el Pull Request.
echo "Paso 6: ¡Tus cambios están en una nueva rama! Ahora crea un Pull Request."
echo "Copia y pega el siguiente enlace en tu navegador para fusionar tus cambios:"
echo ""
echo "🔗  https://github.com/yotellevoagr-lang/Yo-Te-Llevo/pull/new/$BRANCH_NAME"
echo ""

echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
echo "Sigue el enlace de arriba para finalizar la integración de tus cambios."
