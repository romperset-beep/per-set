
export type Language = 'fr' | 'en' | 'es';

export enum Department {
  CAMERA = 'Caméra',
  LUMIERE = 'Lumière',
  MACHINERIE = 'Machinerie',
  REGIE = 'Régie',
  DECO = 'Décoration',
  SON = 'Son',
  COSTUME = 'Costume',
  MAQUILLAGE = 'Maquillage',
  COIFFURE = 'Coiffure',
  ACCESSOIRE = 'Accessoire'
}

export enum ItemStatus {
  NEW = 'Neuf',
  USED = 'Entamé',
  EMPTY = 'Vide'
}

export enum SurplusAction {
  NONE = 'En attente',
  MARKETPLACE = 'Stock Virtuel (Réemploi)',
  DONATION = 'Don Pédagogique (Écoles)',
  SHORT_FILM = 'Don Court-Métrage'
}

export interface ConsumableItem {
  id: string;
  name: string;
  department: Department;
  quantityInitial: number;
  quantityCurrent: number;
  unit: string; // e.g., "rouleaux", "boîtes", "bouteilles"
  status: ItemStatus;
  surplusAction?: SurplusAction;
  ecoScore?: number; // 1-10
  purchased: boolean; // true if in stock, false if just a request/need
  isBought?: boolean; // true if purchased by production but not yet received by department
  price?: number; // Estimated cost in euros
  quantityStarted?: number; // Number of items currently opened/started
}

export interface Project {
  id: string;
  name: string;
  productionCompany: string;
  startDate: string;
  shootingStartDate?: string;
  shootingEndDate?: string;
  status: 'Pre-Prod' | 'Shooting' | 'Wrap';
  items: ConsumableItem[];
}

export interface ImpactMetrics {
  wasteDivertedKg: number;
  moneySaved: number;
  co2SavedKg: number;
  schoolsHelped: number;
  recyclingRate: number; // New field for AFNOR Spec 2308
  sustainabilityScore: number; // 0-100
  aiAnalysis?: string;
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
  merchantName?: string;
  items: string[]; // List of item names or IDs
  status: ExpenseStatus;
  receiptUrl?: string; // Base64 or URL

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
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  date: string; // ISO Date
}

export interface SocialPost {
  id: string;
  authorName: string;
  authorDepartment: Department | 'PRODUCTION';
  content: string;
  photo?: string; // URL or Base64
  date: string; // ISO Date
  likes: number;
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

  // Admin Info
  ssn: string; // Numéro de sécurité sociale
  birthPlace: string;
  birthDate: string;
  birthDepartment: string;
  birthCountry: string;
  nationality: string;
  socialSecurityCenterAddress: string;

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

export interface User {
  name: string;
  email: string;
  department: Department | 'PRODUCTION';
  productionName: string;
  filmTitle: string;
}
