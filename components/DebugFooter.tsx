import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Bug, X } from 'lucide-react';
import { useState } from 'react';

export const DebugFooter: React.FC = () => {
    const { user, project, currentDept } = useProject();
    const [isVisible, setIsVisible] = useState(true);

    if (!user || !isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/90 p-2 text-[10px] font-mono text-green-400 z-50 border-t border-green-900 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex gap-4">
                <span>
                    <strong className="text-white">UID:</strong> {user.email}
                </span>
                <span>
                    <strong className="text-white">Role:</strong> {user.department}
                </span>
                <span>
                    <strong className="text-white">View:</strong> {currentDept}
                </span>
                <span>
                    <strong className="text-white">ProjName:</strong> "{project.name}" (ID: <span className="text-yellow-400">{project.id}</span>)
                </span>
            </div>
            <button onClick={() => setIsVisible(false)} className="text-slate-500 hover:text-white">
                <X className="h-3 w-3" />
            </button>
        </div>
    );
};
