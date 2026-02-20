import React from 'react';
import { Building2 } from 'lucide-react';

interface AdminProductionsListProps {
    productions: any[]; // Consider using a stronger type if Production type is available
    renderHeader: (title: string, subtitle: string, icon: React.ReactNode) => React.ReactNode;
}

export const AdminProductionsList: React.FC<AdminProductionsListProps> = ({
    productions,
    renderHeader
}) => {
    return (
        <>
            {renderHeader('Productions', `${productions.length} sociétés référencées`, <Building2 className="h-6 w-6 text-purple-500" />)}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                            <th className="px-6 py-4 font-semibold">Nom de la Production</th>
                            <th className="px-6 py-4 font-semibold">Nombre de projets</th>
                            <th className="px-6 py-4 font-semibold">Projets associés</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cinema-700 text-sm">
                        {productions.map((prod, idx) => (
                            <tr key={idx} className="hover:bg-cinema-700/30 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{prod.name}</td>
                                <td className="px-6 py-4 text-slate-300">{prod.projectCount}</td>
                                <td className="px-6 py-4 text-slate-400 text-xs">
                                    {prod.projects.map((p: any) => p.name).join(', ')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};
