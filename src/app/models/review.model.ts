export interface Review {
  id: string;
  name: string;
  comment: string;
  rating: number;
  image?: string; // Imagen de la reseña (opcional)
  userProfileImage?: string; // 🔥 NUEVO: Foto de perfil del usuario
  like: number;
  createdAt: string;
}

export interface CreateReviewRequest {
  providerId: string;
  rating: number; // 1-5
  comment?: string;
  image?: string; // Imagen de la reseña (opcional)
  userProfileImage?: string; // 🔥 NUEVO: Foto de perfil del usuario
}

export interface CreateReviewResponse {
  success: boolean;
  message: string;
  review: any;
}

export interface ReviewsResponse {
  status: 'success' | 'error';
  message: string;
  data: Review[];
}

