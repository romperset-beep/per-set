import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const EmergencyProfileRestore: React.FC<{ userId: string }> = ({ userId }) => {
    const [isRestoring, setIsRestoring] = useState(false);
    const [restored, setRestored] = useState(false);

    const restoreProfile = async () => {
        setIsRestoring(true);
        try {
            // Complete User profile matching types.ts interface
            const userProfile = {
                id: userId,
                name: 'Romain Perset',
                email: 'romperset@gmail.com',
                department: 'PRODUCTION' as const,
                role: 'ADMIN',
                productionName: 'A Better Set',
                filmTitle: 'Demo Film',
                currentProjectId: 'demo-prod-demo-film',
                status: 'approved' as const,
                hasAcceptedSaaSTerms: true,
                isAdmin: true,
            };

            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, userProfile);

            setRestored(true);

            // Reload after 1 second
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Error restoring profile:', error);
            alert(`Erreur lors de la restauration du profil: ${error}`);
        } finally {
            setIsRestoring(false);
        }
    };

    if (restored) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
                    <div className="text-green-500 mb-4">
                        <RefreshCw size={48} className="mx-auto animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Profil restauré !</h2>
                    <p className="text-gray-600">Rechargement en cours...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4 text-orange-500">
                    <AlertTriangle size={32} />
                    <h2 className="text-xl font-bold">Profil incomplet détecté</h2>
                </div>

                <p className="text-gray-700 mb-4">
                    Votre profil utilisateur semble incomplet. Cliquez sur le bouton ci-dessous pour le restaurer automatiquement.
                </p>

                <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                    <p className="font-semibold mb-1">Données à restaurer :</p>
                    <ul className="text-gray-600 space-y-1">
                        <li>• Nom : Romain Perset</li>
                        <li>• Email : romperset@gmail.com</li>
                        <li>• Département : PRODUCTION</li>
                        <li>• Rôle : ADMIN</li>
                    </ul>
                </div>

                <button
                    onClick={restoreProfile}
                    disabled={isRestoring}
                    className="w-full bg-emerald-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isRestoring ? (
                        <>
                            <RefreshCw size={20} className="animate-spin" />
                            Restauration en cours...
                        </>
                    ) : (
                        <>
                            <RefreshCw size={20} />
                            Restaurer mon profil
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
