import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform
  ) {}

  async ngOnInit() {
    console.log('🚀 AppComponent: Iniciando aplicación AKI...');
    
    try {
      // Inicializar StatusBar
      await this.initializeStatusBar();
      console.log('✅ AppComponent: StatusBar inicializado');
      
      // Esperar a que la plataforma esté lista
      await this.platform.ready();
      console.log('✅ AppComponent: Plataforma lista');
      
      console.log('🎉 AppComponent: Aplicación AKI iniciada correctamente');
      
    } catch (error) {
      console.error('❌ AppComponent: Error en inicialización:', error);
    }
  }

  private async initializeStatusBar() {
    try {
      if (this.platform.is('capacitor')) {
        await StatusBar.setStyle({ style: Style.Default });
        await StatusBar.setBackgroundColor({ color: '#667eea' });
        await StatusBar.show();
        console.log('✅ StatusBar configurado para AKI');
      }
    } catch (error) {
      console.error('❌ Error inicializando StatusBar:', error);
    }
  }
}