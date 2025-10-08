import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface ExpandRadiusOptions {
  currentRadius: number;
  suggestedRadius: number;
  maxRadius: number;
}

@Component({
  selector: 'app-no-results-expand',
  templateUrl: './no-results-expand.component.html',
  styleUrls: ['./no-results-expand.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class NoResultsExpandComponent {
  @Input() searchQuery: string = '';
  @Input() currentRadius: number = 20000; // 20km por defecto
  @Input() maxRadius: number = 100000; // 100km máximo
  @Input() isLoading: boolean = false;
  
  @Output() expandRadius = new EventEmitter<number>();
  @Output() retrySearch = new EventEmitter<void>();

  get suggestedRadius(): number {
    // Incrementos fijos: 20km -> 40km -> 60km -> 80km -> 100km
    if (this.currentRadius < 40000) return 40000;      // 20km -> 40km
    if (this.currentRadius < 60000) return 60000;      // 40km -> 60km  
    if (this.currentRadius < 80000) return 80000;      // 60km -> 80km
    if (this.currentRadius < 100000) return 100000;    // 80km -> 100km
    return this.maxRadius; // Ya está en el máximo
  }

  get radiusInKm(): string {
    return (this.currentRadius / 1000).toFixed(0);
  }

  get suggestedRadiusInKm(): string {
    return (this.suggestedRadius / 1000).toFixed(0);
  }

  onExpandRadius() {
    this.expandRadius.emit(this.suggestedRadius);
  }

  onRetrySearch() {
    this.retrySearch.emit();
  }

  get expandButtonText(): string {
    if (this.currentRadius >= this.maxRadius) {
      return 'Máximo alcanzado';
    }
    return 'Ampliar búsqueda';
  }

  get canExpand(): boolean {
    return this.currentRadius < this.maxRadius;
  }
}
