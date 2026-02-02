import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOfflineToast, setShowOfflineToast] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowOfflineToast(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOfflineToast(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-hide toast after 5 seconds when back online
    useEffect(() => {
        if (isOnline && showOfflineToast) {
            const timer = setTimeout(() => setShowOfflineToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, showOfflineToast]);

    if (!showOfflineToast && isOnline) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-5">
            {!isOnline ? (
                <div className="flex items-center gap-3 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg border border-orange-600">
                    <WifiOff size={20} />
                    <div>
                        <p className="font-semibold">Mode hors ligne</p>
                        <p className="text-sm text-orange-100">Vos données seront synchronisées au retour de la connexion</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg border border-green-600">
                    <Wifi size={20} />
                    <div>
                        <p className="font-semibold">Connexion rétablie</p>
                        <p className="text-sm text-green-100">Synchronisation en cours...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
