import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { GeofencingService, GeofenceRegion } from '../../services/geofencing.service';

@Component({
  selector: 'app-geofencing-settings',
  templateUrl: './geofencing-settings.component.html',
  styleUrls: ['./geofencing-settings.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class GeofencingSettingsComponent implements OnInit {
  isMonitoring = false;
  currentRegions: GeofenceRegion[] = [];
  isLoading = false;

  constructor(
    private geofencingService: GeofencingService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    this.isLoading = true;
    
    try {
      this.isMonitoring = this.geofencingService.isMonitoringActive();
      this.currentRegions = this.geofencingService.getCurrentRegions();
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async toggleGeofencing() {
    this.isLoading = true;

    try {
      if (this.isMonitoring) {
        await this.geofencingService.stopMonitoring();
        this.isMonitoring = false;
      } else {
        const initialized = await this.geofencingService.initialize();
        if (initialized) {
          this.isMonitoring = true;
          this.currentRegions = this.geofencingService.getCurrentRegions();
        }
      }
    } catch (error) {
      console.error('Error cambiando estado de geofencing:', error);
      await this.showErrorToast('Error al cambiar configuración');
    } finally {
      this.isLoading = false;
    }
  }

  async refreshGeofences() {
    this.isLoading = true;

    try {
      await this.geofencingService.refreshGeofences();
      this.currentRegions = this.geofencingService.getCurrentRegions();
      await this.showSuccessToast('Geocercas actualizadas');
    } catch (error) {
      console.error('Error actualizando geocercas:', error);
      await this.showErrorToast('Error actualizando geocercas');
    } finally {
      this.isLoading = false;
    }
  }

  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
