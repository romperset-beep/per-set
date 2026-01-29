
// import jsPDF from 'jspdf'; // Removed for dynamic import
import { Transaction } from '../types';

export const generateInvoice = async (transaction: Transaction) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Colors
    const primaryColor = '#1a1a1a';

    // Config
    const vatRate = 20; // Default VAT
    const taxAmount = (transaction.totalAmount * vatRate) / 100;
    const totalTTC = transaction.totalAmount + taxAmount;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(primaryColor);
    doc.text("FACTURE", 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const invoiceDate = transaction.invoicedAt
        ? new Date(transaction.invoicedAt).toLocaleDateString()
        : new Date().toLocaleDateString();

    doc.text(`Date: ${invoiceDate}`, 105, 28, { align: 'center' });
    doc.text(`N° Facture: ${(transaction.invoicedAt || 'AVOIR').slice(0, 10).replace(/-/g, '')}-${transaction.id.slice(-4).toUpperCase()}`, 105, 34, { align: 'center' });

    // Production (Seller) Info
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text("Vendeur (Production)", 20, 50);

    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Nom: ${transaction.sellerName}`, 20, 60);
    doc.text(`ID Projet: ${transaction.sellerId}`, 20, 66);

    // Buyer Info
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text("Acheteur (Production)", 120, 50);

    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Nom: ${transaction.buyerName}`, 120, 60);
    doc.text(`ID Projet: ${transaction.buyerId}`, 120, 66);


    // Table Header
    let y = 90;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Désignation", 25, y + 7);
    doc.text("Qté", 120, y + 7, { align: 'center' });
    doc.text("P.U. HT", 140, y + 7, { align: 'right' });
    doc.text("Total HT", 185, y + 7, { align: 'right' });

    // Items
    y += 15;
    doc.setFont("helvetica", "normal");

    transaction.items.forEach(item => {
        doc.text(item.name, 25, y);
        doc.text(item.quantity.toString(), 120, y, { align: 'center' });
        doc.text(`${item.price.toFixed(2)} €`, 140, y, { align: 'right' });
        doc.text(`${(item.price * item.quantity).toFixed(2)} €`, 185, y, { align: 'right' });
        y += 10;
    });

    // Calculations
    y += 10;
    doc.line(20, y, 190, y);

    y += 10;
    doc.text("Total HT:", 140, y);
    doc.text(`${transaction.totalAmount.toFixed(2)} €`, 185, y, { align: 'right' });

    y += 7;
    doc.text(`TVA (${vatRate}%):`, 140, y);
    doc.text(`${taxAmount.toFixed(2)} €`, 185, y, { align: 'right' });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("NET À PAYER:", 140, y);
    doc.text(`${totalTTC.toFixed(2)} €`, 185, y, { align: 'right' });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Document généré automatiquement via A Better Set - Conforme Loi Sapin", 105, 280, { align: 'center' });

    doc.save(`Facture_${transaction.id}_${invoiceDate.replace(/\//g, '-')}.pdf`);
};
