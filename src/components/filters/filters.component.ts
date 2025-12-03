import { Component, ChangeDetectionStrategy, input, output, signal, WritableSignal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogSize } from '../../services/dog-data.service';

export interface Filters {
  breed: string;
  ageRange: { min: number, max: number };
  sizes: DogSize[];
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersComponent implements OnInit {
  breeds = input.required<string[]>();
  initialFilters = input.required<Filters>();
  apply = output<Filters>();
  reset = output<void>();
  close = output<void>();
  
  localFilters: WritableSignal<Filters>;
  isClosing = signal(false);

  availableSizes: DogSize[] = ['Pequeño', 'Mediano', 'Grande'];

  constructor() {
    this.localFilters = signal({
      breed: 'all',
      ageRange: { min: 0, max: 15 },
      sizes: []
    });
  }

  ngOnInit(): void {
    // Deep copy to avoid mutating input
    this.localFilters.set(JSON.parse(JSON.stringify(this.initialFilters())));
  }

  onBreedChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.localFilters.update(f => ({ ...f, breed: value }));
  }

  onAgeChange(field: 'min' | 'max', event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.localFilters.update(f => {
        const newRange = { ...f.ageRange, [field]: value };
        // Ensure min is not greater than max
        if (newRange.min > newRange.max) {
          if (field === 'min') newRange.max = newRange.min;
          else newRange.min = newRange.max;
        }
        return { ...f, ageRange: newRange };
    });
  }

  onSizeChange(size: DogSize, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.localFilters.update(f => {
      const currentSizes = f.sizes;
      if (isChecked) {
        return { ...f, sizes: [...currentSizes, size] };
      } else {
        return { ...f, sizes: currentSizes.filter(s => s !== size) };
      }
    });
  }

  isSizeSelected(size: DogSize): boolean {
    return this.localFilters().sizes.includes(size);
  }

  applyFilters() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.apply.emit(this.localFilters());
      this.isClosing.set(false); // Reset state
    }, 300); // Match animation duration
  }

  resetFilters() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.reset.emit();
      this.close.emit();
      this.isClosing.set(false);
    }, 300);
  }

  closePanel() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
      this.isClosing.set(false);
    }, 300);
  }
}