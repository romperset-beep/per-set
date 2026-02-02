# Déploiement des Règles de Sécurité Firebase

## ⚠️ Important

Ces règles de sécurité doivent être déployées sur Firebase pour être actives. Les modifications locales ne suffisent pas.

## Prérequis

- Connexion Internet
- Firebase CLI installé (`firebase-tools`)
- Authentification Firebase (`firebase login`)

## Commandes de Déploiement

### Déployer toutes les règles

```bash
cd "/Users/romainperset/Desktop/dossier gestion des conso/CinéStock/A Better Set/A Better Set"
firebase deploy --only firestore:rules,storage:rules
```

### Déployer uniquement Firestore

```bash
firebase deploy --only firestore:rules
```

### Déployer uniquement Storage

```bash
firebase deploy --only storage:rules
```

## Vérification Post-Déploiement

1. **Console Firebase** : https://console.firebase.google.com
   - Aller dans "Firestore Database" > "Règles"
   - Vérifier que les règles sont à jour

2. **Test avec utilisateur non-admin** :
   - Se déconnecter
   - Se connecter avec un compte utilisateur standard
   - Vérifier que l'accès admin est refusé

3. **Test upload fichier** :
   - Tenter d'uploader un fichier > 10 MB (image)
   - Vérifier le message d'erreur

## Rollback en cas de problème

Si les nouvelles règles causent des problèmes :

```bash
# Voir l'historique des déploiements
firebase deploy:history

# Revenir à une version précédente
firebase rollback firestore:rules <version>
firebase rollback storage:rules <version>
```

## Notes

- Les règles sont déployées instantanément
- Aucun redémarrage de l'application nécessaire
- Les utilisateurs connectés verront les nouvelles règles immédiatement
