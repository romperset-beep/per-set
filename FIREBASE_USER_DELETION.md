# Configuration de la Suppression Automatique des Comptes Firebase Auth

## 🔴 Problème Actuel

Lorsqu'un administrateur supprime un utilisateur dans l'application, seul le **profil Firestore** est supprimé. Le **compte Firebase Authentication** reste actif, ce qui empêche la réutilisation de l'email.

## ✅ Solution Temporaire (Actuelle)

L'application anonymise maintenant l'email dans Firestore (`deleted_timestamp_email@example.com`) pour permettre la création d'un nouveau compte avec le même email. Cependant, le compte Auth original reste.

## 🚀 Solution Permanente : Extension Firebase

### Option 1 : Extension "Delete User Data" (Recommandé)

1. **Accéder à Firebase Console**
   - Ouvrez https://console.firebase.google.com
   - Sélectionnez votre projet "A Better Set"

2. **Installer l'Extension**
   - Allez dans "Extensions" dans le menu latéral
   - Cliquez sur "Explore Extensions"
   - Recherchez "Delete User Data"
   - Cliquez sur "Install"

3. **Configuration**
   ```
   Cloud Functions location: europe-west1
   Firestore paths: users/{UID}
   Firestore delete mode: recursive
   ```

4. **Activer l'API Admin**
   - L'extension vous demandera d'activer l'API Firebase Admin
   - Suivez les instructions pour l'activer

5. **Déploiement**
   - Cliquez sur "Install extension"
   - Attendez quelques minutes pour le déploiement

### Option 2 : Cloud Function Personnalisée

Si vous préférez plus de contrôle, créez une Cloud Function :

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const deleteUserAccount = functions
  .region('europe-west1')
  .firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const userId = context.params.userId;
    
    // Check if user was marked as deleted
    if (newData.status === 'deleted' && newData.deletedAt) {
      try {
        // Delete the Firebase Auth account
        await admin.auth().deleteUser(userId);
        console.log(`Successfully deleted Auth account for user: ${userId}`);
        
        // Optionally delete the Firestore document
        await change.after.ref.delete();
        console.log(`Successfully deleted Firestore document for user: ${userId}`);
      } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
      }
    }
  });
```

**Déploiement :**
```bash
cd functions
npm install firebase-functions firebase-admin
npm run deploy
```

## 📋 Procédure Manuelle (Temporaire)

En attendant la mise en place de l'automatisation :

1. **Dans l'Application**
   - Supprimez l'utilisateur via le Dashboard Admin
   - Notez l'email de l'utilisateur dans l'alerte

2. **Dans Firebase Console**
   - Allez sur https://console.firebase.google.com
   - Sélectionnez votre projet
   - Menu "Authentication" > "Users"
   - Recherchez l'email de l'utilisateur
   - Cliquez sur les 3 points > "Delete account"
   - Confirmez la suppression

3. **Vérification**
   - L'email est maintenant disponible pour un nouveau compte
   - Le profil Firestore a été anonymisé

## 🔒 Sécurité

- ✅ Seuls les administrateurs peuvent supprimer des utilisateurs
- ✅ L'email original est conservé dans `originalEmail` pour l'audit
- ✅ La date de suppression est enregistrée dans `deletedAt`
- ✅ Le statut est marqué comme `'deleted'`

## 📊 Audit Trail

Les utilisateurs supprimés restent dans Firestore avec :
- `status: 'deleted'`
- `deletedAt: '2025-12-19T18:15:00Z'`
- `originalEmail: 'user@example.com'`
- `email: 'deleted_1734628500000_user@example.com'`
- `name: 'Utilisateur Supprimé'`

Cela permet de :
- Garder une trace des suppressions
- Réutiliser les emails
- Maintenir l'intégrité référentielle des données
