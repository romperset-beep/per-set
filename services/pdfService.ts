import jsPDF from 'jspdf';
import { ExpenseReport, UserProfile } from '../types';

export const generateExpenseReportPDF = async (report: ExpenseReport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // -- Header --
    doc.setFontSize(22);
    doc.text('Note de Frais', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Ref: ${report.id}`, pageWidth - 20, 20, { align: 'right' });
    doc.text(`Date: ${new Date(report.date).toLocaleDateString('fr-FR')}`, pageWidth - 20, 26, { align: 'right' });

    // -- Info --
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Demandeur: ${report.submittedBy}`, 20, 40);
    doc.text(`Département: ${report.department}`, 20, 46);
    doc.text(`Production: ${report.productionName}`, 20, 52);
    doc.text(`Film: ${report.filmTitle}`, 20, 58);

    // -- Details --
    doc.line(20, 65, pageWidth - 20, 65);

    doc.setFontSize(14);
    doc.text('Détails de la dépense', 20, 75);

    doc.setFontSize(11);
    doc.text(`Commerçant: ${report.merchantName || 'Non spécifié'}`, 20, 85);

    doc.text('Articles:', 20, 95);
    let yPos = 102;
    report.items.forEach(item => {
        doc.text(`- ${item}`, 25, yPos);
        yPos += 6;
    });

    // -- Amounts --
    const amountY = Math.max(yPos + 10, 130);
    doc.setFillColor(240, 240, 240); // Light gray
    doc.rect(pageWidth - 80, amountY, 60, 30, 'F');

    doc.setFontSize(10);
    doc.text('Montant HT:', pageWidth - 75, amountY + 8);
    doc.text(`${(report.amountHT || 0).toFixed(2)} €`, pageWidth - 25, amountY + 8, { align: 'right' });

    doc.text('TVA:', pageWidth - 75, amountY + 16);
    doc.text(`${report.amountTVA.toFixed(2)} €`, pageWidth - 25, amountY + 16, { align: 'right' });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Total TTC:', pageWidth - 75, amountY + 26);
    doc.text(`${report.amountTTC.toFixed(2)} €`, pageWidth - 25, amountY + 26, { align: 'right' });

    // -- Footer --
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text('Document généré via A Better Set', pageWidth / 2, 280, { align: 'center' });

    // -- Receipt Link & Image --
    if (report.receiptUrl) {
        // 1. Always add the link (User Request)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 255);
        const linkText = 'Cliquez ici pour voir le justificatif original (Navigateur)';
        doc.textWithLink(linkText, 20, amountY + 40, { url: report.receiptUrl });

        try {
            // 2. Embed Image on Page 2
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text("Justificatif (Scan)", 20, 20);

            let base64data = report.receiptBase64;

            // If no stored base64, try to fetch (Fallback)
            if (!base64data && report.receiptUrl) {
                // Fetch with cache-busting to avoid CORS issues with cached opaque responses
                const fetchUrl = `${report.receiptUrl}${report.receiptUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                const response = await fetch(fetchUrl, { mode: 'cors' });
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                const blob = await response.blob();

                // Convert to Base64
                const reader = new FileReader();
                base64data = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            if (base64data) {
                const imgProps = doc.getImageProperties(base64data);
                const pdfWidth = doc.internal.pageSize.getWidth() - 40;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.addImage(base64data, 'JPEG', 20, 40, pdfWidth, pdfHeight);
            }

        } catch (e) {
            console.warn("Could not embed image in PDF:", e);
            doc.setFontSize(10);
            doc.setTextColor(255, 0, 0);
            doc.text("(L'image n'a pas pu être intégrée automatiquement - voir le lien ci-dessus)", 20, 40);
        }
    }

    doc.save(`Frais_${report.date.split('T')[0]}_${report.merchantName?.replace(/[^a-z0-9]/gi, '_')}.pdf`);
};

export const generateSummaryPDF = (reports: ExpenseReport[], userName: string, department: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Get Prod Info from first report (safe assumption if filtered by user)
    const productionName = reports[0]?.productionName || 'Production Inconnue';
    const filmTitle = reports[0]?.filmTitle || 'Film Inconnu';

    // -- Header --
    doc.setFontSize(22);
    doc.text('Récapitulatif de Notes de Frais', 20, 20);

    doc.setFontSize(12);
    doc.text(`Projet: ${filmTitle} (${productionName})`, 20, 30);
    doc.text(`Demandeur: ${userName} - ${department}`, 20, 36);
    doc.setFontSize(10);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, 20, 42);

    // -- Table --
    let y = 55;

    // Header
    doc.setFillColor(230);
    doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text('Date', 20, y);
    doc.text('Commerçant', 50, y);
    doc.text('Montant HT', 130, y, { align: 'right' });
    doc.text('Montant TTC', pageWidth - 20, y, { align: 'right' });

    y += 10;
    doc.setFont("helvetica", "normal");

    let totalPending = 0;
    let totalApprovedTTC = 0;
    let totalApprovedHT = 0;

    reports.forEach(report => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.text(new Date(report.date).toLocaleDateString('fr-FR'), 20, y);
        const merchant = report.merchantName || 'Inconnu';
        doc.text(merchant.substring(0, 30) + (merchant.length > 30 ? '...' : ''), 50, y);

        doc.text(`${(report.amountHT || 0).toFixed(2)} €`, 130, y, { align: 'right' });
        doc.text(`${report.amountTTC.toFixed(2)} €`, pageWidth - 20, y, { align: 'right' });

        if (report.status === 'Validé') {
            totalApprovedTTC += report.amountTTC;
            totalApprovedHT += (report.amountHT || 0);
        }
        if (report.status === 'En attente') totalPending += report.amountTTC;

        y += 8;
    });

    // -- Totals --
    y += 10;

    // HS Total above the line (as column sum)
    doc.setFont("helvetica", "bold");
    doc.text(`${totalApprovedHT.toFixed(2)} €`, 130, y, { align: 'right' });

    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    doc.text('Total Validé (A Rembourser):', 20, y);

    // TTC Total below the line
    doc.text(`${totalApprovedTTC.toFixed(2)} €`, pageWidth - 20, y, { align: 'right' });

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    if (totalPending > 0) {
        // Aligned right
        doc.text(`dont ${totalPending.toFixed(2)} € en attente de validation`, pageWidth - 20, y, { align: 'right' });
    }

    doc.save(`Recap_Frais_${userName}.pdf`);
};
