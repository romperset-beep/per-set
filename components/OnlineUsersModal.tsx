import React from 'react';
import { User, MessageSquare, X, Circle } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface OnlineUsersModalProps {
    onClose: () => void;
    onMessage: (userId: string) => void;
}

export const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({ onClose, onMessage }) => {
    const { userProfiles, user } = useProject();

    // Filter out current user from the list
    const otherUsers = userProfiles.filter(p => p.email !== user?.email);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-cinema-800 border border-cinema-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/50 rounded-t-xl">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            En ligne
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Membres de l'équipe disponibles</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {otherUsers.map(profile => {
                        // Logic for display name
                        const displayName = profile.name ||
                            (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` :
                                (profile.firstName || profile.lastName || profile.email));

                        const initial = displayName ? displayName[0].toUpperCase() : '?';

                        return (
                            <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-cinema-700 flex items-center justify-center text-white font-bold border border-cinema-600">
                                            {initial}
                                        </div>
                                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-cinema-800"></div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white">
                                            {displayName}
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            {profile.role || profile.department}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onMessage(profile.id)}
                                    className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="hidden sm:inline">Message</span>
                                </button>
                            </div>
                        );
                    })}

                    {otherUsers.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Personne d'autre n'est connecté pour le moment.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
