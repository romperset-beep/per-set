import React from 'react';
import { ShoppingCart, Filter, Download, Building2, Calendar, X, CheckCircle, FileText } from 'lucide-react';
import { Transaction } from '../../types';

interface AdminResalesListProps {
    filteredTransactions: Transaction[];
    searchTerm: string;
    resalesGroupBy: 'seller' | 'buyer' | 'date';
    setResalesGroupBy: (group: 'seller' | 'buyer' | 'date') => void;
    exportTransactionsCSV: (group: 'seller' | 'buyer' | 'date', subset?: Transaction[], customFilename?: string) => void;
    handleValidateTransaction: (t: Transaction) => void;
    handleRejectTransaction: (t: Transaction) => void;
    generateInvoice: (t: Transaction) => void;
    renderHeader: (title: string, subtitle: string, icon: React.ReactNode) => React.ReactNode;
}

export const AdminResalesList: React.FC<AdminResalesListProps> = ({
    filteredTransactions,
    searchTerm,
    resalesGroupBy,
    setResalesGroupBy,
    exportTransactionsCSV,
    handleValidateTransaction,
    handleRejectTransaction,
    generateInvoice,
    renderHeader
}) => {
    return (
        <>
            {renderHeader('Gestion des Reventes (Inter-Prod)', `${filteredTransactions.length} transactions affichées`, <ShoppingCart className="h-6 w-6 text-yellow-500" />)}

            <div className="p-4 bg-cinema-900/30 border-b border-cinema-700 flex flex-col md:flex-row justify-between gap-4 items-center">
                {/* Grouping Controls */}
                <div className="flex gap-2">
                    <span className="text-slate-400 text-sm flex items-center gap-2 mr-2">
                        <Filter className="h-4 w-4" /> Grouper par :
                    </span>
                    <button
                        onClick={() => setResalesGroupBy('seller')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resalesGroupBy === 'seller' ? 'bg-yellow-500 text-black' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                    >
                        Vendeur
                    </button>
                    <button
                        onClick={() => setResalesGroupBy('buyer')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resalesGroupBy === 'buyer' ? 'bg-yellow-500 text-black' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                    >
                        Acheteur
                    </button>
                    <button
                        onClick={() => setResalesGroupBy('date')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resalesGroupBy === 'date' ? 'bg-yellow-500 text-black' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                    >
                        Date
                    </button>
                </div>

                {/* Export Controls */}
                <div className="flex gap-2">
                    <button
                        onClick={() => exportTransactionsCSV('seller')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cinema-700 hover:bg-cinema-600 text-white rounded-lg text-xs font-medium transition-colors border border-cinema-600"
                    >
                        <Download className="h-3 w-3" />
                        CSV (Par Vendeur)
                    </button>
                    <button
                        onClick={() => exportTransactionsCSV('buyer')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cinema-700 hover:bg-cinema-600 text-white rounded-lg text-xs font-medium transition-colors border border-cinema-600"
                    >
                        <Download className="h-3 w-3" />
                        CSV (Par Acheteur)
                    </button>
                </div>
            </div>

            {searchTerm ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* VENTES (Sales) - When searched entity is SELLER */}
                    <div className="bg-cinema-800/50 rounded-xl overflow-hidden border border-cinema-700">
                        <div className="bg-emerald-900/30 px-6 py-4 border-b border-emerald-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Building2 className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Ses Ventes / Recettes</h3>
                                    <p className="text-sm text-emerald-400/70">Transactions où "{searchTerm}" est vendeur</p>
                                </div>
                            </div>
                            <button
                                onClick={() => exportTransactionsCSV('date', filteredTransactions.filter(t => (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase())), `ventes_${searchTerm}`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Download className="h-3 w-3" />
                                Export Ventes
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cinema-900/50 text-emerald-400/70 text-xs uppercase tracking-wider border-b border-cinema-700">
                                        <th className="px-6 py-4 font-semibold w-32">Date</th>
                                        <th className="px-6 py-4 font-semibold">Acheteur</th>
                                        <th className="px-6 py-4 font-semibold">Articles</th>
                                        <th className="px-6 py-4 font-semibold">Montant</th>
                                        <th className="px-6 py-4 font-semibold">Statut</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700 text-sm">
                                    {filteredTransactions
                                        .filter(t => (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((t) => (
                                            <tr key={t.id} className="hover:bg-cinema-700/30 transition-colors">
                                                <td className="px-6 py-4 text-slate-300">
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                    <div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-white font-medium">{t.buyerName}</td>
                                                <td className="px-6 py-4 text-slate-300 text-xs">
                                                    <ul className="list-disc list-inside">
                                                        {t.items.slice(0, 2).map((i, idx) => (
                                                            <li key={idx}>{i.quantity}x {i.name} ({i.price}€)</li>
                                                        ))}
                                                        {t.items.length > 2 && <li>... (+{t.items.length - 2})</li>}
                                                    </ul>
                                                </td>
                                                <td className="px-6 py-4 text-yellow-400 font-bold font-mono">{t.totalAmount.toFixed(2)} €</td>
                                                <td className="px-6 py-4">
                                                    {t.status === 'PENDING' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">En attente</span>
                                                    ) : t.status === 'CANCELLED' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center w-fit gap-1"><X className="h-3 w-3" /> Refusé</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30 flex items-center w-fit gap-1"><CheckCircle className="h-3 w-3" /> Validé</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {t.status === 'PENDING' && (
                                                            <>
                                                                <button onClick={() => handleValidateTransaction(t)} className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-green-600/20"><CheckCircle className="h-3 w-3" /> Valider</button>
                                                                <button onClick={() => handleRejectTransaction(t)} className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-3 py-1.5 rounded text-xs font-bold transition-colors"><X className="h-3 w-3" /> Refuser</button>
                                                            </>
                                                        )}
                                                        {t.status === 'VALIDATED' && (
                                                            <button onClick={() => generateInvoice(t)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"><FileText className="h-3 w-3" /> Facture</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {filteredTransactions.filter(t => (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Aucune vente trouvée pour cette recherche.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ACHATS (Purchases) - When searched entity is BUYER */}
                    <div className="bg-cinema-800/50 rounded-xl overflow-hidden border border-cinema-700">
                        <div className="bg-blue-900/30 px-6 py-4 border-b border-blue-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <ShoppingCart className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Ses Achats / Dépenses</h3>
                                    <p className="text-sm text-blue-400/70">Transactions où "{searchTerm}" est acheteur</p>
                                </div>
                            </div>
                            <button
                                onClick={() => exportTransactionsCSV('date', filteredTransactions.filter(t => (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase())), `achats_${searchTerm}`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Download className="h-3 w-3" />
                                Export Achats
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cinema-900/50 text-blue-400/70 text-xs uppercase tracking-wider border-b border-cinema-700">
                                        <th className="px-6 py-4 font-semibold w-32">Date</th>
                                        <th className="px-6 py-4 font-semibold">Vendeur</th>
                                        <th className="px-6 py-4 font-semibold">Articles</th>
                                        <th className="px-6 py-4 font-semibold">Montant</th>
                                        <th className="px-6 py-4 font-semibold">Statut</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700 text-sm">
                                    {filteredTransactions
                                        .filter(t => (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((t) => (
                                            <tr key={t.id} className="hover:bg-cinema-700/30 transition-colors">
                                                <td className="px-6 py-4 text-slate-300">
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                    <div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-white font-medium">{t.sellerName}</td>
                                                <td className="px-6 py-4 text-slate-300 text-xs">
                                                    <ul className="list-disc list-inside">
                                                        {t.items.slice(0, 2).map((i, idx) => (
                                                            <li key={idx}>{i.quantity}x {i.name} ({i.price}€)</li>
                                                        ))}
                                                        {t.items.length > 2 && <li>... (+{t.items.length - 2})</li>}
                                                    </ul>
                                                </td>
                                                <td className="px-6 py-4 text-yellow-400 font-bold font-mono">{t.totalAmount.toFixed(2)} €</td>
                                                <td className="px-6 py-4">
                                                    {t.status === 'PENDING' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">En attente</span>
                                                    ) : t.status === 'CANCELLED' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center w-fit gap-1"><X className="h-3 w-3" /> Refusé</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30 flex items-center w-fit gap-1"><CheckCircle className="h-3 w-3" /> Validé</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {t.status === 'PENDING' && (
                                                            <>
                                                                <button onClick={() => handleValidateTransaction(t)} className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-green-600/20"><CheckCircle className="h-3 w-3" /> Valider</button>
                                                                <button onClick={() => handleRejectTransaction(t)} className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-3 py-1.5 rounded text-xs font-bold transition-colors"><X className="h-3 w-3" /> Refuser</button>
                                                            </>
                                                        )}
                                                        {t.status === 'VALIDATED' && (
                                                            <button onClick={() => generateInvoice(t)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"><FileText className="h-3 w-3" /> Facture</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {filteredTransactions.filter(t => (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Aucun achat trouvé pour cette recherche.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 space-y-8">
                    {(() => {
                        let groups: Record<string, Transaction[]> = {};

                        if (resalesGroupBy === 'date') {
                            // Single group "Tout" (but filtered)
                            groups['Toutes les transactions'] = filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        } else {
                            // Group by Seller or Buyer (filtered)
                            groups = filteredTransactions.reduce((acc, t) => {
                                const key = resalesGroupBy === 'seller' ? t.sellerName : t.buyerName;
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(t);
                                return acc;
                            }, {} as Record<string, Transaction[]>);
                        }

                        const sortedGroupKeys = Object.keys(groups).sort();

                        return sortedGroupKeys.map(groupKey => (
                            <div key={groupKey} className="bg-cinema-800/50 rounded-xl overflow-hidden border border-cinema-700">
                                <div className="bg-cinema-700/50 px-6 py-3 border-b border-cinema-600 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            {resalesGroupBy === 'seller' ? <Building2 className="h-4 w-4 text-blue-400" /> :
                                                resalesGroupBy === 'buyer' ? <ShoppingCart className="h-4 w-4 text-green-400" /> :
                                                    <Calendar className="h-4 w-4 text-slate-400" />}
                                            {groupKey}
                                        </h3>
                                        <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded-full">
                                            {groups[groupKey].length} transactions
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => exportTransactionsCSV(resalesGroupBy, groups[groupKey], `export_${groupKey.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-cinema-600 hover:bg-cinema-500 text-slate-200 rounded text-xs font-medium transition-colors border border-cinema-500 shadow-sm"
                                        title={`Exporter les transactions de ${groupKey}`}
                                    >
                                        <Download className="h-3 w-3" />
                                        CSV
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                                                <th className="px-6 py-4 font-semibold w-32">Date</th>
                                                {resalesGroupBy !== 'seller' && <th className="px-6 py-4 font-semibold">Vendeur</th>}
                                                {resalesGroupBy !== 'buyer' && <th className="px-6 py-4 font-semibold">Acheteur</th>}
                                                <th className="px-6 py-4 font-semibold">Articles</th>
                                                <th className="px-6 py-4 font-semibold">Montant</th>
                                                <th className="px-6 py-4 font-semibold">Statut</th>
                                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-cinema-700 text-sm">
                                            {groups[groupKey]
                                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                .map((t) => (
                                                    <tr key={t.id} className="hover:bg-cinema-700/30 transition-colors">
                                                        <td className="px-6 py-4 text-slate-300">
                                                            {new Date(t.createdAt).toLocaleDateString()}
                                                            <div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                                                        </td>
                                                        {resalesGroupBy !== 'seller' && (
                                                            <td className="px-6 py-4 text-white font-medium">
                                                                {t.sellerName}
                                                            </td>
                                                        )}
                                                        {resalesGroupBy !== 'buyer' && (
                                                            <td className="px-6 py-4 text-white font-medium">
                                                                {t.buyerName}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-slate-300 text-xs">
                                                            <ul className="list-disc list-inside">
                                                                {t.items.slice(0, 2).map((i, idx) => (
                                                                    <li key={idx}>{i.quantity}x {i.name} ({i.price}€)</li>
                                                                ))}
                                                                {t.items.length > 2 && <li>... (+{t.items.length - 2})</li>}
                                                            </ul>
                                                        </td>
                                                        <td className="px-6 py-4 text-yellow-400 font-bold font-mono">
                                                            {t.totalAmount.toFixed(2)} €
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {t.status === 'PENDING' ? (
                                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">
                                                                    En attente
                                                                </span>
                                                            ) : t.status === 'CANCELLED' ? (
                                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center w-fit gap-1">
                                                                    <X className="h-3 w-3" /> Refusé
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30 flex items-center w-fit gap-1">
                                                                    <CheckCircle className="h-3 w-3" /> Validé
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {t.status === 'PENDING' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleValidateTransaction(t)}
                                                                            className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-green-600/20"
                                                                            title="Valider la vente"
                                                                        >
                                                                            <CheckCircle className="h-3 w-3" /> Valider
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRejectTransaction(t)}
                                                                            className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                                                            title="Refuser et Restocker"
                                                                        >
                                                                            <X className="h-3 w-3" /> Refuser
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {t.status === 'VALIDATED' && (
                                                                    <button
                                                                        onClick={() => generateInvoice(t)}
                                                                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"
                                                                        title="Télécharger Facture PDF"
                                                                    >
                                                                        <FileText className="h-3 w-3" /> Facture
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </>
    );
};
