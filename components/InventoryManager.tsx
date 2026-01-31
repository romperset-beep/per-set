import React, { useState } from 'react';
import { ItemStatus, SurplusAction, Department, Transaction } from '../types';
import { Minus, Plus, ShoppingCart, CheckCircle2, PlusCircle, RefreshCw, GraduationCap, Undo2, Mail, PackageCheck, PackageOpen, Clock, Receipt, Film, Trash2, AlertTriangle, ArrowRightLeft, ShoppingBag, Save } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { AddItemModal } from './AddItemModal';
import { ExpenseReportModal } from './ExpenseReportModal';
import { ErrorBoundary } from './ErrorBoundary';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { TemplateManagerModal } from './TemplateManagerModal';


export const InventoryManager: React.FC = () => {
    const { project, setProject, currentDept, addNotification, user, markNotificationAsReadByItemId, updateItem, addItem, deleteItem } = useProject();
    const { getGlobalMarketplaceItems } = useMarketplace();

    // Form State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedForEmail, setSelectedForEmail] = useState<Set<string>>(new Set());
    const [selectedForExpense, setSelectedForExpense] = useState<Set<string>>(new Set());
    // const [selectedForExpense, setSelectedForExpense] = useState<Set<string>>(new Set());
    const [surplusConfirmation, setSurplusConfirmation] = useState<{ item: any, action: SurplusAction } | null>(null);
    const [transferConfirmation, setTransferConfirmation] = useState<{ item: any } | null>(null);
    const [targetDept, setTargetDept] = useState<Department | 'PRODUCTION'>('PRODUCTION');
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const [bulkSurplusConfirmation, setBulkSurplusConfirmation] = useState<{ targets: any[], action: SurplusAction } | null>(null);

    const toggleDeptExpansion = (dept: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept);
            else next.add(dept);
            return next;
        });
    };

    // Check shooting end date
    const shootingEndDate = project.shootingEndDate ? new Date(project.shootingEndDate) : null;
    const isShootingFinished = shootingEndDate ? new Date() >= shootingEndDate : false;

    // Expense Report State
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseItemName, setExpenseItemName] = useState<string>('');

    // Templates State
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateMode, setTemplateMode] = useState<'MANAGE' | 'SAVE'>('MANAGE');
    // For saving, we might want to select items, but for MVP "Save Template" saves the CURRENT VIEW of stock?
    // User request: "enregistrer ses listes (consommables , materiel) qu'il garderait de projet en projet"
    // Ideally, select items to save. 
    // Implementation: "Sauvegarder l'inventaire actuel" (simple) or "Selectionner".
    // Let's assume user builds a list in a project and wants to save it. 
    // We'll pass the currently visible items (filtered by dept) as the source.



    // toggleExpenseSelection removed

    // Marketplace Suggestions
    const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(true);

    React.useEffect(() => {
        const fetchMarketplace = async () => {
            setSuggestionsLoading(true);
            try {
                const items = await getGlobalMarketplaceItems();
                setMarketplaceItems(items);
            } catch (error) {
                console.error("Failed to load marketplace suggestions", error);
            } finally {
                setSuggestionsLoading(false);
            }
        };
        fetchMarketplace();
    }, [getGlobalMarketplaceItems]);


    const toggleExpenseSelection = (id: string) => {
        setSelectedForExpense(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };


    const groupStockItems = (items: typeof project.items) => {
        const grouped: any[] = [];
        const newItemsByName: Record<string, any> = {};
        const startedItemsByName: Record<string, any> = {};

        (items || []).forEach(item => {
            const startedQty = item.quantityStarted || 0;
            const newQty = Math.max(0, item.quantityCurrent - startedQty);
            const key = item.name + (item.surplusAction || 'NONE');

            // Handle New Portion
            if (newQty > 0) {
                if (!newItemsByName[key]) {
                    newItemsByName[key] = {
                        ...item,
                        quantityCurrent: 0,
                        quantityStarted: 0,
                        items: []
                    };
                }

                // Price Persistence Logic: If agg lacks price but current item has it, update agg.
                if ((!newItemsByName[key].price || newItemsByName[key].price === 0) && (item.price && item.price > 0)) {
                    newItemsByName[key].price = item.price;
                    newItemsByName[key].originalPrice = item.originalPrice || item.price;
                }

                newItemsByName[key].quantityCurrent += newQty;
                newItemsByName[key].items.push(item);
            }

            // Handle Started Portion
            if (startedQty > 0) {
                if (!startedItemsByName[key]) {
                    startedItemsByName[key] = {
                        ...item,
                        quantityCurrent: 0,
                        quantityStarted: 0,
                        isStartedView: true, // Flag to identify started view
                        items: []
                    };
                }

                // Price Persistence Logic for Started items
                if ((!startedItemsByName[key].price || startedItemsByName[key].price === 0) && (item.price && item.price > 0)) {
                    startedItemsByName[key].price = item.price;
                    startedItemsByName[key].originalPrice = item.originalPrice || item.price;
                }

                startedItemsByName[key].quantityCurrent += startedQty;
                startedItemsByName[key].quantityStarted += startedQty;
                startedItemsByName[key].items.push(item);
            }
        });

        // Add aggregated items & Sort Alphabetically
        Object.values(newItemsByName).forEach(agg => grouped.push(agg));
        Object.values(startedItemsByName).forEach(agg => grouped.push(agg));

        return grouped.sort((a, b) => a.name.localeCompare(b.name))
            .sort((a, b) => {
                if (a.name !== b.name) return a.name.localeCompare(b.name);
                // New first
                if (!a.isStartedView && b.isStartedView) return -1;
                if (a.isStartedView && !b.isStartedView) return 1;
                return 0;
            });
    };

    const updateQuantity = async (id: string, change: number) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const newQty = Math.max(0, item.quantityCurrent + change);
        let newStatus = item.status;
        if (newQty === 0) newStatus = ItemStatus.EMPTY;
        else if (newQty < item.quantityInitial) newStatus = ItemStatus.USED;

        const changes = { quantityCurrent: newQty, status: newStatus };
        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        if (updateItem) await updateItem({ id, ...changes });
    };

    const markAsBought = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        // Prompt for Price (using the modal logic)
        promptForMarketplacePrice(item, SurplusAction.NONE, async (price) => {
            const changes = { isBought: true };
            // If price is provided (and > 0), update it.
            // If user leaves 0, we assume 0 or keep existing?
            // Logic: If user enters a price, we save it.
            const priceUpdate = price > 0 ? { price: price, originalPrice: item.originalPrice || price } : {};

            const updatedItem = { ...item, ...changes, ...priceUpdate };

            setProject(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));

            if (updateItem) await updateItem({ id, ...changes, ...priceUpdate });
            markNotificationAsReadByItemId(id);

            // Notify Requester
            if (item.department) {
                addNotification(
                    `Commande achetée : ${item.name}`,
                    'SUCCESS',
                    item.department
                );
            }
        });
    };

    const markAsPurchased = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        // Helper to execute update
        const executeMarkAsPurchased = async (price?: number) => {
            const changes = { purchased: true, isBought: false };
            const priceUpdate = (price !== undefined && price > 0) ? { price: price, originalPrice: item.originalPrice || price } : {};

            const updatedItem = { ...item, ...changes, ...priceUpdate };

            setProject(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));

            if (updateItem) await updateItem({ id, ...changes, ...priceUpdate });
            markNotificationAsReadByItemId(id);

            if (item.department) {
                addNotification(
                    `Commande disponible/reçue : ${item.name}`,
                    'SUCCESS',
                    item.department
                );
            }
        };

        // If price is already set (from markAsBought), skip prompt
        if (item.price && item.price > 0) {
            await executeMarkAsPurchased();
        } else {
            promptForMarketplacePrice(item, SurplusAction.NONE, async (price) => {
                await executeMarkAsPurchased(price);
            });
        }
    };

    const incrementStarted = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const currentStarted = item.quantityStarted || 0;
        if (currentStarted < item.quantityCurrent) {
            const changes = { quantityStarted: currentStarted + 1, status: ItemStatus.USED };
            const updatedItem = { ...item, ...changes };

            setProject(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));

            if (updateItem) await updateItem({ id, ...changes });
        }
    };

    // Updated signature to accept optional price
    const setSurplusAction = async (id: string, action: SurplusAction, resalePrice?: number) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        if (action !== SurplusAction.NONE) {
            let actionName = 'Action inconnue';
            if (action === SurplusAction.MARKETPLACE) actionName = 'Stock Virtuel';
            else if (action === SurplusAction.DONATION) actionName = 'Dons';
            else if (action === SurplusAction.SHORT_FILM) actionName = 'Court-Métrage';
            else if (action === SurplusAction.RELEASED_TO_PROD) actionName = 'Envoi Stock Virtuel';
            else if (action === SurplusAction.BUYBACK) actionName = 'Rachat ABS';

            /*
            addNotification(
                `♻️ Surplus : ${item.name} (${item.department}) déplacé vers ${actionName} par ${user?.name || 'Département'}`,
                'STOCK_MOVE',
                'PRODUCTION'
            );
            */
        }

        const changes: any = { surplusAction: action };

        // Handle Price logic for Marketplace, Donations, Short Films, BUYBACK
        if ((action === SurplusAction.MARKETPLACE || action === SurplusAction.DONATION || action === SurplusAction.SHORT_FILM || action === SurplusAction.BUYBACK) && resalePrice !== undefined) {
            changes.price = resalePrice; // Set new resale price
            // Preserve original if not already set (default to 0 if missing)
            if (!item.originalPrice) {
                changes.originalPrice = item.price ?? 0;
            }
        }

        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        try {
            if (updateItem) await updateItem({ id, ...changes });
        } catch (err: any) {
            console.error("Error updating surplus action:", err);
            alert(`Erreur lors de la mise à jour : ${err.message}`);
        }
    };

    const handleSurplusClick = (item: any, action: SurplusAction) => {
        // 0. Check for Split Necessity
        const needsSplit = (item.quantityStarted || 0) > 0 && (item.quantityStarted || 0) < item.quantityCurrent;

        // 1. BUYBACK: Direct Action (Fixed Price) with Confirmation
        if (action === SurplusAction.BUYBACK) {
            if (needsSplit) {
                setSurplusConfirmation({ item, action });
            } else {
                const originalPrice = item.originalPrice || item.price || 0;
                const buybackPrice = originalPrice * 0.5;
                if (window.confirm(`Vendre cet article à A Better Set pour ${buybackPrice} € (50% de la valeur) ?`)) {
                    setSurplusAction(item.id, action, buybackPrice);
                }
            }
            return;
        }

        // 2. MARKETPLACE: Direct Action (Current Price) with Confirmation
        if (action === SurplusAction.MARKETPLACE) {
            if (needsSplit) {
                setSurplusConfirmation({ item, action });
            } else {
                if (window.confirm("Envoyer cet article au Stock Virtuel ?")) {
                    // Default to current price (Value held in virtual stock)
                    setSurplusAction(item.id, action, item.price || 0);
                }
            }
            return;
        }

        // 3. Donation/ShortFilm Logic: Check/Set Price (Valuation)
        if (action === SurplusAction.DONATION || action === SurplusAction.SHORT_FILM) {
            // If item is being split, we handle price in confirmSurplus ('ALL' mode especially)
            if (needsSplit) {
                setSurplusConfirmation({ item, action });
            } else {
                // Simple Move -> Prompt Price (Value of donation)
                promptForMarketplacePrice(item, action);
            }
            return;
        }

        // 3. Standard Logic (Other transfers)
        if (needsSplit) {
            setSurplusConfirmation({ item, action });
        } else {
            setSurplusAction(item.id, action);
        }
    };

    // Robust Bulk Action Handler - Executed AFTER confirmation
    const executeBulkSurplusAction = async (targets: any[], action: SurplusAction) => {
        // Confirmation is now handled by UI Modal

        const updates: any[] = [];
        const updatePromises: Promise<void>[] = [];

        targets.forEach(target => {
            // Logic to determine changes (similar to setSurplusAction but prepared for batch)
            const resalePrice = action === SurplusAction.MARKETPLACE ? (target.price || 0) : undefined;
            const changes: any = { surplusAction: action };

            if (resalePrice !== undefined) {
                changes.price = resalePrice;
                if (!target.originalPrice) changes.originalPrice = target.price ?? 0;
            }

            const updatedItem = { ...target, ...changes };
            updates.push({ id: target.id, updatedItem, changes });
        });

        // 1. Single Atomic State Update
        setProject(prev => {
            // Create a map of updates for O(1) lookup or just iterate
            const updateMap = new Map(updates.map(u => [u.id, u.updatedItem]));
            return {
                ...prev,
                items: prev.items.map(i => updateMap.get(i.id) || i)
            };
        });

        // 2. Parallel Firestore Updates
        try {
            await Promise.all(updates.map(u =>
                updateItem ? updateItem({ id: u.id, ...u.changes }) : Promise.resolve()
            ));
        } catch (err: any) {
            console.error("Bulk update error:", err);
            alert("Erreur lors de la mise à jour globale. Certains articles n'ont peut-être pas été sauvegardés.");
        }
    };

    // New Helper: Prompt for Price
    const promptForMarketplacePrice = (item: any, action: SurplusAction, onConfirm?: (price: number) => void) => {
        const currentPrice = item.price || 0;
        // Default to 0 for Donations/Short Film unless user wants to set it
        // BUYBACK: 50% of Original Price (Strict)
        let suggestedPrice = 0;
        if (action === SurplusAction.BUYBACK) {
            const originalPrice = item.originalPrice || item.price || 0;
            suggestedPrice = originalPrice * 0.5;
        } else if (action === SurplusAction.MARKETPLACE) {
            // Default to 100% of price (User sets their price, 10% commission is taken later)
            suggestedPrice = currentPrice;
        } else {
            // Donations etc
            suggestedPrice = 0;
        }

        // We need a custom modal for this. Using window.prompt is ugly but functional for MVP. 
        // User requested: "ce prix sera rempli par les factures... ou s'il n'y a pas de facture il faudra definir"
        // Let's use a PROPER Modal state.
        setPriceModal({ item, action, suggestedPrice, onConfirm });
    };

    // State for Price Modal
    const [priceModal, setPriceModal] = React.useState<{ item: any, action: SurplusAction, suggestedPrice: number, onConfirm?: (p: number) => void } | null>(null);

    const handlePriceConfirm = (finalPrice: number) => {
        if (!priceModal) return;
        const { item, action, onConfirm } = priceModal;

        if (onConfirm) {
            onConfirm(finalPrice);
        } else {
            // Default action: Update Item
            setSurplusAction(item.id, action, finalPrice);
        }
        setPriceModal(null);
    };

    const handleSplitSelection = (mode: 'ALL' | 'ONLY_NEW') => {
        if (!surplusConfirmation) return;
        const { item, action } = surplusConfirmation;

        if (action === SurplusAction.BUYBACK) {
            setSurplusConfirmation(null);
            const originalPrice = item.originalPrice || item.price || 0;
            const buybackPrice = originalPrice * 0.5;

            if (window.confirm(`Vendre cet article à A Better Set pour ${buybackPrice} € (50% de la valeur) ?`)) {
                executeSplit(mode, buybackPrice, item, action);
            }
        } else if (action === SurplusAction.MARKETPLACE) {
            setSurplusConfirmation(null);
            if (window.confirm("Envoyer cet article au Stock Virtuel ?")) {
                executeSplit(mode, item.price || 0, item, action);
            }
        } else if (action === SurplusAction.DONATION || action === SurplusAction.SHORT_FILM) {
            // Close Split Modal
            setSurplusConfirmation(null);
            // Open Price Modal
            promptForMarketplacePrice(item, action, (price) => executeSplit(mode, price, item, action));
        } else {
            executeSplit(mode, undefined, item, action);
            setSurplusConfirmation(null);
        }
    };

    const executeSplit = async (mode: 'ALL' | 'ONLY_NEW', resalePrice: number | undefined, item: any, action: SurplusAction) => {
        // Ensure we work with valid quantities
        const startedQty = item.quantityStarted || 0;
        const newQty = item.quantityCurrent - startedQty;

        if (mode === 'ALL') {
            // If sending to Surplus (Marketplace/Donation/etc) and item has started units, split them!
            // This allows keeping the "Started" portion distinct from the "New" portion even if both go to the same destination action (or started stays behind?)
            // Actually logic below sets surplusAction: action for Started portion too.
            if ((action === SurplusAction.MARKETPLACE || action === SurplusAction.DONATION || action === SurplusAction.SHORT_FILM || action === SurplusAction.BUYBACK) && startedQty > 0) {
                // 1. Prepare Objects
                // Original becomes the Started portion
                const updatedOriginalItem = {
                    ...item,
                    quantityCurrent: startedQty,
                    quantityInitial: startedQty,
                    quantityStarted: startedQty,
                    status: ItemStatus.USED,
                    surplusAction: action,
                    price: (resalePrice !== undefined) ? resalePrice : (item.price ?? 0),
                    originalPrice: item.originalPrice ?? item.price ?? 0
                };

                // New Item becomes the New portion -> Virtual Stock
                const newItem = {
                    ...item,
                    id: `${item.id}_surplus_new_${Date.now()}`,
                    quantityCurrent: newQty,
                    quantityInitial: newQty,
                    quantityStarted: 0,
                    status: ItemStatus.NEW,
                    surplusAction: action,
                    purchased: true,
                    isBought: false,
                    price: resalePrice !== undefined ? resalePrice : (item.price ?? 0),
                    originalPrice: item.originalPrice ?? item.price ?? 0 // Preserve
                };

                // 2. Persist to Firestore with Error Handling
                try {
                    if (updateItem) await updateItem(updatedOriginalItem);
                    if (addItem) await addItem(newItem);

                    // 3. Update Local State
                    setProject(prev => ({
                        ...prev,
                        items: [...prev.items.filter(i => i.id !== item.id), updatedOriginalItem, newItem]
                    }));

                    /*
                    addNotification(
                        `♻️ Surplus (Split) : ${item.name} -> ${newQty} Neufs et ${startedQty} Entamés vers Stock Virtuel`,
                        'STOCK_MOVE',
                        'PRODUCTION'
                    );
                    */
                } catch (err: any) {
                    console.error("Error splitting item:", err);
                    alert(`Erreur lors du basculement : ${err.message}`);
                    // Revert local optimistic update if needed? For now just alert.
                }
            } else {
                // Standard behavior (No split needed, just action update)
                // Note: If no split needed but we came here, it means logic error or simplifiction.
                // handleSurplusClick handles non-split marketplace separately.
                // But if 'ALL' is chosen and no started units?
                setSurplusAction(item.id, action, resalePrice);
            }
        } else {
            // mode === 'ONLY_NEW'
            // Split logic: Keep started items (Original), move new items (New Item)
            const updatedOriginalItem = {
                ...item,
                quantityCurrent: startedQty,
                quantityInitial: startedQty,
                status: ItemStatus.USED,
                surplusAction: SurplusAction.NONE, // Reset action for the part we keep
                quantityStarted: startedQty // Explicitly modify
            };

            // New Item: The new units going to Surplus
            const newItem = {
                ...item,
                id: `${item.id}_surplus_${Date.now()}`,
                quantityCurrent: newQty,
                quantityInitial: newQty,
                quantityStarted: 0,
                status: ItemStatus.NEW,
                surplusAction: action,
                purchased: true,
                isBought: false
            };

            if ((action === SurplusAction.MARKETPLACE || action === SurplusAction.DONATION || action === SurplusAction.SHORT_FILM || action === SurplusAction.BUYBACK) && resalePrice !== undefined) {
                newItem.price = resalePrice;
                newItem.originalPrice = item.price;
            }

            if (updateItem) await updateItem(updatedOriginalItem);
            if (addItem) await addItem(newItem);

            setProject(prev => ({
                ...prev,
                items: [...prev.items.filter(i => i.id !== item.id), updatedOriginalItem, newItem]
            }));

            /*
            addNotification(
                `♻️ Surplus (Split) : ${newQty} Neufs vers ${action}, ${startedQty} gardés en Stock`,
                'STOCK_MOVE',
                'PRODUCTION'
            );
            */
        }

        setSurplusConfirmation(null);
    };

    const handleTransfer = async () => {
        if (!transferConfirmation || !targetDept) return;
        const item = transferConfirmation.item;

        // Update the item's department in Firestore
        await updateItem({ id: item.id, department: targetDept });

        // Update local state
        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === item.id ? { ...i, department: targetDept } : i)
        }));

        /*
        addNotification(
            `Transfert de stock : ${currentDept} vous a transféré "${item.name}"`,
            'INFO',
            targetDept
        );
        */

        setTransferConfirmation(null);
    };

    const toggleEmailSelection = (id: string) => {
        const newSelection = new Set(selectedForEmail);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedForEmail(newSelection);
    };

    const handleSendEmail = () => {
        const itemsToSend = project.items.filter(item => selectedForEmail.has(item.id) && !item.isBought);
        if (itemsToSend.length === 0) return;

        const date = new Date().toLocaleDateString('fr-FR');
        const subject = `Commande Achats - ${project.name} - ${date}`;

        let body = `Bonjour,\n\nVoici la liste des achats pour la production "${project.name}" (${project.productionCompany}).\n\nDate: ${date}\n\nArticles :\n`;

        (itemsToSend || []).forEach(item => {
            body += `- ${item.name} (${item.department}) : ${item.quantityInitial} ${item.unit}\n`;
        });

        body += `\nCordialement A Better Set`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // Filter items based on Purchase Status and Current Department view
    const requestedItems = project.items.filter(item => !item.purchased);
    const stockItems = project.items.filter(item => item.purchased && (!item.surplusAction || item.surplusAction === SurplusAction.NONE) && item.quantityCurrent > 0);

    // Further filter by department if not Production view
    const visibleRequests = (currentDept === 'PRODUCTION' || currentDept === Department.REGIE)
        ? requestedItems
        : requestedItems.filter(i => i.department === currentDept);

    // Validation Queue for Production (Items released by Depts)


    const visibleStock = (currentDept === 'PRODUCTION' || currentDept === Department.REGIE)
        ? stockItems
        : stockItems.filter(i => i.department === currentDept);

    // Group by department for clearer view
    const stockByDept = visibleStock.reduce((acc, item) => {
        if (!acc[item.department]) acc[item.department] = [];
        acc[item.department].push(item);
        return acc;
    }, {} as Record<string, typeof project.items>);

    // Group Requests by department for clearer view
    const requestsByDept = visibleRequests.reduce((acc, item) => {
        const dept = item.department || 'Autre';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(item);
        return acc;
    }, {} as Record<string, typeof project.items>);

    // Calculate Marketplace Opportunities
    const opportunities = React.useMemo(() => {
        if (!marketplaceItems.length || !visibleRequests.length) return [];

        const matches: any[] = [];

        (visibleRequests || []).forEach(neededItem => {
            // Find in marketplace by Name (Case Insensitive)
            // AND ensure it's not our own item
            const marketMatches = marketplaceItems.filter(m =>
                m.name.toLowerCase().trim() === neededItem.name.toLowerCase().trim() &&
                m.projectId !== project.id
            );

            if (marketMatches.length > 0) {
                // Sort by price ascending (cheapest first)
                marketMatches.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
                const bestMatch = marketMatches[0];

                matches.push({
                    neededItem,
                    marketItem: bestMatch,
                    saving: (neededItem.price || 0) - (bestMatch.price || 0),
                    cost: bestMatch.price || 0
                });
            }
        });

        return matches;
    }, [marketplaceItems, visibleRequests, project.id]);

    const opportunityCosts = React.useMemo(() => {
        let prod = 0;
        let regie = 0;

        (opportunities || []).forEach(op => {
            // Determine quantity needed (up to what's available)
            const quantityToBuy = Math.min(op.neededItem.quantityInitial, op.marketItem.quantityCurrent);
            const cost = (op.marketItem.price || 0) * quantityToBuy;

            if (op.neededItem.department === 'PRODUCTION') prod += cost;
            else regie += cost; // Assign others to Regie as per request logic approximation (or just non-prod)
        });
        return { prod, regie };
    }, [opportunities]);

    const handleDirectOrder = async (op: { neededItem: any, marketItem: any }) => {
        if (!user) return;
        const confirmMsg = `Voulez-vous commander "${op.marketItem.name}" à ${op.marketItem.productionName} pour ${op.marketItem.price} € ?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            // 1. Create Transaction
            const qtyToBuy = Math.min(op.neededItem.quantityInitial, op.marketItem.quantityCurrent);

            const transactionData: Omit<Transaction, 'id'> = {
                sellerId: op.marketItem.projectId,
                sellerName: op.marketItem.productionName || 'Unknown Production',
                buyerId: project.id,
                buyerName: project.productionCompany || project.name || 'Unknown Buyer',
                items: [{
                    id: op.marketItem.id,
                    name: op.marketItem.name,
                    quantity: qtyToBuy,
                    price: op.marketItem.price || 0
                }],
                totalAmount: (op.marketItem.price || 0) * qtyToBuy,
                platformFee: ((op.marketItem.price || 0) * qtyToBuy) * 0.10, // 10% Commission
                status: 'PENDING',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'transactions'), transactionData);

            // 2. Decrement Seller Stock (Direct Firestore)
            await updateDoc(doc(db, 'projects', op.marketItem.projectId, 'items', op.marketItem.id), {
                quantityCurrent: increment(-qtyToBuy)
            });

            // 3. Update Local Request to "Ordered"
            if (updateItem) {
                await updateItem({
                    id: op.neededItem.id,
                    isBought: true,
                    price: op.marketItem.price,
                    originalPrice: op.marketItem.price,
                    quantityCurrent: qtyToBuy // Update stock with bought quantity
                });
            }

            addNotification(
                `Commande envoyée à ${op.marketItem.productionName}`,
                'SUCCESS',
                Department.REGIE
            );

            // Quick fix to update UI
            setMarketplaceItems(prev => prev.map(p => {
                if (p.id === op.marketItem.id) {
                    return { ...p, quantityCurrent: p.quantityCurrent - qtyToBuy };
                }
                return p;
            }).filter(p => p.quantityCurrent > 0));

        } catch (error: any) {
            console.error("error", error);
            addNotification("Erreur commande: " + error.message, 'ERROR');
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white">Stock & Achats</h2>
                    <p className="text-slate-400 mt-1">
                        {currentDept === 'PRODUCTION'
                            ? "Gérez la liste d'achats globale et suivez l'inventaire."
                            : "Commandez vos consommables et gérez votre stock départemental."}
                    </p>
                </div>
                <div className="flex gap-4">
                    {selectedForExpense.size > 0 && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <button
                                onClick={() => setSelectedForExpense(new Set())}
                                className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Annuler la sélection"
                            >
                                <Undo2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                                <Receipt className="h-5 w-5" />
                                Créer Note de Frais ({selectedForExpense.size})
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setTemplateMode('MANAGE');
                            setIsTemplateModalOpen(true);
                        }}
                        className="bg-cinema-700 hover:bg-cinema-600 text-slate-200 px-4 py-2 rounded-lg font-medium border border-cinema-600 flex items-center gap-2 transition-all"
                    >
                        <GraduationCap className="h-5 w-5" />
                        Mes Listes
                    </button>

                    <button
                        onClick={() => {
                            if (project.items.length === 0) {
                                alert("L'inventaire est vide.");
                                return;
                            }
                            setTemplateMode('SAVE');
                            setIsTemplateModalOpen(true);
                        }}
                        className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:text-white hover:bg-cinema-700 transition-all"
                        title="Sauvegarder cet inventaire comme modèle"
                    >
                        <Save className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-eco-900/20 flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <PlusCircle className="h-5 w-5" />
                        Nouvelle Demande
                    </button>
                </div>
            </header>



            <ErrorBoundary>
                <AddItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                />
            </ErrorBoundary>

            <ExpenseReportModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
            />

            {/* SECTION 0: VALIDATION QUEUE (PRODUCTION ONLY) */}


            {/* Surplus Confirmation Modal */}
            {surplusConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Confirmation d'envoi</h3>
                        <p className="text-slate-300 mb-6">
                            Cet article contient à la fois des unités <strong>neuves</strong> et <strong>entamées</strong>.
                            Que souhaitez-vous envoyer ?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleSplitSelection('ONLY_NEW')}
                                className="w-full p-4 rounded-lg bg-eco-600/20 border border-eco-500/50 hover:bg-eco-600/30 text-left transition-all group"
                            >
                                <div className="font-bold text-eco-400 group-hover:text-eco-300">Uniquement le neuf</div>
                                <div className="text-sm text-slate-400">
                                    Envoyer {surplusConfirmation.item.quantityCurrent - (surplusConfirmation.item.quantityStarted || 0)} unités neuves.
                                    <br />
                                    Garder {surplusConfirmation.item.quantityStarted} unités entamées ici.
                                </div>
                            </button>

                            <button
                                onClick={() => handleSplitSelection('ALL')}
                                className="w-full p-4 rounded-lg bg-cinema-700/50 border border-cinema-600 hover:bg-cinema-700 text-left transition-all"
                            >
                                <div className="font-bold text-white">Tout envoyer</div>
                                <div className="text-sm text-slate-400">
                                    Envoyer la totalité ({surplusConfirmation.item.quantityCurrent} unités), y compris l'entamé.
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setSurplusConfirmation(null)}
                            className="mt-6 w-full py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
            {/* Price Confirmation Modal */}
            {priceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {priceModal.action === SurplusAction.DONATION ? 'Valeur du Don' :
                                priceModal.action === SurplusAction.NONE ? "Prix d'Achat (Optionnel)" :
                                    priceModal.action === SurplusAction.BUYBACK ? "Rachat A Better Set" :
                                        'Prix de Revente'}
                        </h3>
                        <p className="text-slate-300 mb-6">
                            {priceModal.action === SurplusAction.DONATION ? 'Souhaitez-vous définir une valeur pour ce don ? (Facultatif)' :
                                priceModal.action === SurplusAction.NONE ? "Veuillez indiquer le prix d'achat si vous l'avez (sinon laissez 0)." :
                                    priceModal.action === SurplusAction.BUYBACK ? "A Better Set rachète cet article à 50% de sa valeur d'origine." :
                                        'Quel est votre prix de revente ?'}
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                {priceModal.action === SurplusAction.MARKETPLACE ? 'Prix de vente (€)' : 'Prix (€)'}
                            </label>
                            <input
                                type="number"
                                autoFocus
                                defaultValue={priceModal.suggestedPrice}
                                id="resalePriceInput"
                                readOnly={priceModal.action === SurplusAction.BUYBACK}
                                className={`w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none ${priceModal.action === SurplusAction.BUYBACK ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                            {priceModal.suggestedPrice > 0 && priceModal.action === SurplusAction.MARKETPLACE && (
                                <p className="text-xs text-emerald-400 mt-2">
                                    💡 Suggéré : {priceModal.suggestedPrice}€ (Prix d'achat)
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setPriceModal(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.getElementById('resalePriceInput') as HTMLInputElement;
                                    const val = parseFloat(input.value);
                                    if (!isNaN(val) && val >= 0) {
                                        handlePriceConfirm(val);
                                    }
                                }}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors text-white ${priceModal.action === SurplusAction.DONATION ? 'bg-purple-600 hover:bg-purple-500' :
                                    'bg-emerald-600 hover:bg-emerald-500'
                                    }`}
                            >
                                {priceModal.action === SurplusAction.MARKETPLACE ? 'Valider la mise en vente' :
                                    priceModal.action === SurplusAction.BUYBACK ? 'Confirmer la Vente' : 'Valider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION: MARKETPLACE OPPORTUNITIES */}
            {opportunities.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl border border-emerald-500/30 overflow-hidden mb-8 animate-in slide-in-from-top-4 shadow-2xl shadow-emerald-900/20">
                    <div className="px-6 py-4 border-b border-emerald-500/30 flex flex-col md:flex-row justify-between items-center bg-emerald-900/20 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 animate-pulse">
                                <RefreshCw className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    Disponible sur A Better Set
                                    <span className="text-xs bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold">ECO</span>
                                </h3>
                                <p className="text-xs text-emerald-200/70">
                                    {opportunities.length} articles de votre liste sont disponibles en seconde main !
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-emerald-500/10">
                        {opportunities.map((op, idx) => (
                            <div key={idx} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{op.neededItem.name}</span>
                                        <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded">
                                            {op.neededItem.department}
                                        </span>
                                    </div>
                                    <p className="text-sm text-emerald-200/60 flex items-center gap-2">
                                        <span className="line-through text-slate-600">Neuf ?</span>
                                        <span>👉 Dispo chez <strong className="text-white">{op.marketItem.productionName || "Une autre prod"}</strong> ({op.marketItem.quantityCurrent} dispo)</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-bold text-emerald-400 text-lg">{op.marketItem.price} €</div>
                                        <div className="text-xs text-emerald-600">l'unité</div>
                                    </div>
                                    {op.neededItem.isBought ? (
                                        <button
                                            disabled
                                            className="px-4 py-2 bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-bold flex items-center gap-2 cursor-not-allowed"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Commandé
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleDirectOrder(op)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 group"
                                        >
                                            <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                            Commander sur A Better Set
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 1: SHOPPING LIST (REQUESTS) */}
            <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-cinema-700 flex justify-between items-center bg-gradient-to-r from-cinema-800 to-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Liste d'Achats</h3>
                            <p className="text-xs text-slate-400">
                                {visibleRequests.length} articles en attente d'achat
                            </p>
                        </div>
                    </div>
                    {selectedForEmail.size > 0 && (
                        <button
                            onClick={handleSendEmail}
                            className="bg-cinema-700 hover:bg-cinema-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors border border-cinema-600"
                        >
                            <Mail className="h-4 w-4" />
                            Envoyer sélection ({selectedForEmail.size})
                        </button>
                    )}
                </div>

                <div className="divide-y divide-cinema-700/50">
                    {visibleRequests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic">
                            Aucune demande d'achat en attente.
                        </div>
                    ) : (
                        Object.entries(requestsByDept).map(([dept, items]) => {
                            const isProductionOrRegie = currentDept === 'PRODUCTION' || currentDept === 'Régie' || currentDept === 'REGIE';
                            const isExpanded = isProductionOrRegie ? expandedDepts.has(dept) : true;

                            return (
                                <div key={dept} className="border-b border-cinema-700/50 last:border-0">
                                    {/* Department Header - Clickable Accordion (Only for Prod/Regie) */}
                                    {isProductionOrRegie && (
                                        <button
                                            onClick={() => toggleDeptExpansion(dept)}
                                            className="w-full bg-cinema-900/40 px-6 py-3 border-y border-cinema-800 flex items-center justify-between hover:bg-cinema-800/60 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1 rounded-full bg-cinema-800 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider group-hover:text-white transition-colors">{dept}</h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs bg-cinema-800 px-2 py-1 rounded-full text-slate-400 font-medium border border-cinema-700">
                                                    {items.length} {items.length > 1 ? 'articles' : 'article'}
                                                </span>
                                            </div>
                                        </button>
                                    )}

                                    {/* Collapsible Content */}
                                    {isExpanded && (
                                        <div className="divide-y divide-cinema-700/30 bg-cinema-900/20 animate-in slide-in-from-top-1 duration-200">
                                            {items.map(item => {
                                                const isProductionOrRegie = currentDept === 'PRODUCTION';
                                                return (
                                                    <div key={item.id} className="p-4 pl-12 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-cinema-700/20 transition-colors border-l-4 border-transparent hover:border-cinema-700">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            {!item.isBought && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedForEmail.has(item.id)}
                                                                    onChange={() => toggleEmailSelection(item.id)}
                                                                    className="h-5 w-5 rounded border-cinema-600 bg-cinema-900 text-eco-500 focus:ring-eco-500 focus:ring-offset-cinema-900 cursor-pointer"
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-white">{item.name}</span>
                                                                    {item.isBought && (
                                                                        <span className="text-xs bg-blue-900/50 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                                            <CheckCircle2 className="h-3 w-3" /> ACHETÉ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-slate-500">Quantité demandée: {item.quantityInitial} {item.unit}</p>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        {isProductionOrRegie ? (
                                                            // View for Production/Regie
                                                            item.isBought ? (
                                                                <button
                                                                    onClick={() => markAsPurchased(item.id)}
                                                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                                                                >
                                                                    <PackageCheck className="h-4 w-4" />
                                                                    Valider Réception
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => markAsBought(item.id)}
                                                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                    À acheter
                                                                </button>
                                                            )
                                                        ) : (
                                                            // View for Departments
                                                            <div className="flex gap-2">
                                                                <div className="flex items-center gap-3 bg-cinema-800/50 px-3 py-2 rounded-lg border border-cinema-700">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedForExpense.has(item.id)}
                                                                        onChange={() => toggleExpenseSelection(item.id)}
                                                                        className="h-5 w-5 rounded border-cinema-600 bg-cinema-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                                    />
                                                                    <span className="text-sm text-slate-300 font-medium">Acheté soi-même</span>
                                                                </div>

                                                                <button
                                                                    onClick={() => markAsPurchased(item.id)}
                                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${item.isBought
                                                                        ? 'bg-green-600 hover:bg-green-500 text-white animate-pulse'
                                                                        : 'bg-eco-600 hover:bg-eco-500 text-white'
                                                                        }`}
                                                                >
                                                                    <PackageCheck className="h-4 w-4" />
                                                                    {item.isBought ? 'Valider Réception' : 'Marquer reçu'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* SECTION 2: ACTIVE STOCK */}
            <div className="space-y-6 mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-cinema-700"></div>
                    <h3 className="text-xl font-bold text-slate-300 uppercase tracking-wider">Stock En Cours</h3>
                    <div className="h-px flex-1 bg-cinema-700"></div>
                </div>

                {Object.keys(stockByDept).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-cinema-800 rounded-xl border border-cinema-700 border-dashed">
                        Votre inventaire est vide. Validez les achats ci-dessus pour remplir le stock.
                    </div>
                ) : (
                    Object.keys(stockByDept).sort((a, b) => a.localeCompare(b)).map(dept => {
                        const isExpanded = expandedDepts.has(`stock_${dept}`);
                        const deptItems = groupStockItems(stockByDept[dept]);

                        return (
                            <div key={dept} className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                                <button
                                    onClick={() => toggleDeptExpansion(`stock_${dept}`)}
                                    className="w-full bg-cinema-700/40 px-6 py-3 border-b border-cinema-700 flex items-center justify-between hover:bg-cinema-700/60 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-white">{dept}</h3>
                                        <span className="bg-cinema-900 text-slate-400 text-xs px-2 py-0.5 rounded-full border border-cinema-600">
                                            {deptItems.length} types d'articles
                                        </span>
                                    </div>
                                    <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="divide-y divide-cinema-700 animate-in slide-in-from-top-1 duration-200">
                                        {deptItems.map(aggregatedItem => {
                                            const item = aggregatedItem;
                                            const percentage = (item.quantityCurrent / item.quantityInitial) * 100;
                                            const isSurplus = item.surplusAction && item.surplusAction !== SurplusAction.NONE;
                                            const isStarted = item.isStartedView;

                                            return (
                                                <div key={item.id + (isStarted ? '_started' : '_new')} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-lg text-white">
                                                                {item.name}
                                                                {item.items.length > 1 && (
                                                                    <span className="ml-2 text-xs text-slate-500 bg-cinema-900 px-2 py-0.5 rounded-full">
                                                                        x{item.items.length}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isStarted ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                                {isStarted ? 'Entamé' : 'Neuf'}
                                                            </span>
                                                            <span className="text-xs font-mono text-slate-400 border border-cinema-700 px-2 py-0.5 rounded bg-cinema-900/50">
                                                                {item.price !== undefined ? `${item.price} €` : '- €'}
                                                            </span>
                                                            {isSurplus && (
                                                                <span className={`text-xs px-2 py-0.5 rounded border ${item.surplusAction === SurplusAction.MARKETPLACE
                                                                    ? 'bg-blue-900/50 text-blue-400 border-blue-500/30'
                                                                    : 'bg-purple-900/50 text-purple-400 border-purple-500/30'
                                                                    }`}>
                                                                    {item.surplusAction === SurplusAction.MARKETPLACE ? 'En Stock Virtuel' : 'En Don'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-end gap-3 mt-4 sm:mt-0">
                                                        {/* Start Button (Only for New items) */}
                                                        {!isSurplus && !isStarted && item.quantityCurrent > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    const target = item.items.find(i => (i.quantityStarted || 0) < i.quantityCurrent);
                                                                    if (target) incrementStarted(target.id);
                                                                }}
                                                                className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-orange-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                                                                title="Entamer un article"
                                                            >
                                                                <PackageOpen className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {/* Surplus Actions */}
                                                        {!isSurplus && item.quantityCurrent > 0 && (
                                                            <div className="flex gap-2 mr-4">
                                                                {!isStarted && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            const targets = item.items.filter((i: any) => (i.quantityCurrent - (i.quantityStarted || 0)) > 0);

                                                                            if (targets.length === 0) {
                                                                                alert("Aucun article disponible pour l'envoi (Stock épuisé ou entamé).");
                                                                                return;
                                                                            }

                                                                            // Always send to RELEASED_TO_PROD first so Production can decide (Sell, Donate, Store)
                                                                            const action = SurplusAction.RELEASED_TO_PROD;
                                                                            setBulkSurplusConfirmation({ targets, action });
                                                                        }}
                                                                        type="button"
                                                                        className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                                                        title="Envoyer vers Économie Circulaire"
                                                                    >
                                                                        <RefreshCw className="h-4 w-4" />
                                                                    </button>
                                                                )}

                                                            </div>
                                                        )}

                                                        {isSurplus && (
                                                            // Condition for Undo:
                                                            // 1. Production can always undo.
                                                            // 2. Department can ONLY undo if status is RELEASED_TO_PROD (before validation).
                                                            // 3. If item is MARKETPLACE, DONATION or SHORT_FILM, Dept CANNOT undo.
                                                            (user?.department === 'PRODUCTION' || item.surplusAction === SurplusAction.RELEASED_TO_PROD) && (
                                                                <button
                                                                    onClick={() => {
                                                                        const target = item.items[0];
                                                                        if (target) setSurplusAction(target.id, SurplusAction.NONE);
                                                                    }}
                                                                    className="p-2 mr-4 rounded-lg border border-cinema-600 text-slate-500 hover:text-slate-300 hover:bg-cinema-700 transition-all"
                                                                    title="Annuler l'envoi"
                                                                >
                                                                    <Undo2 className="h-4 w-4" />
                                                                </button>
                                                            )
                                                        )}
                                                        {/* Transfer Button - Only for current dept items */}
                                                        <button
                                                            onClick={() => setTransferConfirmation({ item })}
                                                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors"
                                                            title="Transférer à un autre département"
                                                        >
                                                            <ArrowRightLeft className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                // Handle Delete
                                                                if (!deleteItem) return;

                                                                // Warn if mixed (Neuf/Started) or multiple items
                                                                const isMixed = item.items.length > 1; // Assuming groupings imply potentially different states if checking raw docs
                                                                // Check if any sub-item has BOTH started and curr? No, sub-items are raw docs.
                                                                // If I delete this row, I delete all contributing docs?
                                                                // For safety: Delete ALL docs associated with this line.
                                                                // Message:
                                                                const msg = isMixed
                                                                    ? `Cet article regroupe ${item.items.length} éléments (potentiellement un mélange Neuf/Entamé si mal séparé, ou plusieurs entrées).\nTout supprimer ?`
                                                                    : "Supprimer définitivement cet article ?";

                                                                if (window.confirm(msg)) {
                                                                    for (const subItem of item.items) {
                                                                        await deleteItem(subItem.id);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Supprimer l'article"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>

                                                        {/* Quantity Controls */}
                                                        <div className="flex items-center gap-4 bg-cinema-900 p-2 rounded-lg border border-cinema-700">
                                                            <button
                                                                onClick={() => {
                                                                    const target = item.items.find(i => i.quantityCurrent > 0);
                                                                    if (target) updateQuantity(target.id, -1);
                                                                }}
                                                                className="p-2 rounded-md hover:bg-cinema-700 text-slate-300 hover:text-white transition-colors"
                                                            >
                                                                <Minus className="h-5 w-5" />
                                                            </button>

                                                            <div className="text-center w-24">
                                                                <span className="block text-xl font-bold text-white">{item.quantityCurrent}</span>
                                                                <span className="text-xs text-slate-500">/ {item.quantityInitial} {item.unit}</span>
                                                            </div>

                                                            <button
                                                                onClick={() => {
                                                                    const target = item.items[0];
                                                                    if (target) updateQuantity(target.id, 1);
                                                                }}
                                                                className="p-2 rounded-md hover:bg-cinema-700 text-slate-300 hover:text-white transition-colors"
                                                            >
                                                                <Plus className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                                }
                            </div>
                        );
                    })
                )}
            </div>
            {/* Transfer Confirmation Modal */}
            {
                transferConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-cinema-800 rounded-xl shadow-2xl max-w-md w-full border border-cinema-600 p-6 space-y-6">
                            <div className="text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/30 mb-4 border border-blue-500/30">
                                    <ArrowRightLeft className="h-6 w-6 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Transférer cet article ?</h3>
                                <p className="text-slate-400 mt-2 text-sm">
                                    Vous allez transférer <strong>{transferConfirmation.item.name}</strong>.
                                    <br />Veuillez choisir le département destinataire :
                                </p>
                            </div>

                            <div>
                                <select
                                    value={targetDept}
                                    onChange={(e) => setTargetDept(e.target.value as Department | 'PRODUCTION')}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="PRODUCTION">PRODUCTION</option>
                                    {Object.values(Department).filter(d => d !== currentDept).map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setTransferConfirmation(null)}
                                    className="flex-1 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-cinema-700 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Bulk Surplus Confirmation Modal */}
            {
                bulkSurplusConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-cinema-800 rounded-xl shadow-2xl max-w-md w-full border border-cinema-600 p-6 space-y-6">
                            <div className="text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/30 mb-4 border border-blue-500/30">
                                    <RefreshCw className="h-6 w-6 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">
                                    {user?.department === 'PRODUCTION'
                                        ? "Envoyer vers Éco Circulaire (À Trier) ?"
                                        : "Libérer vers la Production ?"}
                                </h3>
                                <p className="text-slate-400 mt-2 text-sm">
                                    Vous allez déplacer <strong>{bulkSurplusConfirmation.targets.length}</strong> articles.
                                    <br />Ils seront visibles dans l'onglet "Économie Circulaire".
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setBulkSurplusConfirmation(null)}
                                    className="flex-1 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-cinema-700 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        executeBulkSurplusAction(bulkSurplusConfirmation.targets, bulkSurplusConfirmation.action);
                                        setBulkSurplusConfirmation(null);
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Template Modal */}
            <TemplateManagerModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                mode={templateMode}
                currentStockToSave={project.items.filter(i => i.department === currentDept || currentDept === 'PRODUCTION')}
            />

        </div>
    );
};
