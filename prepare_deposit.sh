#!/bin/bash

# Script de préparation d'archive pour dépôt légal (INPI/APP)
# Exclut les fichiers lourds (node_modules), les fichiers de configuration système (.DS_Store),
# le dossier git et les fichiers sensibles (.env).

DATE=$(date +%Y-%m-%d)
ARCHIVE_NAME="A_Better_Set_Source_Code_$DATE.zip"

echo "📦 Préparation de l'archive : $ARCHIVE_NAME"

# Création de l'archive ZIP
# -x exclut les patterns spécifiés
zip -r "$ARCHIVE_NAME" . \
    -x "node_modules/*" \
    -x ".git/*" \
    -x ".firebase/*" \
    -x "dist/*" \
    -x ".env*" \
    -x ".DS_Store" \
    -x "*.zip" \
    -x "coverage/*" \
    -x ".vscode/*"

echo "✅ Archive créée avec succès !"
echo "📁 Fichier : $ARCHIVE_NAME"
echo "ℹ️  Vous pouvez maintenant déposer ce fichier sur Soleau (INPI) ou APP."
