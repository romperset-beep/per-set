import React, { useState, useEffect, useRef } from 'react';
import {
    format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, parseISO, isWeekend
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText, Upload, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { CallSheet } from '../types';

interface CallSheetCalendarProps {
    callSheets: CallSheet[];
    onUpload: (file: File, date: string) => Promise<void>;
    onViewSheet: (sheet: CallSheet) => void;
    onMoveSheet: (sheetId: string, newDate: string) => Promise<void>;
    shootingStartDate?: string;
}

export const CallSheetCalendar: React.FC<CallSheetCalendarProps> = ({
    callSheets,
    onUpload,
    onViewSheet,
    onMoveSheet,
    shootingStartDate
}) => {
    // Initialize to Shooting Start Date if available and in the future/present, else Today
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        if (shootingStartDate) {
            const start = parseISO(shootingStartDate);
            // If today is before shooting start, show shooting start? 
            // Or if shooting start is valid, default to it? 
            // Let's default to Today, but allow jumping.
            // Actually user said "I see next Monday and drag...". 
            // If shooting looks far, maybe they want to jump.
            // Let's Stick to Today for now, and add a "Go to Shooting Start" button.
            return startOfWeek(today, { locale: fr });
        }
        return startOfWeek(today, { locale: fr });
    });

    const [isDragging, setIsDragging] = useState(false);
    const navThrottleRef = useRef<number>(0);

    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const [uploadingDate, setUploadingDate] = useState<string | null>(null);

    const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const prevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { locale: fr }));
    const goToShootingStart = () => {
        if (shootingStartDate) {
            setCurrentWeekStart(startOfWeek(parseISO(shootingStartDate), { locale: fr }));
        }
    };

    const weekEnd = endOfWeek(currentWeekStart, { locale: fr });
    const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

    const handleZoneDragOver = (e: React.DragEvent, direction: 'prev' | 'next') => {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        if (now - navThrottleRef.current > 1000) { // Throttle navigation every 1 second
            if (direction === 'prev') prevWeek();
            else nextWeek();
            navThrottleRef.current = now;
        }
    };

    const handleDragEndGlobal = () => {
        setIsDragging(false);
    };

    // Handlers (Same as before)
    const handleDragOver = (e: React.DragEvent, dateStr: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragOverDate !== dateStr) setDragOverDate(dateStr);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverDate(null);
    };

    const handleDrop = async (e: React.DragEvent, dateStr: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverDate(null);
        setIsDragging(false);

        // 1. Handle Internal Sheet Move
        const draggedSheetId = e.dataTransfer.getData('text/plain');
        if (draggedSheetId) {
            // Optimistic / UI feedback?
            try {
                await onMoveSheet(draggedSheetId, dateStr);
            } catch (error) {
                console.error("Failed to move sheet", error);
            }
            return;
        }

        // 2. Handle File Upload
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type !== 'application/pdf') {
                alert("Seuls les fichiers PDF sont acceptés.");
                return;
            }

            setUploadingDate(dateStr);
            try {
                await onUpload(file, dateStr);
            } catch (error) {
                console.error("Upload failed via calendar drop", error);
            } finally {
                setUploadingDate(null);
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, sheet: CallSheet) => {
        e.dataTransfer.setData('text/plain', sheet.id);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
        // Optional: Set drag image
    };

    return (
        <div className="bg-cinema-900 rounded-2xl border border-cinema-700 overflow-hidden shadow-xl flex flex-col h-[600px] relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cinema-700 bg-cinema-800 relative z-20">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-blue-500" />
                        {format(currentWeekStart, 'MMMM yyyy', { locale: fr })}
                    </h2>
                    <span className="text-sm text-gray-400 bg-cinema-700 px-2 py-1 rounded-md">
                        Semaine du {format(currentWeekStart, 'd', { locale: fr })} au {format(weekEnd, 'd', { locale: fr })}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button onClick={prevWeek} className="p-2 hover:bg-cinema-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Semaine précédente">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToToday} className="px-3 py-2 text-sm font-medium bg-cinema-700 hover:bg-cinema-600 rounded-lg text-white transition-colors">
                        Aujourd'hui
                    </button>
                    {shootingStartDate && (
                        <button onClick={goToShootingStart} className="px-3 py-2 text-sm font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition-colors border border-blue-500/30">
                            Début Tournage
                        </button>
                    )}
                    <button onClick={nextWeek} className="p-2 hover:bg-cinema-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Semaine suivante">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Weekly Grid Columns */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-cinema-700 bg-cinema-800/50 relative">
                {/* Navigation Zones */}
                {isDragging && (
                    <>
                        {/* Previous Week Zone */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-500/20 to-transparent z-50 flex items-center justify-start pl-2 transition-opacity opacity-0 hover:opacity-100"
                            onDragOver={(e) => handleZoneDragOver(e, 'prev')}
                        >
                            <ChevronLeft className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>

                        {/* Next Week Zone */}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-500/20 to-transparent z-50 flex items-center justify-end pr-2 transition-opacity opacity-0 hover:opacity-100"
                            onDragOver={(e) => handleZoneDragOver(e, 'next')}
                        >
                            <ChevronRight className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                    </>
                )}

                {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isTodayDate = isToday(day);

                    // Filter sheets for this day
                    const daySheets = callSheets.filter(sheet => sheet.date === dateStr);
                    const isOver = dragOverDate === dateStr;
                    const isUploadingThisDay = uploadingDate === dateStr;

                    const isWknd = isWeekend(day);

                    return (
                        <div
                            key={dateStr}
                            onDragOver={(e) => handleDragOver(e, dateStr)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, dateStr)}
                            className={`flex flex-col relative group transition-colors min-w-0
                ${isOver ? 'bg-eco-500/10 ring-2 ring-inset ring-eco-500 z-10' : isWknd ? 'bg-black/40 hover:bg-black/30' : 'bg-cinema-800/30 hover:bg-cinema-800/50'}
                ${isTodayDate ? 'bg-blue-900/20' : ''}
              `}
                        >
                            {/* Day Header */}
                            <div className={`p-3 text-center border-b border-cinema-700/50 ${isTodayDate ? 'bg-blue-500/20' : ''}`}>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">{format(day, 'EEE', { locale: fr })}</div>
                                <div className={`text-xl font-bold ${isTodayDate ? 'text-blue-400' : 'text-white'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>

                            {/* Upload Overlay */}
                            {isUploadingThisDay && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eco-500"></div>
                                    <span className="text-xs text-eco-500 font-bold">Upload...</span>
                                </div>
                            )}

                            {/* Drop Zone Hint */}
                            {isOver && (
                                <div className="absolute inset-0 flex items-center justify-center bg-eco-500/5 pointer-events-none z-0">
                                    <div className="text-eco-500 font-bold flex flex-col items-center animate-bounce">
                                        <Upload className="w-8 h-8 mb-2" />
                                        <span className="text-sm">Déposer ici</span>
                                    </div>
                                </div>
                            )}

                            {/* Content Area */}
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
                                {daySheets.length === 0 && !isOver && (
                                    <div className="h-full flex flex-col items-center justify-center text-cinema-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-center font-medium">Glisser une FDS ici</p>
                                    </div>
                                )}

                                {daySheets.map(sheet => (
                                    <div
                                        key={sheet.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, sheet)}
                                        onDragEnd={handleDragEndGlobal}
                                        onClick={() => onViewSheet(sheet)}
                                        className="w-full text-left bg-cinema-700 p-2 rounded-lg border border-cinema-600 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group/card cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="flex justify-between items-start mb-1 pointer-events-none">
                                            <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                CORE
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2 pointer-events-none" title={sheet.name}>
                                            {sheet.name}
                                        </h4>

                                        <div className="space-y-1 pointer-events-none">
                                            {sheet.callTime && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                                    <Clock className="w-3 h-3 text-eco-500" />
                                                    <span>{sheet.callTime}</span>
                                                </div>
                                            )}
                                            {sheet.location1 && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                                    <MapPin className="w-3 h-3 text-orange-500" />
                                                    <span className="truncate">{sheet.location1}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
