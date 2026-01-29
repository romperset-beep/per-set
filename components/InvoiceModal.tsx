import React, { useState, useEffect } from 'react';
import { BuyBackItem } from '../types';
import { X, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: BuyBackItem | null;
    sellerName: string;
    buyerName: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, item, sellerName, buyerName }) => {
    const [vatRate, setVatRate] = useState(20);

    if (!isOpen || !item) return null;

    const price = item.price;
    const vatAmount = (price * vatRate) / 100;
    const total = price + vatAmount;

    const generatePDF = () => {
        const doc = new jsPDF();

        // Colors
        const primaryColor = '#1a1a1a';
        const accentColor = '#eab308'; // Yellow-500

        // Header
        doc.setFontSize(24);
        doc.setTextColor(primaryColor);
        doc.text("FACTURE", 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });

        // Production Info
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.text("Production", 20, 50);

        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Film: ${sellerName}`, 20, 60);

        // Transaction Info
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.text("Détails de la transaction", 20, 80);

        doc.setFontSize(11);
        doc.setTextColor(60);
        // User Request: 'vendu par (le nom de la production )'
        // User Request: 'vendu par (le nom de la production )'
        doc.text(`Vendu par: ${sellerName}`, 20, 90);
        // User Request: 'à : (le prenom et le nom de la personne qui à réservé l'article )'
        doc.text(`À: ${buyerName}`, 20, 96);

        // Table Header
        let y = 110;
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y, 170, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Désignation", 25, y + 7);
        doc.text("Prix HT", 160, y + 7, { align: 'right' });

        // Item
        y += 20;
        doc.setFont("helvetica", "normal");
        doc.text(item.name, 25, y);
        doc.text(`${price.toFixed(2)} €`, 160, y, { align: 'right' });

        // Calculations
        y += 20;
        doc.line(20, y, 190, y);

        y += 15;
        doc.text("Total HT:", 130, y);
        doc.text(`${price.toFixed(2)} €`, 180, y, { align: 'right' });

        y += 10;
        doc.text(`TVA (${vatRate}%):`, 130, y);
        doc.text(`${vatAmount.toFixed(2)} €`, 180, y, { align: 'right' });

        y += 15;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("NET À PAYER:", 130, y);
        doc.text(`${total.toFixed(2)} €`, 180, y, { align: 'right' });

        // Footer
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Document généré automatiquement via A Better Set", 105, 280, { align: 'center' });

        doc.save(`Facture_${item.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white text-slate-900 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-slate-500" />
                            Édition de Facture
                        </h2>
                        <p className="text-sm text-slate-500">{sellerName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-500">
                            Vendu par <span className="font-medium text-slate-700">{sellerName}</span> à <span className="font-medium text-slate-700">{buyerName}</span>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Taux de TVA (%)
                        </label>
                        <div className="flex gap-2">
                            {[0, 5.5, 10, 20].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => setVatRate(rate)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${vatRate === rate
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                                        }`}
                                >
                                    {rate}%
                                </button>
                            ))}
                            <input
                                type="number"
                                value={vatRate}
                                onChange={(e) => setVatRate(Number(e.target.value))}
                                className="w-20 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Prix HT</span>
                            <span className="font-medium">{price.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">TVA ({vatRate}%)</span>
                            <span className="font-medium">{vatAmount.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-slate-800 pt-2">
                            <span>Total TTC</span>
                            <span>{total.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={generatePDF}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Download className="h-5 w-5" />
                        Télécharger la Facture (pdf)
                    </button>
                </div>
            </div>
        </div>
    );
};
