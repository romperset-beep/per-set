import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Bug, X, Bell } from 'lucide-react';
import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const DebugFooter: React.FC = () => {
    const { user, project, currentDept } = useProject();
    const [isVisible, setIsVisible] = useState(true);
    const { permission, requestPermission, fcmToken, error } = usePushNotifications();

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (fcmToken) {
            navigator.clipboard.writeText(fcmToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!user || !isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/90 p-2 text-[10px] font-mono text-green-400 z-50 border-t border-green-900 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex gap-4 items-center">
                <span>
                    <strong className="text-white">UID:</strong> {user.email}
                </span>
                <span>
                    <strong className="text-white">Role:</strong> {user.department}
                </span>
                <span>
                    <strong className="text-white">Proj:</strong> "{project.name}"
                </span>

                <div className="flex items-center gap-2 border-l border-white/20 pl-2 ml-2">
                    {error && (
                        <span className="text-red-500 font-bold bg-white/10 px-1 rounded flex items-center gap-1">
                            <Bug className="h-3 w-3" /> Error: {error}
                        </span>
                    )}

                    {!error && permission === 'default' && (
                        <button
                            onClick={requestPermission}
                            className="bg-green-700 text-white px-2 py-0.5 rounded hover:bg-green-600 flex items-center gap-1"
                        >
                            <Bell className="w-3 h-3" /> Activer Notifs
                        </button>
                    )}
                    {!error && permission === 'granted' && (
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 flex items-center gap-1" title={fcmToken || 'No Token'}>
                                <Bell className="w-3 h-3" />
                                {fcmToken ? `Token: ${fcmToken.slice(0, 6)}...` : 'Waiting...'}
                            </span>
                            {fcmToken && (
                                <button
                                    onClick={handleCopy}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
                                >
                                    {copied ? 'Copié !' : 'Copier'}
                                </button>
                            )}
                        </div>
                    )}
                    {!error && permission === 'denied' && (
                        <span className="text-red-500">Notifs Bloquées</span>
                    )}
                </div>
            </div>

            <button onClick={() => setIsVisible(false)} className="text-slate-500 hover:text-white">
                <X className="h-3 w-3" />
            </button>
        </div>
    );
};
