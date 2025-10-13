import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  mask: string;
}

@Component({
  selector: 'app-country-selector',
  templateUrl: './country-selector.component.html',
  styleUrls: ['./country-selector.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class CountrySelectorComponent implements OnInit {
  @Input() selectedCountry: Country | null = null;
  @Input() phoneNumber: string = '';
  @Output() countryChange = new EventEmitter<Country>();
  @Output() phoneNumberChange = new EventEmitter<string>();
  @Output() fullPhoneNumberChange = new EventEmitter<string>();

  countries: Country[] = [
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58', mask: '0000-0000000' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57', mask: '000-0000000' },
    { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52', mask: '000-000-0000' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', mask: '000-000-0000' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51', mask: '000-000-000' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', mask: '0000-000000' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', mask: '000-000-000' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591', mask: '0000-0000' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', mask: '000-000-000' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598', mask: '0000-0000' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55', mask: '00-00000-0000' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1', mask: '000-000-0000' },
    { code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '+34', mask: '000-00-00-00' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹', dialCode: '+39', mask: '000-000-0000' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷', dialCode: '+33', mask: '000-00-00-00' },
    { code: 'DE', name: 'Alemania', flag: '🇩🇪', dialCode: '+49', mask: '000-00000000' },
    { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', dialCode: '+44', mask: '0000-000000' },
    { code: 'CA', name: 'Canadá', flag: '🇨🇦', dialCode: '+1', mask: '000-000-0000' }
  ];

  filteredCountries: Country[] = [];
  searchTerm: string = '';
  isOpen: boolean = false;

  ngOnInit() {
    this.filteredCountries = [...this.countries];
    
    // Si no hay país seleccionado, usar Venezuela por defecto
    if (!this.selectedCountry) {
      this.selectedCountry = this.countries.find(c => c.code === 'VE') || this.countries[0];
      this.countryChange.emit(this.selectedCountry);
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterCountries();
  }

  filterCountries() {
    if (!this.searchTerm) {
      this.filteredCountries = [...this.countries];
    } else {
      this.filteredCountries = this.countries.filter(country =>
        country.name.toLowerCase().includes(this.searchTerm) ||
        country.dialCode.includes(this.searchTerm) ||
        country.code.toLowerCase().includes(this.searchTerm)
      );
    }
  }

  selectCountry(country: Country) {
    this.selectedCountry = country;
    this.isOpen = false;
    this.searchTerm = '';
    this.filterCountries();
    this.countryChange.emit(country);
    this.emitFullPhoneNumber();
  }

  onPhoneNumberChange(event: any) {
    let value = event.detail.value;
    
    // Remover caracteres no numéricos excepto + al inicio
    value = value.replace(/[^\d+]/g, '');
    
    // Si empieza con +, mantenerlo, sino removerlo
    if (!value.startsWith('+')) {
      value = value.replace(/\+/g, '');
    }
    
    this.phoneNumber = value;
    this.phoneNumberChange.emit(value);
    this.emitFullPhoneNumber();
  }

  private emitFullPhoneNumber() {
    if (this.selectedCountry && this.phoneNumber) {
      let fullNumber = this.phoneNumber;
      
      // Si el número no empieza con +, agregar el código del país
      if (!fullNumber.startsWith('+')) {
        fullNumber = this.selectedCountry.dialCode + fullNumber;
      }
      
      this.fullPhoneNumberChange.emit(fullNumber);
    }
  }

  toggleDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchTerm = '';
      this.filterCountries();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Cerrar el dropdown si se hace clic fuera del componente
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.country-selector');
    
    if (!clickedInside && this.isOpen) {
      this.isOpen = false;
    }
  }

  getDisplayPhoneNumber(): string {
    if (!this.phoneNumber) return '';
    
    // Si el número empieza con +, mostrarlo tal como está
    if (this.phoneNumber.startsWith('+')) {
      return this.phoneNumber;
    }
    
    // Si no, mostrar con el código del país seleccionado
    if (this.selectedCountry) {
      return this.selectedCountry.dialCode + this.phoneNumber;
    }
    
    return this.phoneNumber;
  }

  getMaskedPhoneNumber(): string {
    if (!this.phoneNumber || !this.selectedCountry) return '';
    
    let number = this.phoneNumber.replace(/[^\d]/g, '');
    let mask = this.selectedCountry.mask;
    let masked = '';
    let numberIndex = 0;
    
    for (let i = 0; i < mask.length && numberIndex < number.length; i++) {
      if (mask[i] === '0') {
        masked += number[numberIndex];
        numberIndex++;
      } else {
        masked += mask[i];
      }
    }
    
    return masked;
  }
}
