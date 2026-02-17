
import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useNotification } from '../context/NotificationContext'; // Added
import { Department, LogisticsRequest, LogisticsType } from '../types';
import { Truck, ChevronLeft, ChevronRight, Plus, X, Calendar, MapPin, Clock, FileText, User, ChevronDown, ChevronRight as ChevronRightIcon, Package, AlertTriangle } from 'lucide-react';

export const LogisticsWidget: React.FC = () => {
    const { project, updateProjectDetails, user, currentDept, setCurrentDept, addNotification, addLogisticsRequest, deleteLogisticsRequest } = useProject();
    const { notifications, markAsRead } = useNotification(); // Added

    // Auto-clear notifications for Production
    React.useEffect(() => {
        if (user?.department === 'PRODUCTION' || user?.department === Department.REGIE) {
            const unread = notifications.filter(n => !n.read && (n.message.toLowerCase().includes('transport') || n.targetDept === 'PRODUCTION'));
            if (unread.length > 0) {
                unread.forEach(n => markAsRead(n.id));
            }
        }
    }, [user, notifications, markAsRead]);

    // --- Production View State ---
    const [prodSelectedWeek, setProdSelectedWeek] = useState<string | null>(null);
    const [prodExpandedDays, setProdExpandedDays] = useState<string[]>([]);
    // If Production wants to manage their own requests, they also need viewMode
    const [viewMode, setViewMode] = useState<'OVERVIEW' | 'MY_REQUESTS'>('OVERVIEW');
    const [collapsedWeeks, setCollapsedWeeks] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false); // New explicit visibility state

    const toggleWeek = (weekKey: string) => {
        setCollapsedWeeks(prev =>
            prev.includes(weekKey)
                ? prev.filter(k => k !== weekKey)
                : [...prev, weekKey]
        );
    };

    // --- DRAG AND DROP STATE ---
    const [isDragging, setIsDragging] = useState(false);
    const [isMultiDay, setIsMultiDay] = useState(false); // New
    const [useFullDuration, setUseFullDuration] = useState(false); // New

    // --- CUSTOM CONFIRM DIALOG STATE ---
    const [confirmDialog, setConfirmDialog] = useState<{ message: string; onYes: () => void; onNo: () => void } | null>(null);

    const showConfirm = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmDialog({
                message,
                onYes: () => { setConfirmDialog(null); resolve(true); },
                onNo: () => { setConfirmDialog(null); resolve(false); }
            });
        });
    };

    const navThrottleRef = React.useRef<number>(0);

    // Helper: Get Week Info (Relative to Shooting Start or ISO)
    const getWeekInfo = (d: Date) => {
        // 1. Try Relative to Shooting Start
        if (project.shootingStartDate) {
            const start = new Date(project.shootingStartDate);
            const target = new Date(d);
            target.setHours(0, 0, 0, 0);

            // Align start to the Monday of the shooting week to ensure standard weeks (Mon-Sun)
            // standard ISO Monday alignment
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            const alignedStart = new Date(start);
            alignedStart.setDate(diff);
            alignedStart.setHours(0, 0, 0, 0);

            // Use UTC for day difference calculation to avoid DST issues (23h/25h days)
            const startUTC = Date.UTC(alignedStart.getFullYear(), alignedStart.getMonth(), alignedStart.getDate());
            const targetUTC = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());

            const diffTime = targetUTC - startUTC;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Ensure we don't have negative weeks if something is before the very first Monday (e.g. prep)
            // But usually week 1 is the week of shooting start.
            const weekNum = Math.floor(diffDays / 7) + 1;

            const weekStart = new Date(alignedStart);
            weekStart.setDate(alignedStart.getDate() + (weekNum - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            return {
                week: weekNum,
                label: `Semaine ${weekNum} (${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`,
                key: `S${weekNum}`
            };
        }

        // 2. Fallback to ISO Week
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

        // Calculate ISO Week dates
        const simple = new Date(Date.UTC(d.getUTCFullYear(), 0, 1 + (weekNo - 1) * 7));
        const dow = simple.getUTCDay();
        const monday = simple;
        if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
        else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);

        return {
            week: weekNo,
            label: `Semaine ${weekNo} (${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`,
            key: `${d.getUTCFullYear()}-${weekNo}`
        };
    };

    const groupedByWeek = useMemo(() => {
        const groups: Record<string, { label: string, count: number, days: string[] }> = {};
        const allDates = (project.logistics || []).map(r => r.date).sort();
        if (allDates.length === 0) return {};

        (project.logistics || []).forEach(r => {
            const d = new Date(r.date);
            const { key, label } = getWeekInfo(d);

            if (!groups[key]) {
                groups[key] = {
                    label,
                    count: 0,
                    days: []
                };
            }
            groups[key].count += 1;
            if (!groups[key].days.includes(r.date)) groups[key].days.push(r.date);
        });
        return groups;
    }, [project.logistics, project.shootingStartDate]);

    const toggleProdDay = (dateStr: string) => {
        setProdExpandedDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    };

    // --- Department View State ---
    const [selectedDate, setSelectedDate] = useState(new Date());

    const getWeekDays = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };
    const days = getWeekDays(selectedDate);
    const weekStart = days[0];

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    // --- Form State ---
    const [addingToDate, setAddingToDate] = useState<string | null>(null);
    const [newType, setNewType] = useState<LogisticsType>('roundtrip');
    const [newTime, setNewTime] = useState('09:00'); // Default to 09:00
    const [newLocation, setNewLocation] = useState('');
    const [newDescription, setNewDescription] = useState('');
    // Contact removed as per user request
    const [newVehicle, setNewVehicle] = useState<'HGV' | 'Truck' | 'Van' | 'Car' | 'Scooter'>('Van');
    // Distance removed as per user request
    const [linkedSequenceId, setLinkedSequenceId] = useState('');
    const [creationMode, setCreationMode] = useState<'DATE' | 'SEQUENCE' | 'LOCATION'>('DATE'); // Added LOCATION
    const [linkedLocation, setLinkedLocation] = useState(''); // Added
    const [linkType, setLinkType] = useState<'PRELIGHT' | 'DEMONTAGE' | 'SHOOTING'>('SHOOTING'); // Added
    const [duration, setDuration] = useState(1); // Added
    const [modalStep, setModalStep] = useState<'SELECTION' | 'FORM'>('SELECTION'); // Wizard Step
    const [targetDate, setTargetDate] = useState<string>(''); // Utilization/Reference Date
    const [returnDate, setReturnDate] = useState<string>(''); // Explicit Return Date
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

    // Reset Target Date when opening
    React.useEffect(() => {
        if (modalStep === 'SELECTION' && !editingRequestId) {
            setTargetDate(addingToDate || ''); // If opened via grid, use that as initial target
            setReturnDate('');
        }
    }, [modalStep, editingRequestId]);

    // Auto-calculate dates based on Sequence selection
    React.useEffect(() => {
        if (linkedSequenceId && project.pdtSequences) {
            const seq = project.pdtSequences.find(s => s.id === linkedSequenceId);
            if (seq) {
                setTargetDate(seq.date);
            }
        }
    }, [linkedSequenceId, project.pdtSequences]);

    // Auto-fill Dates when Target Date is selected (for Manual or Simple modes)
    React.useEffect(() => {
        if (!targetDate) return;
        if (useFullDuration && isMultiDay) return; // SKIP if using full duration logic

        try {
            const t = new Date(targetDate);
            if (isNaN(t.getTime())) return; // Safety check

            const pickup = new Date(t);
            pickup.setDate(t.getDate() - 1);
            if (pickup.getDay() === 0) pickup.setDate(pickup.getDate() - 1); // If Sunday, move to Saturday
            setAddingToDate(pickup.toISOString().split('T')[0]);

            const ret = new Date(t);
            ret.setDate(t.getDate() + 1);
            if (ret.getDay() === 0) ret.setDate(ret.getDate() + 1); // If Sunday, move to Monday
            setReturnDate(ret.toISOString().split('T')[0]);
        } catch (e) {
            console.error("Error calculating dates", e);
        }

    }, [targetDate, useFullDuration, isMultiDay]); // Only when targetDate (Use Date) changes

    // Auto-calculate dates based on Linked Location
    React.useEffect(() => {
        if (creationMode === 'LOCATION' && linkedLocation && project.pdtDays) {
            const locDays = project.pdtDays
                .filter(d => (d.linkedLocation === linkedLocation || d.location === linkedLocation))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Detect Multi-Day
            const multi = locDays.length > 1;
            setIsMultiDay(multi);
            if (!multi) setUseFullDuration(false); // Reset if single day

            if (locDays.length > 0) {
                const firstDay = new Date(locDays[0].date);
                const lastDay = new Date(locDays[locDays.length - 1].date);
                let refDateStart = firstDay;
                let refDateEnd = lastDay;

                if (linkType === 'PRELIGHT') {
                    // Start D-duration
                    const d = new Date(firstDay);
                    d.setDate(d.getDate() - duration);
                    refDateStart = d;
                    refDateEnd = d;
                } else if (linkType === 'DEMONTAGE') {
                    const d = new Date(lastDay);
                    d.setDate(d.getDate() + 1);
                    refDateStart = d;
                    const e = new Date(d);
                    e.setDate(e.getDate() + duration - 1);
                    refDateEnd = e;
                } else {
                    // SHOOTING (Standard)
                    if (useFullDuration && multi) {
                        // Full Duration Logic: Pickup J-2 (from start), Return J+1 (from end)
                        // Actually, we set addingToDate and returnDate directly here.
                        // And we must avoid the targetDate effect overwriting us.

                        // Pickup = First Day - 2
                        const p = new Date(firstDay);
                        p.setDate(firstDay.getDate() - 2);
                        if (p.getDay() === 0) p.setDate(p.getDate() - 1); // Sunday -> Saturday

                        // Return = Last Day + 1
                        const r = new Date(lastDay);
                        r.setDate(lastDay.getDate() + 1);
                        if (r.getDay() === 0) r.setDate(r.getDate() + 1); // Sunday -> Monday

                        setAddingToDate(p.toISOString().split('T')[0]);
                        setReturnDate(r.toISOString().split('T')[0]);
                        setTargetDate(firstDay.toISOString().split('T')[0]); // Visual Ref
                        return; // EXIT to avoid falling through or triggering other effects unwantingly
                    }
                }

                // Default Logic (Single Day or Range Start)
                const startStr = refDateStart.toISOString().split('T')[0];
                const endStr = refDateEnd.toISOString().split('T')[0];

                // If not using full duration, we behave as before (targetDate triggers J-1/J+1)
                // We set targetDate to startStr.
                setTargetDate(startStr);
                // The other effect will see targetDate change and set Pickup J-1, Return J+1.
            }
        }
    }, [creationMode, linkedLocation, linkType, duration, project.pdtDays, useFullDuration]);

    const getRequests = (dateStr: string, dept: string) => {
        return (project.logistics || []).filter(r => r.date === dateStr && r.department === dept);
    };

    const resetForm = () => {
        setIsModalOpen(false);
        setAddingToDate(null);
        setReturnDate('');
        setNewLocation('');
        setNewDescription('');
        setNewTime('09:00');
        // Contact removed
        setLinkedSequenceId('');
        setLinkedLocation('');
        setLinkType('SHOOTING');
        setDuration(1);
        setEditingRequestId(null);
        setModalStep('SELECTION');
        setTargetDate('');
    };

    const openEditModal = (req: LogisticsRequest) => {
        if (req.type === 'usage') return; // Prevent editing usage requests
        setEditingRequestId(req.id);
        setAddingToDate(req.date);
        setNewType(req.type);
        setNewTime(req.time);
        setNewLocation(req.location);
        setNewDescription(req.description ? req.description.replace(/ \((ALLER|RETOUR|UTILISATION|ENLÈVEMENT|RESTITUTION|Tournage)\)/i, '') : '');
        // Contact removed
        setNewVehicle(req.vehicleType || 'Van');
        // Distance removed

        if (req.linkedSequenceId) {
            setLinkedSequenceId(req.linkedSequenceId);
            setCreationMode('SEQUENCE');
            // Target Date will auto-set via effect
        } else {
            setCreationMode('DATE');
            // Edit atomic request
            setTargetDate(req.date);
        }


        setModalStep('FORM');
        setIsModalOpen(true);
    };

    const handleAddRequest = async () => {
        // Validation
        if (!editingRequestId && !targetDate && !addingToDate) return;
        if (!newLocation) return;

        const targetDept = user?.department === 'PRODUCTION' ? currentDept : user?.department;
        if (!targetDept) return;

        // --- EDIT MODE ---
        if (editingRequestId) {
            const allRequests = project.logistics || [];
            const updatedReqs = allRequests.map(r => {
                if (r.id === editingRequestId) {
                    return {
                        ...r,
                        linkedLocation: linkedLocation || undefined, // Add linking to update
                        linkType: linkedLocation ? linkType : undefined,
                        dayOffset: dayOffset, // Edit mode doesn't recalculate offset yet, simplistic for now
                        duration: duration,
                        date: addingToDate!, // Allow changing date
                        type: newType,
                        time: newTime || '09:00',
                        location: newLocation,
                        description: newDescription,
                        // Contact removed
                        vehicleType: newVehicle,
                        distanceKm: 0,
                        linkedSequenceId: linkedSequenceId || null,
                        autoUpdateDates: !!linkedSequenceId
                    };
                }
                return r;
            });


            const requestToUpdate = updatedReqs.find(r => r.id === editingRequestId);
            if (requestToUpdate) {
                await addLogisticsRequest(requestToUpdate);
            }

            resetForm();
            return;
        }

        // --- CREATE MODE ---
        let refDateStr = targetDate || addingToDate;
        if (!refDateStr) return;
        const refDate = new Date(refDateStr);

        // Prevent creating on Sunday — shift to Monday
        if (refDate.getDay() === 0) {
            refDate.setDate(refDate.getDate() + 1);
            refDateStr = refDate.toISOString().split('T')[0];
        }

        let dayOffset = 0;
        if (creationMode === 'LOCATION' && linkedLocation && project.pdtDays) {
            // Calculate Day Offset relative to Location Start (or End for Demontage)
            const locDays = project.pdtDays
                .filter(d => (d.linkedLocation === linkedLocation || d.location === linkedLocation))
                .sort((a, b) => a.date.localeCompare(b.date));

            if (locDays.length > 0) {
                const firstDay = new Date(locDays[0].date);
                const lastDay = new Date(locDays[locDays.length - 1].date);
                const refDateObj = new Date(refDateStr);

                if (linkType === 'DEMONTAGE') {
                    // Offset from End
                    const diffTime = refDateObj.getTime() - lastDay.getTime();
                    dayOffset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else {
                    // Offset from Start (Shooting or Prelight)
                    const diffTime = refDateObj.getTime() - firstDay.getTime();
                    dayOffset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
            }
        }

        const newRequests: LogisticsRequest[] = [];
        const baseId = Date.now();

        if (newType === 'roundtrip') {
            // 1. PICKUP (J-1) - Amber
            const pickupDate = new Date(refDate);
            pickupDate.setDate(refDate.getDate() - 1);
            if (pickupDate.getDay() === 0) pickupDate.setDate(pickupDate.getDate() - 1); // Sunday -> Saturday

            const pickupReq: LogisticsRequest = {
                id: `log_${baseId}_pickup`,
                date: pickupDate.toISOString().split('T')[0],
                department: targetDept as any,
                type: 'pickup',
                time: newTime || '09:00',
                location: newLocation,
                description: `${newDescription} (ENLÈVEMENT)`,
                // Contact removed
                vehicleType: newVehicle,
                distanceKm: 0,
                linkedSequenceId: linkedSequenceId || null,
                autoUpdateDates: !!linkedSequenceId,
                linkedLocation: linkedLocation || undefined,
                linkType: linkedLocation ? linkType : undefined,
                dayOffset: dayOffset,
                duration: duration,
                status: 'PENDING'
            };
            newRequests.push(pickupReq);

            // 2. USAGE (J) - Emerald/Green
            const usageReq: LogisticsRequest = {
                id: `log_${baseId}_usage`,
                date: refDateStr, // The actual Usage/Shoot Date
                department: targetDept as any,
                type: 'usage',
                time: '08:00', // Default start of day
                location: 'SUR PLATEAU', // Usage is on set
                description: `${newDescription} (UTILISATION)`,
                // Contact removed
                vehicleType: newVehicle,
                distanceKm: 0,
                linkedSequenceId: linkedSequenceId || null,
                autoUpdateDates: !!linkedSequenceId,
                linkedLocation: linkedLocation || undefined,
                linkType: linkedLocation ? linkType : undefined,
                dayOffset: dayOffset,
                duration: duration,
                status: 'PENDING'
            };
            newRequests.push(usageReq);

            // 3. RETURN (Date de fin / Dropoff) - Red
            const dropoffDate = returnDate ? new Date(returnDate) : (() => {
                const d2 = new Date(refDate);
                d2.setDate(d2.getDate() + 1);
                if (d2.getDay() === 0) d2.setDate(d2.getDate() + 1); // Sunday -> Monday
                return d2;
            })();

            const returnReq: LogisticsRequest = {
                id: `log_${baseId}_dropoff`,
                date: dropoffDate.toISOString().split('T')[0],
                department: targetDept as any,
                type: 'dropoff',
                time: '18:00',
                location: newLocation,
                description: `${newDescription} (RETOUR)`,
                // Contact removed
                vehicleType: newVehicle,
                distanceKm: 0,
                linkedSequenceId: linkedSequenceId || null,
                autoUpdateDates: !!linkedSequenceId,
                linkedLocation: linkedLocation || undefined,
                // Anchor return to the end of the location's duration by using DEMONTAGE type if linked
                linkType: linkedLocation ? 'DEMONTAGE' : undefined,
                // Offset 1 day from the end of the location's duration
                dayOffset: linkedLocation ? 1 : 0,
                duration: duration,
                status: 'PENDING'
            };
            newRequests.push(returnReq);

        } else {
            // Single Request
            const req: LogisticsRequest = {
                id: `log_${baseId}`,
                date: refDateStr,
                department: targetDept as any,
                type: newType,
                time: newTime || '09:00',
                location: newLocation,
                description: newDescription,
                // Contact removed
                vehicleType: newVehicle,
                distanceKm: 0,
                linkedSequenceId: linkedSequenceId || null,
                autoUpdateDates: !!linkedSequenceId,
                linkedLocation: linkedLocation || undefined,
                linkType: linkedLocation ? linkType : undefined,
                dayOffset: dayOffset,
                duration: duration,
                status: 'PENDING'
            };
            newRequests.push(req);
        }

        // Batch Update
        // Use atomic addLogisticsRequest for each request
        try {
            await Promise.all(newRequests.map(req => addLogisticsRequest(req)));
            addNotification(newRequests.length > 1 ? "Transports ajoutés" : "Transport ajouté", "SUCCESS");
        } catch (error) {
            console.error("Error adding logistics requests", error);
            addNotification("Erreur lors de l'ajout", "ERROR");
        }

        // Reset Form
        resetForm();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer cette demande ?')) return;
        await deleteLogisticsRequest(id);
    };

    // --- DRAG AND DROP LOGIC ---
    const handleZoneDragOver = (e: React.DragEvent, direction: 'prev' | 'next') => {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        if (now - navThrottleRef.current > 1000) { // Throttle navigation every 1 second
            changeWeek(direction);
            navThrottleRef.current = now;
        }
    };

    const handleDragStart = (e: React.DragEvent, req: LogisticsRequest) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            requestId: req.id,
            sourceDate: req.date
        }));
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEndGlobal = () => {
        setIsDragging(false);
    };

    const handleDayDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Helper: skip Sundays when shifting a date
    const skipSunday = (date: Date, direction: number): Date => {
        if (date.getDay() === 0) { // Sunday
            date.setDate(date.getDate() + (direction >= 0 ? 1 : -1)); // Mon or Sat
        }
        return date;
    };

    const handleDropOnDay = async (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        setIsDragging(false);

        // Block drops on Sunday
        const targetDay = new Date(targetDateStr).getDay();
        if (targetDay === 0) {
            await showConfirm('Impossible de déplacer un transport sur un dimanche.');
            return;
        }

        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        try {
            const { requestId, sourceDate } = JSON.parse(dataStr);
            if (sourceDate === targetDateStr) return; // No change

            // Find the request
            const allRequests = project.logistics || [];
            const reqToMove = allRequests.find(r => r.id === requestId);

            if (!reqToMove) return;

            // Calculate day offset between source and target
            const sourceDateObj = new Date(sourceDate);
            const targetDateObj = new Date(targetDateStr);
            const daysDiff = Math.round((targetDateObj.getTime() - sourceDateObj.getTime()) / (1000 * 60 * 60 * 24));

            // Check if linked to Sequence or Location
            const isLinked = reqToMove.linkedSequenceId || reqToMove.linkedLocation;
            let shouldUnlink = false;

            if (isLinked) {
                const isLinkedSeq = !!reqToMove.linkedSequenceId;
                const linkName = isLinkedSeq ? `la Séquence ${reqToMove.linkedSequenceId}` : `le Lieu ${reqToMove.linkedLocation}`;

                const confirmed = await showConfirm(
                    `Attention : Cet élément est lié à ${linkName}.\n\nVoulez-vous le détacher et le déplacer au ${targetDateObj.toLocaleDateString('fr-FR')} ?\nIl ne sera plus mis à jour automatiquement en cas de modification du plan de travail.`
                );

                if (!confirmed) return;
                shouldUnlink = true;
            }

            // Find sibling items (same roundtrip group)
            // IDs follow pattern: log_TIMESTAMP_pickup, log_TIMESTAMP_usage, log_TIMESTAMP_dropoff
            const idParts = requestId.match(/^(log_\d+)_(pickup|usage|dropoff|pickup_set|dropoff_set)$/);
            const baseId = idParts ? idParts[1] : null;

            const siblings = baseId
                ? allRequests.filter(r => r.id.startsWith(baseId + '_') && r.id !== requestId)
                : [];

            if (siblings.length > 0) {
                const cascadeMsg = `Ce transport fait partie d'un aller-retour.\n\nVoulez-vous décaler automatiquement les ${siblings.length} autre(s) élément(s) liés de ${daysDiff > 0 ? '+' : ''}${daysDiff} jour(s) ?`;

                const cascadeConfirmed = await showConfirm(cascadeMsg);

                if (cascadeConfirmed) {
                    for (const sibling of siblings) {
                        const sibDate = new Date(sibling.date);
                        sibDate.setDate(sibDate.getDate() + daysDiff);
                        // Skip Sunday → shift to Monday (forward) or Saturday (backward)
                        skipSunday(sibDate, daysDiff);

                        let updatedSibling = { ...sibling, date: sibDate.toISOString().split('T')[0] };
                        if (shouldUnlink) {
                            updatedSibling = {
                                ...updatedSibling,
                                linkedSequenceId: null,
                                linkedLocation: null,
                                linkType: null,
                                dayOffset: 0,
                                autoUpdateDates: false
                            };
                        }
                        await addLogisticsRequest(updatedSibling);
                    }
                }
            }

            // Move the dragged item (already verified not Sunday above)
            let updatedReq = { ...reqToMove, date: targetDateStr };
            if (shouldUnlink) {
                updatedReq = {
                    ...updatedReq,
                    linkedSequenceId: null,
                    linkedLocation: null,
                    linkType: null,
                    dayOffset: 0,
                    autoUpdateDates: false
                };
            }

            await addLogisticsRequest(updatedReq);

        } catch (error) {
            console.error("Error moving logistics request", error);
        }
    };

    // --- MODAL CONTENT (Shared between views) ---
    const modalContent = isModalOpen && ( // Use isModalOpen instead of addingToDate check
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => resetForm()}>
            <div className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {editingRequestId ? 'Modifier le Transport' : (modalStep === 'SELECTION' ? 'Nouveau Transport' : 'Détails de la demande')}
                        </h3>
                        {(user?.department === 'PRODUCTION' || user?.department === Department.REGIE) && (
                            <div className="text-xs font-bold text-amber-500 mt-1 uppercase tracking-wider">
                                Pour : {currentDept}
                            </div>
                        )}
                    </div>
                    <button onClick={() => resetForm()} className="text-slate-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* STEP 1: SELECTION */}
                {/* STEP 1: SELECTION */}
                {modalStep === 'SELECTION' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
                        <button
                            onClick={() => {
                                setCreationMode('DATE');
                                setModalStep('FORM');
                                if (addingToDate) setTargetDate(addingToDate); // Initialize target with current grid selection
                            }}
                            className="flex flex-col items-center justify-center gap-4 bg-cinema-900 border-2 border-cinema-700 hover:border-amber-500 hover:bg-cinema-800 p-4 rounded-xl transition-all group"
                        >
                            <div className="p-4 bg-cinema-800 rounded-full group-hover:scale-110 transition-transform">
                                <Calendar className="h-8 w-8 text-amber-500" />
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-white">Par Date</div>
                                <div className="text-xs text-slate-500 mt-1">Choisir un jour</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setCreationMode('SEQUENCE');
                                setModalStep('FORM');
                                setLinkedSequenceId('');
                                if (addingToDate) setTargetDate(addingToDate); // Keep calendar day as filter
                            }}
                            className="flex flex-col items-center justify-center gap-4 bg-cinema-900 border-2 border-cinema-700 hover:border-amber-500 hover:bg-cinema-800 p-4 rounded-xl transition-all group"
                        >
                            <div className="p-4 bg-cinema-800 rounded-full group-hover:scale-110 transition-transform">
                                <div className="flex items-center justify-center h-8 w-8 font-bold text-amber-500 border-2 border-amber-500 rounded text-xs">
                                    SEQ
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-white">Par Séquence</div>
                                <div className="text-xs text-slate-500 mt-1">Lier à une séquence</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setCreationMode('LOCATION');
                                setModalStep('FORM');
                                setLinkedSequenceId('');
                                setLinkedLocation('');
                                setTargetDate('');
                            }}
                            className="flex flex-col items-center justify-center gap-4 bg-cinema-900 border-2 border-cinema-700 hover:border-amber-500 hover:bg-cinema-800 p-4 rounded-xl transition-all group"
                        >
                            <div className="p-4 bg-cinema-800 rounded-full group-hover:scale-110 transition-transform">
                                <div className="flex items-center justify-center h-8 w-8 font-bold text-amber-500 border-2 border-amber-500 rounded-full">
                                    <MapPin className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-white">Par Lieu</div>
                                <div className="text-xs text-slate-500 mt-1">Lier à un décor</div>
                            </div>
                        </button>
                    </div>
                )}
                {/* STEP 2: FORM */}
                {modalStep === 'FORM' && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                        {/* Back Button */}
                        <button
                            onClick={() => setModalStep('SELECTION')}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white mb-4 -mt-2"
                        >
                            <ChevronLeft className="h-3 w-3" />
                            Retour au choix
                        </button>

                        {/* MODE DATE HEADER: Controls TargetDate now */}
                        {creationMode === 'DATE' && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-300 text-sm font-medium flex items-center gap-2 mb-4">
                                <Calendar className="h-4 w-4" />
                                <span className="text-amber-200 mr-2">
                                    {newType === 'pickup' ? "Date d'Enlèvement :" :
                                        newType === 'dropoff' ? "Date de Retour :" :
                                            newType === 'pickup_set' ? "Date d'Enlèvement :" :
                                                newType === 'dropoff_set' ? "Date de Retour :" :
                                                    "Date d'Utilisation :"}
                                </span>
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    className="bg-transparent border-none text-amber-300 focus:ring-0 p-0 font-bold"
                                />
                            </div>
                        )}

                        {/* MODE SEQUENCE HEADER */}
                        {creationMode === 'SEQUENCE' && (
                            <div className="mb-4 space-y-3">
                                {/* Date picker for filtering sequences */}
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-300 text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-amber-200 mr-2">Date de Tournage :</span>
                                    <input
                                        type="date"
                                        value={targetDate}
                                        onChange={(e) => { setTargetDate(e.target.value); setLinkedSequenceId(''); }}
                                        className="bg-transparent border-none text-amber-300 focus:ring-0 p-0 font-bold"
                                    />
                                </div>

                                {targetDate ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Sélectionner la Séquence</label>
                                        <select
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                            value={linkedSequenceId}
                                            onChange={e => setLinkedSequenceId(e.target.value)}
                                        >
                                            <option value="">-- Choisir une séquence --</option>
                                            {(project.pdtSequences || [])
                                                .filter(seq => seq.date === targetDate)
                                                .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
                                                .map(seq => (
                                                    <option key={seq.id} value={seq.id}>
                                                        SEQ {seq.id} ({seq.decor || 'Sans décor'})
                                                    </option>
                                                ))}
                                            {!(project.pdtSequences || []).some(s => s.date === targetDate) && (
                                                <option value="" disabled>Aucune séquence ce jour-là</option>
                                            )}
                                        </select>
                                        <p className="text-xs text-slate-500 italic">
                                            Seules les séquences tournées le {new Date(targetDate).toLocaleDateString('fr-FR')} sont affichées.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-slate-500 text-sm">
                                        Choisissez d'abord une date de tournage pour filtrer les séquences.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MODE LOCATION HEADER */}
                        {creationMode === 'LOCATION' && (
                            <div className="mb-4 space-y-4 bg-cinema-900/50 p-3 rounded-lg border border-cinema-700">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Lieu (PDT)</label>
                                    <select
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                        value={linkedLocation}
                                        onChange={e => setLinkedLocation(e.target.value)}
                                    >
                                        <option value="">-- Choisir un lieu --</option>
                                        {Array.from(new Set((project.pdtDays || [])
                                            .map(d => d.linkedLocation || d.location)
                                            .filter(l => l && l !== 'OFF' && l !== 'VACANCES')))
                                            .sort()
                                            .map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                    </select>
                                </div>

                                {linkedLocation && (
                                    <>
                                        {isMultiDay && linkType === 'SHOOTING' && (
                                            <div className="flex items-center gap-4 bg-cinema-800 p-2 rounded-lg border border-cinema-700">
                                                <div className="text-sm font-bold text-amber-500">Durée :</div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={!useFullDuration}
                                                        onChange={() => setUseFullDuration(false)}
                                                        className="text-amber-500 focus:ring-amber-500"
                                                    />
                                                    <span className="text-sm text-white">1er Jour (Standard)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={useFullDuration}
                                                        onChange={() => setUseFullDuration(true)}
                                                        className="text-amber-500 focus:ring-amber-500"
                                                    />
                                                    <span className="text-sm text-white">Toute la période</span>
                                                </label>
                                            </div>
                                        )}


                                    </>
                                )}
                            </div>
                        )}

                        {/* SUMMARY BLOCK (Visible for both Date & Sequence if targetDate exists) */}
                        {targetDate && (
                            <div className="mb-4 flex flex-col gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                                <div className="font-bold border-b border-emerald-500/20 pb-1 mb-1">
                                    Tournage / Utilisation : {new Date(targetDate).toLocaleDateString('fr-FR')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 font-bold uppercase">Aller (J-1)</div>
                                    <Calendar className="h-3 w-3" />
                                    {new Date(addingToDate || '').toLocaleDateString('fr-FR')}
                                </div>
                                {newType === 'roundtrip' && returnDate && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 font-bold uppercase">Retour (J+1)</div>
                                        <Calendar className="h-3 w-3" />
                                        {new Date(returnDate).toLocaleDateString('fr-FR')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Roundtrip Return Date Picker (For Manual Adjustment) */}
                        {newType === 'roundtrip' && (
                            <div className="mb-4 space-y-2 bg-cinema-900/50 p-3 rounded-lg border border-cinema-700">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-300">Dates Aller-Retour</label>
                                    {creationMode === 'DATE' && targetDate && <span className="text-xs text-slate-500">Ref: {new Date(targetDate).toLocaleDateString('fr-FR')}</span>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1">Date Aller (Enlèvement)</span>
                                        <input
                                            type="date"
                                            value={addingToDate || ''}
                                            onChange={(e) => setAddingToDate(e.target.value)}
                                            className="w-full bg-cinema-800 border border-cinema-700 rounded px-2 py-1 text-white text-sm"
                                        // Allow override? Yes.
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1">Date Retour (Restitution)</span>
                                        <input
                                            type="date"
                                            value={returnDate || ''}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                            className="w-full bg-cinema-800 border border-cinema-700 rounded px-2 py-1 text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Type</label>
                                <select
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                    value={newType}
                                    onChange={e => setNewType(e.target.value as any)}
                                >
                                    <option value="pickup">Enlèvement (Chez Loueur)</option>
                                    <option value="dropoff">Retour (Chez Loueur)</option>
                                    <option value="pickup_set">Enlèvement Plateau</option>
                                    <option value="dropoff_set">Retour Plateau</option>
                                    <option value="roundtrip">Aller-Retour</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Heure</label>
                                    <input
                                        type="time"
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                        value={newTime}
                                        onChange={e => setNewTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Type de Véhicule</label>
                                    <select
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                        value={newVehicle}
                                        onChange={e => setNewVehicle(e.target.value as any)}
                                    >
                                        <option value="Van">Van / Utilitaire</option>
                                        <option value="Truck">Porteur (Camion)</option>
                                        <option value="HGV">Poids Lourd</option>
                                        <option value="Car">Voiture</option>
                                        <option value="Scooter">2 Roues</option>
                                    </select>
                                </div>
                            </div>
                        </div>


                        {/* Sequence Link (DATE MODE ONLY) */}
                        {creationMode === 'DATE' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Lier à une Séquence (Optionnel)</label>
                                <select
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                    value={linkedSequenceId}
                                    onChange={e => setLinkedSequenceId(e.target.value)}
                                >
                                    <option value="">Aucune séquence liée</option>
                                    {(project.pdtSequences || [])
                                        .filter(seq => {
                                            return seq.date === targetDate;
                                        })
                                        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
                                        .map(seq => (
                                            <option key={seq.id} value={seq.id}>
                                                SEQ {seq.id} ({seq.decor || 'Sans décor'})
                                            </option>
                                        ))}
                                    {/* Fallback if list empty */}
                                    {!(project.pdtSequences || []).some(s => s.date === targetDate) && (
                                        <option value="" disabled>Aucune séquence ce jour-là</option>
                                    )}
                                </select>
                                <p className="text-xs text-slate-500 italic">
                                    Seules les séquences tournées le {targetDate ? new Date(targetDate).toLocaleDateString('fr-FR') : '...'} sont affichées.
                                </p>
                            </div>
                        )}

                        {/* Distance removed */}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Lieu / Loueur</label>
                            <div className="relative">
                                <MapPin className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Ex: TSF Caméra, Loge..."
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-amber-500"
                                    value={newLocation}
                                    onChange={e => setNewLocation(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Description (Liste Matériel)</label>
                            <div className="relative">
                                <Package className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                <textarea
                                    placeholder="Ex: 10 Pellicules, Caméra B..."
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-amber-500 min-h-[80px]"
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* SATURDAY WARNING */}
                        {((addingToDate && new Date(addingToDate).getDay() === 6) || (returnDate && new Date(returnDate).getDay() === 6)) && (
                            <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-200">
                                    <p className="font-bold">Attention : Enlèvement/Retour le Samedi</p>
                                    <p>
                                        L'enlèvement ou le retour tombe un samedi. Veuillez vérifier que <span className="font-bold text-white">{newLocation || 'le loueur'}</span> est bien ouvert ce jour-là.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-between pt-2">
                            {/* DELETE BUTTON (only when editing) */}
                            {editingRequestId ? (
                                <button
                                    onClick={() => { handleDelete(editingRequestId); resetForm(); }}
                                    className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Supprimer
                                </button>
                            ) : <div />}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => resetForm()}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleAddRequest}
                                    disabled={!newLocation}
                                    className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                                >
                                    {editingRequestId ? 'Mettre à jour' : 'Valider la Demande'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // 1. PRODUCTION OVERVIEW
    if (user?.department === 'PRODUCTION' && viewMode === 'OVERVIEW') {
        const sortedWeeks = Object.keys(groupedByWeek).sort();

        return (
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                            <Truck className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Logistique & Transports</h2>
                            <p className="text-slate-400">Vue d'ensemble Production</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setViewMode('MY_REQUESTS')}
                        className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Truck className="h-4 w-4" />
                        Vue Calendrier
                    </button>
                </div>

                <div className="space-y-4">
                    {sortedWeeks.length > 0 ? sortedWeeks.map(weekKey => {
                        const isCollapsed = collapsedWeeks.includes(weekKey);
                        return (
                            <div key={weekKey} className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden transition-all duration-200 hover:border-cinema-600">
                                <div
                                    onClick={() => toggleWeek(weekKey)}
                                    className="w-full flex items-center justify-between p-4 bg-cinema-900/50 cursor-pointer hover:bg-cinema-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-slate-500' : 'rotate-0 text-amber-500'}`}>
                                            <ChevronDown className="h-5 w-5" />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-cinema-700 rounded-lg text-amber-500 font-bold">
                                                {groupedByWeek[weekKey].count} <span className="text-xs font-normal text-slate-400">demandes</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-white">{groupedByWeek[weekKey].label}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!isCollapsed && (
                                    <div className="p-4 space-y-4 border-t border-cinema-800 animate-in slide-in-from-top-2 duration-200">
                                        {(groupedByWeek[weekKey].days || []).sort().map(dateStr => {
                                            const dayRequests = (project.logistics || []).filter(r => r.date === dateStr);
                                            if (dayRequests.length === 0) return null;

                                            return (
                                                <div key={dateStr} className="space-y-2">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mt-2 border-b border-cinema-700 pb-1">
                                                        {new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    </div>
                                                    {dayRequests.map(req => (
                                                        <div
                                                            key={req.id}
                                                            onClick={() => req.type !== 'usage' && openEditModal(req)}
                                                            className={`group bg-cinema-900 p-3 rounded-lg border border-cinema-700 flex items-center justify-between hover:border-amber-500 ${req.type === 'usage' ? 'opacity-70 cursor-default' : 'cursor-pointer'} ${req.type === 'pickup' ? 'border-l-4 border-l-amber-500' :
                                                                req.type === 'dropoff' ? 'border-l-4 border-l-blue-500' :
                                                                    req.type === 'usage' ? 'border-l-4 border-l-emerald-500' : ''
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${req.type === 'pickup' ? 'bg-amber-500/20 text-amber-500' :
                                                                    req.type === 'dropoff' ? 'bg-blue-500/20 text-blue-400' :
                                                                        'bg-emerald-500/20 text-emerald-500'
                                                                    }`}>
                                                                    {req.type === 'pickup' ? 'Enlèvement' : req.type === 'dropoff' ? 'Retour' : 'Utilisation'}
                                                                </span>

                                                                {/* SATURDAY WARNING BADGE */}
                                                                {(new Date(dateStr).getDay() === 6 && (req.type === 'pickup' || req.type === 'dropoff')) && (
                                                                    <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                        <span className="text-[10px] font-bold uppercase hidden md:inline">Samedi</span>
                                                                    </div>
                                                                )}

                                                                <span className="text-white font-medium truncate">{req.location}</span>
                                                                <span className="text-xs text-slate-500 truncate hidden md:inline">{req.description}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-xs text-slate-600 bg-cinema-800 px-2 py-0.5 rounded font-bold">{req.department}</span>
                                                                <div className="text-sm font-mono text-slate-400">{req.time}</div>

                                                                {/* DELETE BUTTON */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }}
                                                                    className={`p-1 text-slate-500 hover:text-red-400 transition-opacity ${req.type === 'usage' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                                    title="Supprimer"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="text-center py-12 text-slate-500 bg-cinema-800/50 rounded-xl border border-cinema-700">
                            Aucune demande de transport planifiée.
                        </div>
                    )}
                </div>
                {modalContent}
            </div>
        );
    }

    // 2. DEPARTMENT MODAL & VIEW (Or Requests View)
    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                        <Truck className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Aller-Retour Matériel</h2>
                        <p className="text-slate-400">
                            {(user?.department === 'PRODUCTION' && currentDept === 'PRODUCTION') ? 'Mes Transports' : `${currentDept} - Demandes de transport`}
                        </p>
                    </div>
                </div>

                {(user?.department === 'PRODUCTION' || user?.department === Department.REGIE) && (
                    <div className="flex gap-2">
                        {/* Department Selector for Production */}
                        {user?.department === 'PRODUCTION' && (
                            <div className="relative">
                                <select
                                    className="bg-cinema-900 text-white border border-cinema-700 rounded-lg pl-3 pr-8 py-2 appearance-none focus:outline-none focus:border-amber-500 cursor-pointer font-bold"
                                    value={currentDept} // Controlled by global context
                                    onChange={(e) => setCurrentDept(e.target.value)}
                                >
                                    <option value="PRODUCTION">PRODUCTION</option>
                                    {Object.values(Department).map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2 top-3 pointer-events-none" />
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setAddingToDate(new Date().toISOString().split('T')[0]);
                                setModalStep('SELECTION');
                                setIsModalOpen(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden md:inline">Nouvelle Demande</span>
                            <span className="md:hidden">+</span>
                        </button>
                        <button
                            onClick={() => setViewMode('OVERVIEW')}
                            className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Truck className="h-4 w-4" />
                            <span className="hidden md:inline">Vue Globale</span>
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-4 bg-cinema-900 rounded-lg p-1 border border-cinema-700">
                    <button onClick={() => changeWeek('prev')} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="text-center px-4">
                        <div className="text-xs text-slate-500 uppercase font-bold">Semaine du</div>
                        <div className="text-white font-mono">{weekStart.toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => changeWeek('next')} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Matrix */}
            <div className="relative">
                {/* Navigation Zones */}
                {isDragging && (
                    <>
                        <div
                            className="absolute -left-4 top-0 bottom-0 w-20 bg-gradient-to-r from-amber-500/20 to-transparent z-50 flex items-center justify-start pl-2 transition-opacity opacity-0 hover:opacity-100 rounded-l-xl"
                            onDragOver={(e) => handleZoneDragOver(e, 'prev')}
                        >
                            <ChevronLeft className="w-8 h-8 text-amber-400 animate-pulse" />
                        </div>

                        <div
                            className="absolute -right-4 top-0 bottom-0 w-20 bg-gradient-to-l from-amber-500/20 to-transparent z-50 flex items-center justify-end pr-2 transition-opacity opacity-0 hover:opacity-100 rounded-r-xl"
                            onDragOver={(e) => handleZoneDragOver(e, 'next')}
                        >
                            <ChevronRightIcon className="w-8 h-8 text-amber-400 animate-pulse" />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                    {days.map((day) => {
                        const dateStr = day.toISOString().split('T')[0];
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const requests = getRequests(dateStr, (user?.department === 'PRODUCTION' || user?.department === Department.REGIE) ? currentDept : user?.department || '');

                        return (
                            <div
                                key={dateStr}
                                onDragOver={handleDayDragOver}
                                onDrop={(e) => handleDropOnDay(e, dateStr)}
                                className={`rounded-xl border flex flex-col h-full min-h-[300px] transition-colors
                                                ${isToday ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-cinema-700'}
                                                ${isDragging ? 'hover:bg-cinema-700/50' : ''}
                                                ${isWeekend && !isToday ? 'bg-black/40' : 'bg-cinema-800'}
                                            `}
                            >
                                <div className={`p-3 text-center border-b ${isToday ? 'bg-amber-500/10 border-amber-500' : 'bg-cinema-900/50 border-cinema-700'}`}>
                                    <div className={`text-sm font-bold uppercase ${isToday ? 'text-amber-400' : 'text-slate-400'}`}>
                                        {day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                                    </div>
                                    <div className={`text-xl font-bold ${isToday ? 'text-white' : 'text-slate-200'}`}>
                                        {day.getDate()}
                                    </div>
                                </div>

                                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                    <div className="h-full flex flex-col">
                                        <div className="flex-1 space-y-2">
                                            {requests.length > 0 ? requests.map(req => (
                                                <div
                                                    key={req.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, req)}
                                                    onDragEnd={handleDragEndGlobal}
                                                    className={`bg-slate-700/30 p-2 rounded-lg border hover:border-slate-600 transition-colors group relative cursor-pointer active:cursor-grabbing ${req.type === 'pickup' ? 'border-l-4 border-l-amber-500 border-t-transparent border-r-transparent border-b-transparent' :
                                                        req.type === 'dropoff' ? 'border-l-4 border-l-blue-500 border-t-transparent border-r-transparent border-b-transparent' :
                                                            req.type === 'usage' ? 'border-l-4 border-l-emerald-500 border-t-transparent border-r-transparent border-b-transparent' :
                                                                'border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${req.type === 'pickup' ? 'bg-amber-500/20 text-amber-500' :
                                                            req.type === 'dropoff' ? 'bg-blue-500/20 text-blue-400' :
                                                                req.type === 'usage' ? 'bg-emerald-500/20 text-emerald-500' :
                                                                    req.type === 'pickup_set' ? 'bg-lime-500/20 text-lime-400' :
                                                                        req.type === 'dropoff_set' ? 'bg-cyan-500/20 text-cyan-400' :
                                                                            'bg-purple-500/20 text-purple-400'
                                                            }`}>
                                                            {req.type === 'pickup' ? 'Enlèvement' :
                                                                req.type === 'dropoff' ? 'Retour' :
                                                                    req.type === 'usage' ? 'Tournage' :
                                                                        req.type === 'pickup_set' ? 'Enl. Plat.' :
                                                                            req.type === 'dropoff_set' ? 'Ret. Plat.' :
                                                                                'A/R'}
                                                        </span>
                                                        <span className="text-xs font-mono text-slate-400">{req.time}</span>
                                                    </div>

                                                    {/* SATURDAY WARNING BADGE */}
                                                    {(dateStr && new Date(dateStr).getDay() === 6 && (req.type === 'pickup' || req.type === 'dropoff')) && (
                                                        <div className="mb-1 flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            <span className="text-[10px] font-bold uppercase">Attention : Samedi</span>
                                                        </div>
                                                    )}

                                                    <div className="font-bold text-white text-sm truncate">{req.location}</div>
                                                    {req.description && (
                                                        <div className="text-xs text-slate-400 truncate mt-0.5">
                                                            {req.description}
                                                        </div>
                                                    )}
                                                    {req.linkedSequenceId && (
                                                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            SEQ {req.linkedSequenceId}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }}
                                                        className="absolute top-1 right-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )) : (
                                                !addingToDate && (
                                                    <div onClick={() => { setAddingToDate(dateStr); setModalStep('SELECTION'); setIsModalOpen(true); }} className="h-full flex flex-col items-center justify-center text-slate-600 hover:text-amber-400 cursor-pointer transition-colors border-2 border-dashed border-cinema-700 hover:border-amber-500/50 rounded-lg p-4 min-h-[100px]">
                                                        <Plus className="h-6 w-6 mb-2" />
                                                        <span className="text-xs font-medium">Demander</span>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {addingToDate !== dateStr && requests.length > 0 && (
                                            <button
                                                onClick={() => { setAddingToDate(dateStr); setModalStep('SELECTION'); setIsModalOpen(true); }}
                                                className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-amber-400 hover:bg-cinema-700/30 rounded-lg transition-colors border border-transparent hover:border-cinema-700"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Ajouter
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CUSTOM CONFIRM DIALOG */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                        <p className="text-white whitespace-pre-line text-sm leading-relaxed">{confirmDialog.message}</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={confirmDialog.onNo}
                                className="px-5 py-2 rounded-lg bg-cinema-700 text-slate-300 hover:bg-cinema-600 hover:text-white font-medium transition-colors"
                            >
                                Non
                            </button>
                            <button
                                onClick={confirmDialog.onYes}
                                className="px-5 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 font-bold transition-colors"
                            >
                                Oui
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD COMPOSITE MODAL (WIZARD) */}
            {modalContent}
        </div>
    );
};
