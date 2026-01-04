import { Component, Input, forwardRef, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-shared-input',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './shared-input.component.html',
  styleUrls: ['./shared-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SharedInputComponent),
      multi: true
    }
  ]
})
export class SharedInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() type: string = 'text';
  @Input() name?: string;
  @Input() required: boolean = false;
  @Input() icon?: string;
  @Input() autocomplete?: string;
  @Input() suffixIcon?: string; // icon displayed at the end (e.g., eye)
  @Output() suffixClick = new EventEmitter<void>();

  value: any = '';
  disabled = false;

  private onChange = (_: any) => {};
  private onTouched = () => {};

  writeValue(obj: any): void {
    this.value = obj;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(v: any) {
    this.value = v;
    this.onChange(this.value);
  }

  touched() {
    this.onTouched();
  }

  onSuffixClick() {
    this.suffixClick.emit();
  }
}
