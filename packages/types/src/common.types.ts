export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email?: string;
  address: Address;
}

export interface Dimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
  volume?: number; // calculated volume in cubic cm
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export enum PriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}