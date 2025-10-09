export interface Provider {
  _id: string;
  name: string;
  description: string;
  logo: string;
  images: string[];
  phone_contact: string;
  phone_number: string;
  phone?: string; // Alias para compatibilidad
  categoryId: string | Category;
  stand_out: boolean;
  verified: boolean;
  email: string;
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    linkedin: string;
  };
  views: number;
  map_views: number;
  count_total: number;
  count_rating: number;
  rating: number;
  schedule: Schedule[];
  questions?: Question[];
  site_web: string;
  video: string;
  address: Address;
  slug: string;
  distance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  day: string;
  active: boolean;
  start: string;
  end: string;
}

export interface Question {
  question: string;
  answer: string;
}

export interface Address {
  street: string;
  address?: string; // Alias para compatibilidad
  city: string;
  state?: string; // Alias para departament
  departament: string;
  country: string;
  location: {
    type: string;
    coordinates: number[]; // [lng, lat]
  };
}

export interface Category {
  _id: string;
  name: string;
  image: string;
  background: string;
  position: number;
  favorite: boolean;
}

export interface ProviderFilters {
  lat?: number;
  lng?: number;
  radius?: number;
  city?: string;
  search?: string;
  categoryId?: string;
  type_filter?: 'rating' | 'views' | 'distance';
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T[];
  pagination?: PaginationInfo;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price?: number;
  images: string[];
  category: string;
  providerId: string;
  isActive: boolean;
  featured: boolean;
  stock?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
