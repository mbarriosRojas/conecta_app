import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(private toastController: ToastController) {}

  // Debounce function for search
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: any;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Throttle function for scroll events
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Format phone number
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    }
    
    return phone;
  }

  // Format distance
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      const km = (meters / 1000).toFixed(1);
      return `${km}km`;
    }
  }

  // Format rating
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  // Generate star array for rating display
  generateStarArray(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
    
    if (hasHalfStar) {
      stars.push('star-half');
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push('star-outline');
    }
    
    return stars;
  }

  // Check if image URL is valid
  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
    } catch {
      return false;
    }
  }

  // Get default image URL
  getDefaultImageUrl(): string {
    return 'assets/images/default-provider.svg';
  }

  // Sanitize search query
  sanitizeSearchQuery(query: string): string {
    return query.trim().replace(/[<>]/g, '');
  }

  // Check if device is online
  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  // Show toast message
  async showToast(message: string, color: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark' = 'primary', duration: number = 3000) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'top',
      color,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  // Copy text to clipboard
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  // Open external URL
  openExternalUrl(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Format date
  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format time
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  }

  // Check if time is in range
  isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Handle overnight hours (e.g., 22:00 - 06:00)
      return current >= start || current <= end;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Generate unique ID
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Deep clone object
  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Check if object is empty
  isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (typeof obj === 'string') return obj.trim() === '';
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  // Retry function with exponential backoff
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError!;
  }
}
