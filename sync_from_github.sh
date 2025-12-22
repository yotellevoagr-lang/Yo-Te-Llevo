#!/bin/bash

# --- Script para Sincronizar el Entorno Local desde GitHub ---
# Trae los cambios más recientes de la rama 'principal2' de GitHub.
# ADVERTENCIA: Este script descartará cualquier cambio local que no se haya subido.

# 1. Verifica si las credenciales ya están guardadas en la configuración de Git.
GITHUB_USERNAME=$(git config --local user.name)
GITHUB_TOKEN=$(git config --local user.token)

if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "--- Configuración de Credenciales de GitHub (se guardarán localmente) ---"
  read -p "Introduce tu nombre de usuario de GitHub: " GITHUB_USERNAME_INPUT
  read -sp "Introduce tu Token de Acceso Personal (no se mostrará): " GITHUB_TOKEN_INPUT
  echo "" # Nueva línea después de la entrada de la contraseña.
  echo ""

  # Verifica que las credenciales no estén vacías.
  if [ -z "$GITHUB_USERNAME_INPUT" ] || [ -z "$GITHUB_TOKEN_INPUT" ]; then
    echo "❌ Error: El nombre de usuario y el token son obligatorios."
    exit 1
  fi
  
  # Guarda las credenciales en la configuración local de Git para uso futuro.
  git config --local user.name "$GITHUB_USERNAME_INPUT"
  git config --local user.token "$GITHUB_TOKEN_INPUT"
  
  # Asigna las credenciales recién ingresadas para la ejecución actual.
  GITHUB_USERNAME=$GITHUB_USERNAME_INPUT
  GITHUB_TOKEN=$GITHUB_TOKEN_INPUT
  echo "✅ ¡Credenciales guardadas de forma segura en la configuración local de Git!"
  echo ""
else
  echo "✅ Credenciales de GitHub encontradas en la configuración local de Git."
  echo ""
fi

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
REMOTE_URL_WITH_CREDS="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/yotellevoagr-lang/Yo-Te-Llevo.git"
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
