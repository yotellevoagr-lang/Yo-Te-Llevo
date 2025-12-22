#!/bin/bash

# --- Script para Sincronizar Secretos con Firebase ---
# Lee las variables del archivo .env.local y las sube a la configuración de funciones de Firebase.

# Ruta al archivo de entorno local
ENV_FILE="src/.env.local"

# Verifica si el archivo .env.local existe
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: No se encontró el archivo '$ENV_FILE'."
  echo "Por favor, asegúrate de que el archivo con tus secretos exista en esa ruta."
  exit 1
fi

echo "--- Iniciando la sincronización de secretos con Firebase ---"

# Lee cada línea del archivo .env.local
# Ignora las líneas vacías y los comentarios
grep -v '^#' "$ENV_FILE" | grep -v '^$' | while IFS= read -r line || [[ -n "$line" ]]; do
  # Extrae el nombre y el valor de la variable
  if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
    VAR_NAME="${BASH_REMATCH[1]}"
    VAR_VALUE="${BASH_REMATCH[2]}"

    # Limpia posibles comillas del valor
    VAR_VALUE="${VAR_VALUE%\"}"
    VAR_VALUE="${VAR_VALUE#\"}"
    VAR_VALUE="${VAR_VALUE%\'}"
    VAR_VALUE="${VAR_VALUE#\'}"

    # Construye el comando para Firebase. Lo formateamos como "group.key=value"
    # Usamos un grupo llamado "env" para mantener todo organizado.
    FIREBASE_CONFIG_KEY="env.${VAR_NAME,,}" # Convierte a minúsculas
    
    echo "Subiendo secreto: $VAR_NAME..."
    
    # Ejecuta el comando de Firebase para establecer la variable de configuración
    firebase functions:config:set "$FIREBASE_CONFIG_KEY"="$VAR_VALUE"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error al subir el secreto '$VAR_NAME'. Abortando."
        exit 1
    fi
  fi
done

echo ""
echo "🎉 --- ¡Sincronización de secretos completada! --- 🎉"
echo "Todos los secretos de tu archivo .env.local han sido subidos a Firebase."
echo "⚠️  IMPORTANTE: Ahora debes volver a desplegar tu aplicación para que los cambios surtan efecto."
echo "Ejecuta tu script de despliegue para finalizar."
