import React from 'react';
import { BuyBackItem } from '../types';
import { useProject } from '../context/ProjectContext';
import { X, Printer, Download, FileText } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';

interface SalesHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: BuyBackItem[];
}

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({ isOpen, onClose, items }) => {
    const { language, user } = useProject();
    const [invoiceItem, setInvoiceItem] = React.useState<BuyBackItem | null>(null);

    const t = {
        fr: {
            title: "Historique des Ventes",
            subtitle: "Récapitulatif des transactions validées",
            print: "Imprimer",
            totalSales: "Total des Ventes",
            itemsSold: "articles vendus",
            table: {
                date: "Date",
                item: "Article",
                seller: "Vendeur",
                buyer: "Acheteur (Réservé par)",
                price: "Prix"
            },
            noSales: "Aucune vente enregistrée.",
            unspecified: "Non spécifié",
            total: "TOTAL"
        },
        en: {
            title: "Sales History",
            subtitle: "Summary of validated transactions",
            print: "Print",
            totalSales: "Total Sales",
            itemsSold: "items sold",
            table: {
                date: "Date",
                item: "Item",
                seller: "Seller",
                buyer: "Buyer (Reserved by)",
                price: "Price"
            },
            noSales: "No sales recorded.",
            unspecified: "Unspecified",
            total: "TOTAL"
        },
        es: {
            title: "Historial de Ventas",
            subtitle: "Resumen de transacciones validadas",
            print: "Imprimir",
            totalSales: "Total de Ventas",
            itemsSold: "artículos vendidos",
            table: {
                date: "Fecha",
                item: "Artículo",
                seller: "Vendedor",
                buyer: "Comprador (Reservado por)",
                price: "Precio"
            },
            noSales: "Ninguna venta registrada.",
            unspecified: "No especificado",
            total: "TOTAL"
        }
    }[language || 'fr'];

    if (!isOpen) return null;

    const soldItems = items.filter(i => i.status === 'SOLD').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalRevenue = soldItems.reduce((acc, item) => acc + item.price, 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
            <div className="bg-cinema-900 border border-cinema-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:border-none print:shadow-none print:max-w-none print:h-auto print:max-h-none print:bg-white print:text-black">

                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center print:border-b-2 print:border-black">
                    <div>
                        <h2 className="text-2xl font-bold text-white print:text-black">{t.title}</h2>
                        <p className="text-slate-400 print:text-gray-600">{t.subtitle}</p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <Printer className="h-4 w-4" />
                            {t.print}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-cinema-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto print:overflow-visible">
                    <div className="mb-6 bg-cinema-800 p-4 rounded-lg border border-cinema-700 print:bg-gray-100 print:border-gray-300">
                        <div className="text-sm text-slate-400 uppercase font-bold print:text-gray-600">{t.totalSales}</div>
                        <div className="text-3xl font-bold text-green-400 print:text-black">{totalRevenue} €</div>
                        <div className="text-sm text-slate-500 print:text-gray-600">{soldItems.length} {t.itemsSold}</div>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead className="text-xs uppercase bg-cinema-800 text-slate-400 font-bold print:bg-gray-200 print:text-black">
                            <tr>
                                <th className="p-3 rounded-tl-lg">{t.table.date}</th>
                                <th className="p-3">{t.table.item}</th>
                                <th className="p-3">{t.table.seller}</th>
                                <th className="p-3">{t.table.buyer}</th>
                                <th className="p-3 text-right">{t.table.price}</th>
                                <th className="p-3 text-center rounded-tr-lg w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cinema-700 text-sm text-slate-300 print:text-black print:divide-gray-300">
                            {soldItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center italic text-slate-500">{t.noSales}</td>
                                </tr>
                            ) : (
                                soldItems.map(item => (
                                    <tr key={item.id} className="hover:bg-cinema-800/50 print:hover:bg-transparent">
                                        <td className="p-3">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 font-medium text-white print:text-black">
                                            {item.name}
                                        </td>
                                        <td className="p-3">
                                            <span className="bg-cinema-800 px-2 py-1 rounded text-xs border border-cinema-600 print:border-gray-400 print:bg-gray-100">
                                                {item.sellerDepartment}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {item.reservedByName ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.reservedByName}</span>
                                                    <span className="text-xs text-slate-500 print:text-gray-500">{item.reservedBy}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 italic">{t.unspecified} ({item.reservedBy})</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-bold text-green-400 print:text-black">
                                            {item.price} €
                                        </td>
                                        <td className="p-3 text-center print:hidden">
                                            <button
                                                onClick={() => setInvoiceItem(item)}
                                                className="p-1 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                                                title="Générer Facture"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-cinema-800 font-bold text-white print:bg-gray-100 print:text-black">
                            <tr>
                                <td colSpan={4} className="p-3 text-right">{t.total}</td>
                                <td className="p-3 text-right">{totalRevenue} €</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .fixed, .fixed * {
                            visibility: visible;
                        }
                        .fixed {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            background: white;
                            padding: 0;
                        }
                        /* Hide close button and other non-print elements */
                        .print\\:hidden {
                            display: none !important;
                        }
                    }
                `}</style>
            </div>

            <InvoiceModal
                isOpen={!!invoiceItem}
                onClose={() => setInvoiceItem(null)}
                item={invoiceItem}
                filmTitle={user?.filmTitle || 'Projet Sans Titre'}
            />
        </div >
    );
};
