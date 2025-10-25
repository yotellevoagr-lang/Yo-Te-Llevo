#!/bin/bash

# Este script reiniciará tu repositorio de Git localmente para limpiarlo
# de archivos grandes y luego lo subirá a GitHub.

# --- CONFIGURACIÓN ---
# Reemplaza esto con la URL de tu repositorio de GitHub.
GITHUB_URL="https://github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
BRANCH_NAME="principal1"

echo "--- Iniciando el proceso de despliegue a GitHub ---"

# 1. Elimina el historial de Git antiguo y problemático.
echo "Paso 1: Eliminando el historial de Git anterior (.git)..."
rm -rf .git
echo "¡Historial anterior eliminado!"
echo ""

# 2. Inicializa un nuevo repositorio de Git, limpio.
echo "Paso 2: Creando un nuevo repositorio de Git..."
git init
git branch -M $BRANCH_NAME
echo "¡Nuevo repositorio inicializado en la rama '$BRANCH_NAME'!"
echo ""

# 3. Añade todos los archivos al nuevo repositorio.
# El archivo .gitignore se asegurará de que los archivos grandes no se incluyan.
echo "Paso 3: Añadiendo todos los archivos del proyecto..."
git add .
echo "¡Archivos añadidos!"
echo ""

# 4. Crea el primer commit (la primera "foto" de tu código).
echo "Paso 4: Creando el primer commit..."
git commit -m "Reinicio de historial y subida inicial del proyecto"
echo "¡Commit creado exitosamente!"
echo ""

# 5. Conecta tu repositorio local con el de GitHub.
echo "Paso 5: Conectando con el repositorio remoto en GitHub..."
# Primero, verificamos si el remoto 'origin' ya existe para evitar errores.
if git remote | grep -q "origin"; then
    git remote set-url origin $GITHUB_URL
else
    git remote add origin $GITHUB_URL
fi
echo "¡Conectado a $GITHUB_URL!"
echo ""

# 6. Sube todo tu código a GitHub.
# Usamos '--force' porque estamos reescribiendo la historia de la rama.
echo "Paso 6: Subiendo el código a la rama '$BRANCH_NAME' en GitHub..."
git push --force -u origin $BRANCH_NAME
echo ""

echo "🎉 --- ¡PROCESO COMPLETADO! --- 🎉"
echo "Tu código ha sido subido a GitHub. Revisa tu repositorio para confirmarlo."
