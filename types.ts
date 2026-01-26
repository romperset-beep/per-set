
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
  EMPTY = 'Vide',
  SOLD = 'Vendu'
}

export enum SurplusAction {
  NONE = 'En attente',
  RELEASED_TO_PROD = 'Libéré pour la Prod (Fin Tournage)',
  MARKETPLACE = 'Stock Virtuel (Réemploi)',
  DONATION = 'Dons (Écoles, Courts, Asso...)',
  SHORT_FILM = 'Don Court-Métrage', // Deprecated in UI, merged into DONATION
  BUYBACK = 'Rachat A Better Set',
  STORAGE = 'Stock Production Future'
}

export interface ConsumableItem {
  id: string;
  name: string;
  department: Department | 'PRODUCTION';
  quantityInitial: number;
  quantityCurrent: number;
  unit: string; // e.g., "rouleaux", "boîtes", "bouteilles"
  status: ItemStatus;
  // Metadata for Marketplace
  projectId?: string;
  productionName?: string;
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
  vehicleType?: 'HGV' | 'Truck' | 'Van' | 'Car' | 'Scooter';
  distanceKm?: number;
}

export interface EnergyLog {
  id: string;
  date: string; // YYYY-MM-DD
  generatorHours: number;
  fuelLiters: number;
  gridKwh: number;
  notes?: string;
  submittedBy?: string;
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
  callSheets?: CallSheet[]; // Added: Call sheets list
  ecoprodChecklist?: Record<string, boolean>; // id -> isMet
  ecoprodProofs?: Record<string, string>; // ID -> Proof URL/Metadata
  rseCertification?: {
    auditorName: string;
    certificateUrl?: string;
    status: 'PENDING' | 'CERTIFIED' | 'REJECTED';
    certifiedAt?: string;
  };
  carbonContext?: CarbonContext;
  cateringLogs?: CateringLog[];
  cateringValidations?: Record<string, boolean>; // date -> isValidated
  timeLogs?: TimeLog[];
  reinforcements?: Reinforcement[];
  logistics?: LogisticsRequest[];
  energyLogs?: EnergyLog[];
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

  // Transport / Mileage
  transportMode?: 'TRANSPORT_COMMUN' | 'VEHICULE_PERSO' | 'COVOITURAGE';
  vehicleType?: 'VOITURE' | 'MOTO' | 'SCOOTER' | 'CAMION' | 'UTILITAIRE';
  fiscalPower?: number; // CV
  commuteDistanceKm?: number;
  greyCardUrl?: string; // Added: URL of uploaded Grey Card

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
  level?: 1 | 2 | 3;
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

  // Default Transport Preferences
  defaultTransportMode?: 'TRANSPORT_COMMUN' | 'VEHICULE_PERSO' | 'COVOITURAGE';
  defaultVehicleType?: 'VOITURE' | 'MOTO' | 'SCOOTER' | 'CAMION' | 'UTILITAIRE';
  defaultFiscalPower?: number;
  defaultCommuteDistanceKm?: number;
  greyCardUrl?: string; // Added: URL of uploaded Grey Card

  // Admin Info
  ssn: string; // Numéro de sécurité sociale
  birthPlace: string;
  birthDate: string;
  birthDepartment: string;
  birthCountry: string;
  nationality: string;
  socialSecurityCenterAddress: string;
  taxRate?: number; // Added: Taux d'imposition à la source (%)

  // Saved Commute Routes
  savedRoutes?: SavedRoute[];

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

export interface SavedRoute {
  id: string;
  name: string; // e.g. "Domicile - Studio"
  distanceKm: number;
  origin?: string;
  destination?: string;
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
  status?: 'pending' | 'approved' | 'rejected' | 'deleted'; // Added 'deleted' status
  isAdmin?: boolean; // Added
  hasAcceptedSaaSTerms?: boolean; // Added: Mandatory for Production
  deletedAt?: string; // Added: ISO timestamp of deletion
  originalEmail?: string; // Added: Original email before anonymization
  firstName?: string; // Added for Profile Sync
  lastName?: string; // Added for Profile Sync
}

export interface MealCount {
  id: string; // date_userId
  date: string; // YYYY-MM-DD
  userId?: string;
  userName?: string;
  department: Department | 'PRODUCTION';
  mealCount: number; // e.g., 25
  specialDietCount?: number; // e.g., 2 (Vegetarian/GlutenFree)
  location?: string; // e.g., "Cantine Base Arrière"
  isValidated: boolean;
}

// Digital Call Sheet Types
export interface CallSheetSequence {
  id: string;
  sequenceNumber: string; // "155"
  description: string; // "TAMARA saute d'un ascenseur..."
  decor: string; // "TOUR EIFFEL - Pilier Est"
  characters?: string[]; // ["TAMARA", "PRUDENCE"]
  dayNight?: 'DAY' | 'NIGHT';
}

export interface CallSheetWeather {
  morningTemp?: number;
  afternoonTemp?: number;
  condition?: string; // "Pluie", "Ensoleillé"
  sunrise?: string;
  sunset?: string;
}

export interface CastMember {
  role: string;
  actor: string;
  pickupTime?: string; // P-U
  hmcTime?: string;    // HMC
  mealTime?: string;   // DÎNER
  readyTime?: string;  // PAR (Prêt à Raccorder/Tourner)
}

export interface ExtrasGroup {
  name: string; // "Passants (10)" or just "Passants"
  quantity?: number;
  hmcTime?: string;
  mealTime?: string;
  readyTime?: string; // PAR
}

export interface TransportInfo {
  id: string; // Unique ID for key management
  name: string;
  pickupTime?: string;
  pickupLocation?: string;
  driver?: string; // Taxi, VTC, Driver Name
  destination?: string;
  arrivalTime?: string; // Sur Place / HMC / Set
}

export interface CallSheet {
  id: string;
  date: string; // Target date (YYYY-MM-DD)
  uploadDate: string; // ISO Date
  name: string; // "Feuille de service J12"
  url?: string; // Optional for Digital
  uploadedBy: string;
  department: Department | 'PRODUCTION';

  // Digital Fields
  isDigital?: boolean;
  callTime?: string;
  endTime?: string;
  location1?: string;
  location1Address?: string; // New: GPS/Address
  location1MapsLink?: string; // New
  location2?: string | null;
  location2Address?: string; // New
  cateringLocation?: string;
  cateringAddress?: string; // New
  cateringTime?: string; // New: Meal break time
  hmcAddress?: string; // New: HMC / Loges address

  nearestHospital?: string;
  weather?: CallSheetWeather;
  sequences?: CallSheetSequence[];
  cast?: CastMember[]; // Added
  extras?: ExtrasGroup[]; // Updated: List of extras groups with times
  transports?: TransportInfo[]; // New: Transport list
  notes?: string[]; // List of general notes
  departmentCallTimes?: Record<string, string>; // e.g. { "Caméra": "08:00", "Régie": "07:30" }
  departmentNotes?: Record<string, string[]>; // New: specific notes per dept
}

export interface CatalogItem {
  id: string; // Generated Firestore ID
  name: string; // Item name for autocomplete
  department: Department | 'PRODUCTION';
  usageCount: number; // For sorting/popularity
  lastUsed: string; // ISO Date
}

export interface Transaction {
  id: string;
  sellerId: string; // Project ID (Production A)
  sellerName: string;
  buyerId: string; // Project ID (Production B)
  buyerName: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  platformFee?: number; // 10% commission for A Better Set
  status: 'PENDING' | 'VALIDATED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  invoicedAt?: string;
}
