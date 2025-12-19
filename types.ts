
export type Language = 'fr' | 'en' | 'es';

export enum Department {
  CAMERA = 'Caméra',
  LUMIERE = 'Lumière',
  MACHINERIE = 'Machinerie',
  REGIE = 'Régie',
  DECO = 'Décoration',
  MISE_EN_SCENE = 'Mise en scène',
  SON = 'Son',
  COSTUME = 'Costume',
  MAQUILLAGE = 'Maquillage',
  COIFFURE = 'Coiffure',
  ACCESSOIRE = 'Accessoire'
}

export interface Notification {
  id: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'ORDER' | 'STOCK_MOVE' | 'RENFORT';
  date: Date;
  read: boolean;
  targetDept?: Department | 'PRODUCTION';
  itemId?: string;
}

export enum ItemStatus {
  NEW = 'Neuf',
  USED = 'Entamé',
  EMPTY = 'Vide'
}

export enum SurplusAction {
  NONE = 'En attente',
  RELEASED_TO_PROD = 'Libéré pour la Prod (Fin Tournage)',
  MARKETPLACE = 'Stock Virtuel (Réemploi)',
  DONATION = 'Don Pédagogique (Écoles)',
  SHORT_FILM = 'Don Court-Métrage'
}

export interface ConsumableItem {
  id: string;
  name: string;
  department: Department | 'PRODUCTION';
  quantityInitial: number;
  quantityCurrent: number;
  unit: string; // e.g., "rouleaux", "boîtes", "bouteilles"
  status: ItemStatus;
  surplusAction?: SurplusAction;
  ecoScore?: number; // 1-10
  purchased: boolean; // true if in stock, false if just a request/need
  isBought?: boolean; // true if purchased by production but not yet received by department
  price?: number; // Estimated cost in euros
  originalPrice?: number; // Purchase price (for resale calculation)
  quantityStarted?: number; // Number of items currently opened/started
}

export type LogisticsType = 'pickup' | 'dropoff' | 'roundtrip' | 'pickup_set' | 'dropoff_set';

export interface LogisticsRequest {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  department: Department | 'PRODUCTION';
  type: LogisticsType;
  location: string;
  description: string;
  contact?: string;
  status?: 'pending' | 'approved' | 'completed';
}

export interface Project {
  id: string;
  name: string;
  productionCompany: string;
  filmTitle?: string; // Added: Store film title separately to avoid duplication bugs
  startDate: string;
  shootingStartDate?: string;
  shootingEndDate?: string;
  projectType?: string; // e.g., "Long Métrage", "Série", "Pub"
  convention?: string; // e.g., "Cinéma - Annexe 1", "USPA"
  status: 'Pre-Prod' | 'Shooting' | 'Wrap';
  items: ConsumableItem[];
  ecoprodChecklist?: Record<string, boolean>; // id -> isMet
  carbonContext?: CarbonContext;
  cateringLogs?: CateringLog[];
  cateringValidations?: Record<string, boolean>; // date -> isValidated
  timeLogs?: TimeLog[];
  reinforcements?: Reinforcement[];
  logistics?: LogisticsRequest[];
}

export interface ReinforcementDetail {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string; // Poste / Fonction
}

export interface Reinforcement {
  id: string; // date_dept_index or similar
  date: string; // YYYY-MM-DD
  department: Department | 'PRODUCTION';
  names?: string[]; // Legacy support
  staff?: ReinforcementDetail[]; // New structure
}

export interface CateringLog {
  id: string; // date_userId
  date: string; // YYYY-MM-DD
  userId?: string;
  guestName?: string; // If manual add
  department: Department | 'PRODUCTION';
  hasEaten: boolean;
  isVegetarian: boolean;
  isManual: boolean;
}

export interface TimeLog {
  id: string; // date_userId
  userId: string;
  userName: string;
  department: Department | 'PRODUCTION';
  date: string; // YYYY-MM-DD
  callTime: string; // HH:mm
  mealTime: string; // HH:mm (Start of meal)
  hasShortenedMeal: boolean; // If true, deduct 30m instead of 1h
  isContinuousDay?: boolean; // Added: Journée Continue (20 mins paid break included, usually)
  breakDuration?: number; // Added: Pause in minutes (manual override)
  pauseTime?: string; // Added: HH:mm Time of the pause
  note?: string; // Added: User manual note
  travelHoursInside?: number; // Added: Heures de voyage DANS l'horaire
  travelHoursOutside?: number; // Added: Heures de voyage HORS horaire

  // Detailed User Info for Export
  userFirstName?: string;
  userLastName?: string;
  userRole?: string; // Fonction

  endTime: string; // HH:mm
  totalHours: number; // Calculated hours

  // Detailed Breakdown (Automatically Calculated)
  effectiveHours?: number; // Heures effectives (Amplitude - Repas/Pause)
  nightHours22_24?: number; // Heures Nuit 22h-24h
  nightHours00_06?: number; // Heures Nuit 00h-06h
  nightHours50?: number; // Majoration 50% (Hiver: 8 prem. h entre 20h-6h / Été: 22h-6h)
  nightHours100?: number; // Majoration 100% (Au-delà)
}

export interface CarbonContext {
  shootingDays: number;
  teamSize: number;
  transportMode: 'Train' | 'Avion' | 'Voiture' | 'Mixte';
  energySource: 'Réseau' | 'Groupe Électrogène' | 'Mixte';
  postcode?: string;
  cateringVegPercent?: number; // 0-100
  totalNights?: number;
  locationRatio?: number; // % Studio
  textilesEcoPercent?: number; // 0-100
}

export interface ImpactMetrics {
  wasteDivertedKg: number;
  moneySaved: number;
  co2SavedKg: number;
  schoolsHelped: number;
  recyclingRate: number; // New field for AFNOR Spec 2308
  sustainabilityScore: number; // 0-100
  aiAnalysis?: string;
  ecoprodBreakdown?: Record<string, number>; // Carbon'Clap Categories
}

export interface EcoprodCriterion {
  id: string;
  category: string;
  label: string;
  impact: 'High' | 'Medium' | 'Low';
}

export enum ExpenseStatus {
  PENDING = 'En attente',
  APPROVED = 'Validé',
  REJECTED = 'Refusé'
}

export interface ExpenseReport {
  id: string;
  date: string; // ISO Date
  amountTTC: number;
  amountTVA: number;
  amountHT?: number;
  merchantName?: string;
  items: string[]; // List of item names or IDs
  status: ExpenseStatus;
  receiptUrl?: string; // Base64 or URL
  receiptBase64?: string; // Store small images directly for PDF export

  // Context Data
  submittedBy: string; // User Name
  department: Department | 'PRODUCTION';
  productionName: string;
  filmTitle: string;
}

export interface BuyBackItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  photo?: string; // URL or Base64
  sellerDepartment: Department | 'PRODUCTION';
  reservedBy: Department | 'PRODUCTION' | null;
  reservedByName?: string; // Name of the user who reserved
  reservedByUserId?: string; // ID of the user who reserved
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  date: string; // ISO Date
}

export interface SocialPost {
  id: string;
  authorId?: string; // Added for precise filtering
  authorName: string;
  authorDepartment: Department | 'PRODUCTION';
  content: string;
  photo?: string; // URL or Base64
  date: string; // ISO Date
  likes: number;
  targetAudience?: 'GLOBAL' | 'DEPARTMENT' | 'USER'; // Added
  targetDept?: Department | 'PRODUCTION' | 'GLOBAL'; // Added
  targetUserId?: string; // Added
}

export interface UserProfile {
  id: string; // Linked to User email or ID
  email: string;
  department: Department | 'PRODUCTION';

  // Personal Info
  firstName: string;
  lastName: string;
  role: string; // Fonction
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  familyStatus: string; // Situation familiale
  dietaryHabits?: string; // e.g. "Végétarien", "Sans Gluten"

  // Admin Info
  ssn: string; // Numéro de sécurité sociale
  birthPlace: string;
  birthDate: string;
  birthDepartment: string;
  birthCountry: string;
  nationality: string;
  socialSecurityCenterAddress: string;
  taxRate?: number; // Added: Taux d'imposition à la source (%)

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Professional Info
  isRetired: boolean;
  congeSpectacleNumber: string;
  lastMedicalVisit: string;

  // Documents (Base64 or URL)
  rib?: string;
  cmbCard?: string;
  idCard?: string;
  drivingLicense?: string;
}

export interface ProjectSummary {
  id: string;
  productionName: string;
  filmTitle: string;
  lastAccess: string; // ISO Date
}

export interface User {
  id?: string; // Added for reference
  name: string;
  email: string;
  department: Department | 'PRODUCTION';
  productionName: string;
  filmTitle: string;
  startDate?: string;
  endDate?: string;
  projectType?: string; // Added to User to persist selection across sessions
  convention?: string; // Added to persist selection
  currentProjectId?: string; // Added for robust syncing
  projectHistory?: ProjectSummary[];
  dashboardOrder?: string[]; // Added for customizable dashboard
  status?: 'pending' | 'approved' | 'rejected'; // Added
  isAdmin?: boolean; // Added
  hasAcceptedSaaSTerms?: boolean; // Added: Mandatory for Production
}

export interface CallSheet {
  id: string;
  date: string; // Target date of the call sheet (e.g. "2023-10-25")
  uploadDate: string; // ISO Date of upload
  name: string; // e.g., "Feuille de service J12"
  url: string; // PDF URL or Base64
  uploadedBy: string; // User Name
  department: Department | 'PRODUCTION';
}

export interface CatalogItem {
  id: string; // Generated Firestore ID
  name: string; // Item name for autocomplete
  department: Department | 'PRODUCTION';
  usageCount: number; // For sorting/popularity
  lastUsed: string; // ISO Date
}
