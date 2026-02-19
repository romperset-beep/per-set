import React, { useState, useEffect } from 'react';
import { BuyBackItem } from '../types';
import { X, Download, FileText } from 'lucide-react';
// import { jsPDF } from 'jspdf'; // Removed for dynamic import

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

    const generatePDF = async () => {
        try {
            // Dynamic import to prevent production crash on load
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Load Logo
            const logoUrl = '/logo.png';
            let logoData: string | null = null;
            try {
                const response = await fetch(logoUrl);
                const blob = await response.blob();
                logoData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn("Could not load logo for PDF", e);
            }

            // Colors
            const primaryColor = '#1a1a1a';
            const accentColor = '#eab308'; // Yellow-500
            const lightGray = '#f3f4f6';

            // --- Header ---
            if (logoData) {
                // Keep aspect ratio
                doc.addImage(logoData, 'PNG', 20, 10, 30, 30);
            }

            doc.setFontSize(24);
            doc.setTextColor(primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text("FACTURE", 190, 25, { align: 'right' });

            const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont("helvetica", "normal");
            doc.text(`N°: ${invoiceNum}`, 190, 32, { align: 'right' });
            doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 190, 37, { align: 'right' });

            // --- Parties (Two Columns) ---
            const yStart = 60;

            // Seller (Left)
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text("VENDEUR", 20, yStart);

            doc.setFontSize(12);
            doc.setTextColor(primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text(sellerName, 20, yStart + 7);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont("helvetica", "normal");
            doc.text("Production Audiovisuelle", 20, yStart + 13);
            doc.text("Gestion via Per-Set", 20, yStart + 18);

            // Buyer (Right)
            doc.setTextColor(150);
            doc.text("ACHETEUR", 120, yStart);

            doc.setFontSize(12);
            doc.setTextColor(primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text(buyerName, 120, yStart + 7);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont("helvetica", "normal");
            doc.text("Membre de l'équipe", 120, yStart + 13);

            // --- Item Table ---
            let y = 100;

            // Header
            doc.setFillColor(245, 245, 245);
            doc.rect(20, y, 170, 10, 'F');
            doc.setFontSize(10);
            doc.setTextColor(primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text("Description", 25, y + 7);
            doc.text("Ref", 120, y + 7); // Added Ref column
            doc.text("Prix HT", 185, y + 7, { align: 'right' });

            // Row 1
            y += 20;
            doc.setFont("helvetica", "normal");
            doc.text(item.name, 25, y);
            doc.text(item.id.substring(0, 8).toUpperCase(), 120, y);
            doc.text(`${price.toFixed(2)} €`, 185, y, { align: 'right' });

            // Line
            y += 5;
            doc.setDrawColor(230);
            doc.line(20, y, 190, y);

            // --- Totals ---
            y += 15;
            const xLabel = 140;
            const xValue = 185;

            doc.text("Total HT:", xLabel, y);
            doc.text(`${price.toFixed(2)} €`, xValue, y, { align: 'right' });

            y += 8;
            doc.text(`TVA (${vatRate}%):`, xLabel, y);
            doc.text(`${vatAmount.toFixed(2)} €`, xValue, y, { align: 'right' });

            // Net APayer Box
            y += 10;
            doc.setFillColor(accentColor);
            doc.rect(xLabel - 25, y - 6, 80, 10, 'F'); // Background box
            doc.setTextColor(255, 255, 255); // White text
            doc.setFont("helvetica", "bold");
            doc.text("NET À PAYER", xLabel - 20, y + 1);
            doc.text(`${total.toFixed(2)} €`, xValue - 2, y + 1, { align: 'right' });

            // --- Footer ---
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.setFont("helvetica", "italic");

            // Legal
            doc.text("Conditions de paiement : Paiement à réception. En cas de retard, une pénalité s'applique.", 105, pageHeight - 20, { align: 'center' });
            doc.text("Document généré automatiquement le " + new Date().toLocaleString('fr-FR') + " via la plateforme Per-Set.", 105, pageHeight - 15, { align: 'center' });
            doc.text("Per-Set SaaS - Gestion de production éco-responsable.", 105, pageHeight - 10, { align: 'center' });

            // Save
            doc.save(`Facture_${item.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Erreur lors de la génération du PDF. Veuillez réessayer.");
        }
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
