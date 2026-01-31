// import jsPDF from 'jspdf'; // Removed for dynamic import
import { ExpenseReport, UserProfile } from '../types';

export const generateExpenseReportPDF = async (report: ExpenseReport) => {
    const { jsPDF } = await import('jspdf');
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

    doc.line(20, 65, pageWidth - 20, 65);

    let yPos = 80;

    // --- ADVANCED MODE (Table View) ---
    if (report.mode === 'ADVANCED' && report.lines && report.lines.length > 0) {

        // Table Header
        doc.setFillColor(230, 230, 230);
        doc.rect(15, yPos - 8, pageWidth - 30, 10, 'F');

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text('Date', 15, yPos);
        doc.text('Nature / Convives', 35, yPos);
        doc.text('TVA', 135, yPos, { align: 'right' });
        doc.text('Récup.', 150, yPos, { align: 'center' });
        doc.text('TTC', pageWidth - 15, yPos, { align: 'right' });

        yPos += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        // Lines
        report.lines.forEach(line => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            const dateStr = new Date(line.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

            // Complex Description Construction
            let desc = `${line.merchant}`;
            if (line.description) desc += ` - ${line.description}`;
            if (line.guestNames) desc += ` (Invités: ${line.guestNames})`;
            if (line.destination) desc += ` (Trajet: ${line.destination})`;

            // Split long text (Wider column: 90 width)
            const splitDesc = doc.splitTextToSize(desc, 95);

            doc.text(dateStr, 15, yPos);
            doc.text(splitDesc, 35, yPos);

            // Amounts
            doc.text(`${line.vatAmount.toFixed(2)} (${line.vatRate}%)`, 135, yPos, { align: 'right' });
            doc.text(line.isVatRecoverable ? 'Oui' : 'Non', 150, yPos, { align: 'center' });
            doc.text(`${line.amountTTC.toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });

            yPos += (splitDesc.length * 5) + 4; // Dynamic Row Height
        });

        yPos += 5;
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;

        // Breakdown Block
        // Check page break for Breakdown Block
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }

        // Breakdown Block
        const breakdownY = yPos;
        doc.setFillColor(245, 245, 245);
        doc.rect(pageWidth - 100, breakdownY, 80, 45, 'F');

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text('Récapitulatif TVA', pageWidth - 95, breakdownY + 8);
        doc.setFont("helvetica", "normal");

        const rates = [20, 10, 5.5, 0];
        let offY = 16;
        rates.forEach(rate => {
            const sumBase = report.lines!.filter(l => l.vatRate === rate).reduce((acc, l) => acc + l.amountHT, 0);
            const sumVat = report.lines!.filter(l => l.vatRate === rate).reduce((acc, l) => acc + l.vatAmount, 0);
            if (sumBase > 0 || sumVat > 0) {
                doc.text(`TVA ${rate}%: Base ${sumBase.toFixed(2)}€ | Taxe ${sumVat.toFixed(2)}€`, pageWidth - 95, breakdownY + offY);
                offY += 6;
            }
        });

        // Push yPos below the breakdown block so Totals don't overlap
        yPos += 55;

    }
    // --- SIMPLE MODE (Legacy View) ---
    else {
        doc.setFontSize(14);
        doc.text('Détails de la dépense', 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.text(`Commerçant: ${report.merchantName || 'Non spécifié'}`, 20, yPos);
        yPos += 10;

        doc.text('Description:', 20, yPos);
        yPos += 7;

        // Items or Description
        const items = report.items || [];
        items.forEach(item => {
            doc.text(`- ${item}`, 25, yPos);
            yPos += 6;
        });

        // Simple Amounts Box matching original style
        yPos = Math.max(yPos + 10, 140);
    }

    // --- TOTALS (Common) ---
    const finalY = Math.max(yPos + 20, 160);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL TTC: ${report.amountTTC.toFixed(2)} €`, pageWidth - 20, finalY, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Dont TVA: ${report.amountTVA.toFixed(2)} €`, pageWidth - 20, finalY + 6, { align: 'right' });
    if (report.amountHT) {
        doc.text(`Hors Taxe: ${report.amountHT.toFixed(2)} €`, pageWidth - 20, finalY + 12, { align: 'right' });
    }

    // -- Signatures --
    doc.setFontSize(10);
    doc.setTextColor(0);
    const sigY = 250;

    doc.text('Signature du Salarié :', 40, sigY);
    doc.rect(40, sigY + 5, 60, 20); // Box for employee

    doc.text('Validation Production :', 120, sigY);
    doc.rect(120, sigY + 5, 60, 20); // Box for production

    // -- Footer --
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Document généré via A Better Set - Certifié conforme à l\'original', pageWidth / 2, 285, { align: 'center' });

    // -- Receipt Link & Image --
    if (report.receiptUrl) {
        // 1. Always add the link (User Request)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 255);
        const linkText = 'Cliquez ici pour voir le justificatif original (Navigateur)';
        doc.textWithLink(linkText, 20, finalY + 30, { url: report.receiptUrl });

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
                // DETECT PDF (Mime Type or Header)
                if (base64data.startsWith('data:application/pdf')) {
                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    doc.text("Le justificatif est au format PDF.", 20, 40);
                    doc.text("Veuillez cliquer sur le lien ci-dessus pour le consulter.", 20, 46);
                } else {
                    // It's an image
                    const imgProps = doc.getImageProperties(base64data);
                    const pdfWidth = doc.internal.pageSize.getWidth() - 40;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                    doc.addImage(base64data, 'JPEG', 20, 40, pdfWidth, pdfHeight);
                }
            }

        } catch (e) {
            console.warn("Could not embed image in PDF:", e);
            doc.setFontSize(10);
            doc.setTextColor(255, 0, 0);
            doc.text("(L'image n'a pas pu être intégrée automatiquement - voir le lien ci-dessus)", 20, 40);
        }
    }

    doc.save(`Frais_${report.date.split('T')[0]}_${report.merchantName?.replace(/[^a-z0-9]/gi, '_') || 'Multi'}.pdf`);
};

export const generateSummaryPDF = async (reports: ExpenseReport[], userName: string, department: string) => {
    const { jsPDF } = await import('jspdf');
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
    doc.setFillColor(230, 230, 230);
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

    // -- Append Receipts --
    for (const report of reports) {
        if (report.receiptBase64 || report.receiptUrl) {
            try {
                doc.addPage();
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text(`Justificatif : ${report.merchantName} (${new Date(report.date).toLocaleDateString('fr-FR')})`, 20, 20);
                doc.setFontSize(10);
                if (report.receiptUrl) {
                    doc.setTextColor(0, 0, 255);
                    doc.textWithLink('Ouvrir l\'original', 20, 26, { url: report.receiptUrl });
                }

                let base64data = report.receiptBase64;

                // Fallback fetch if only URL
                if (!base64data && report.receiptUrl) {
                    const fetchUrl = `${report.receiptUrl}${report.receiptUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    const response = await fetch(fetchUrl, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        const reader = new FileReader();
                        base64data = await new Promise<string>((resolve) => {
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = () => resolve(''); // Safe fail
                            reader.readAsDataURL(blob);
                        });
                    }
                }

                if (base64data) {
                    const imgProps = doc.getImageProperties(base64data);
                    const pdfWidth = doc.internal.pageSize.getWidth() - 40;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    // Cap height to fit page
                    const maxHeight = doc.internal.pageSize.getHeight() - 40;
                    const finalHeight = Math.min(pdfHeight, maxHeight);

                    doc.addImage(base64data, 'JPEG', 20, 35, pdfWidth, finalHeight);
                }
            } catch (e) {
                console.warn(`Could not embed receipt for ${report.id}`, e);
            }
        }
    }

    doc.save(`Recap_Frais_${userName}.pdf`);
};
