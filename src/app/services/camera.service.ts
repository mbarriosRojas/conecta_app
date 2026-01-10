import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, CameraPermissionType } from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

export interface CameraImage {
  base64String?: string;
  dataUrl?: string;
  path?: string;
  format: string;
}

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  constructor(private platform: Platform) {}

  /**
   * Verifica y solicita permisos de cámara
   */
  async checkCameraPermissions(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      return true; // En web, no se necesitan permisos especiales
    }

    try {
      const permissions = await Camera.checkPermissions();
      
      // Verificar si ya tiene permisos
      if (permissions.camera === 'granted' && permissions.photos === 'granted') {
        return true;
      }

      // Solicitar permisos si no están otorgados
      const requestResult = await Camera.requestPermissions({
        permissions: ['camera', 'photos']
      });

      return requestResult.camera === 'granted' && requestResult.photos === 'granted';
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  /**
   * Toma una foto con la cámara
   */
  async takePhoto(quality: number = 90): Promise<CameraImage | null> {
    try {
      // Verificar permisos primero
      const hasPermission = await this.checkCameraPermissions();
      if (!hasPermission) {
        throw new Error('No se han otorgado permisos para usar la cámara');
      }

      const image = await Camera.getPhoto({
        quality,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false, // No guardar en galería automáticamente
        correctOrientation: true, // Corregir orientación en iOS
      });

      if (!image.base64String) {
        throw new Error('No se pudo obtener la imagen de la cámara');
      }

      return {
        base64String: image.base64String,
        dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        format: image.format || 'jpeg'
      };
    } catch (error: any) {
      console.error('Error taking photo:', error);
      
      // Proporcionar mensajes de error más descriptivos
      let errorMessage = 'Error al tomar la foto';
      
      if (error.message?.includes('permission')) {
        errorMessage = 'Por favor, otorga permisos para usar la cámara en Configuración';
      } else if (error.message?.includes('camera')) {
        errorMessage = 'No se pudo acceder a la cámara. Verifica que esté disponible';
      } else if (error.message === 'User cancelled photos app') {
        errorMessage = 'Acción cancelada';
        return null; // No es un error real, el usuario canceló
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Selecciona una foto de la galería
   */
  async selectPhoto(quality: number = 90): Promise<CameraImage | null> {
    try {
      // Verificar permisos primero
      const hasPermission = await this.checkCameraPermissions();
      if (!hasPermission) {
        throw new Error('No se han otorgado permisos para acceder a la galería');
      }

      // En Capacitor Camera 7.x, CameraSource.Photos funciona tanto en iOS como Android
      const source = CameraSource.Photos;

      const image = await Camera.getPhoto({
        quality,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source,
        correctOrientation: true, // Corregir orientación en iOS
      });

      if (!image.base64String) {
        throw new Error('No se pudo obtener la imagen de la galería');
      }

      return {
        base64String: image.base64String,
        dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        format: image.format || 'jpeg'
      };
    } catch (error: any) {
      console.error('Error selecting photo:', error);
      
      // Proporcionar mensajes de error más descriptivos
      let errorMessage = 'Error al seleccionar la foto';
      
      if (error.message?.includes('permission')) {
        errorMessage = 'Por favor, otorga permisos para acceder a la galería en Configuración';
      } else if (error.message?.includes('photos')) {
        errorMessage = 'No se pudo acceder a la galería. Verifica que esté disponible';
      } else if (error.message === 'User cancelled photos app' || error.message === 'User cancelled') {
        errorMessage = 'Acción cancelada';
        return null; // No es un error real, el usuario canceló
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Verifica si es una plataforma nativa
   */
  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Verifica si es iOS
   */
  private isIOS(): boolean {
    return this.platform.is('ios') && this.isNativePlatform();
  }

  /**
   * Verifica si es Android
   */
  private isAndroid(): boolean {
    return this.platform.is('android') && this.isNativePlatform();
  }
}

