import { Component, ChangeDetectionStrategy, input, output, signal, WritableSignal, OnInit, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { UserProfile } from '../../app.component';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './edit-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfileComponent implements OnInit {
  profile = input.required<UserProfile>();
  profileSaved = output<UserProfile>();
  cancelled = output<void>();

  // Local state for the form
  editableProfile: WritableSignal<UserProfile | null> = signal(null);
  isGettingLocation = signal(false);
  galleryImageIndexToReplace = signal<number | null>(null);

  // Computed signal for character count
  descriptionCharCount = computed(() => this.editableProfile()?.description.length ?? 0);

  ngOnInit(): void {
    // Clone the profile to avoid mutating the input directly
    this.editableProfile.set({ ...this.profile() });
  }

  updateField<K extends keyof UserProfile>(field: K, value: UserProfile[K]) {
    this.editableProfile.update(p => p ? { ...p, [field]: value } : null);
  }
  
  onNameInput(event: Event) {
    this.updateField('name', (event.target as HTMLInputElement).value);
  }

  onDogNameInput(event: Event) {
    this.updateField('dogName', (event.target as HTMLInputElement).value);
  }
  
  onBreedInput(event: Event) {
    this.updateField('breed', (event.target as HTMLInputElement).value);
  }

  onAgeInput(event: Event) {
     this.updateField('age', parseInt((event.target as HTMLInputElement).value, 10) || 0);
  }
  
  onGenderChange(event: Event) {
    this.updateField('gender', (event.target as HTMLSelectElement).value as UserProfile['gender']);
  }
  
  onLocationInput(event: Event) {
     this.updateField('location', (event.target as HTMLInputElement).value);
  }
  
  onDescriptionInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    // Enforce character limit
    if (value.length <= 250) {
      this.updateField('description', value);
    }
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("La geolocalización no es compatible con tu navegador.");
      return;
    }

    this.isGettingLocation.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, you'd use a reverse geocoding service here.
        // For this demo, we'll just show the coordinates.
        this.updateField('location', `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        this.isGettingLocation.set(false);
      },
      (error: GeolocationPositionError) => {
        // Log the full error object for better debugging
        console.error("Geolocation error details:", error);
        
        let alertMessage = "No se pudo obtener la ubicación. Inténtalo de nuevo.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alertMessage = "Has denegado el permiso de ubicación. Por favor, actívalo en los ajustes de tu navegador si quieres usar esta función.";
            break;
          case error.POSITION_UNAVAILABLE:
            alertMessage = "La información de tu ubicación no está disponible en este momento. Intenta conectarte a otra red o moverte a un lugar con mejor señal.";
            break;
          case error.TIMEOUT:
            alertMessage = "La solicitud de ubicación ha tardado demasiado. Por favor, inténtalo de nuevo.";
            break;
        }

        alert(alertMessage);
        this.isGettingLocation.set(false);
      }
    );
  }
  
  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      try {
        const imageUrl = await this.readFileAsDataUrl(file);
        this.updateField('imageUrl', imageUrl);
      } catch (e) {
        console.error("Error reading avatar file:", e);
        alert("No se pudo cargar la imagen. Intenta con otra.");
      }
    }
  }

  async onGalleryImageAdd(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const currentImages = this.editableProfile()?.galleryImages ?? [];
    const availableSlots = 4 - currentImages.length;
    if (availableSlots <= 0) {
      alert("Puedes subir un máximo de 4 fotos a tu galería.");
      return;
    }

    const files = Array.from(input.files).slice(0, availableSlots);

    for (const file of files) {
      try {
        const imageUrl = await this.readFileAsDataUrl(file);
        this.editableProfile.update(p => {
          if (!p) return null;
          const newGallery = [...(p.galleryImages ?? []), imageUrl];
          return { ...p, galleryImages: newGallery };
        });
      } catch (e) {
        console.error("Error reading gallery file:", e);
        alert(`No se pudo cargar una de las imágenes (${file.name}).`);
      }
    }
    // Reset the file input so the same file can be selected again if removed
    input.value = '';
  }

  setIndexToReplace(index: number) {
    this.galleryImageIndexToReplace.set(index);
  }

  async onGalleryImageReplace(event: Event) {
    const input = event.target as HTMLInputElement;
    const indexToReplace = this.galleryImageIndexToReplace();

    if (input.files?.length && indexToReplace !== null) {
      const file = input.files[0];
      try {
        const imageUrl = await this.readFileAsDataUrl(file);
        this.editableProfile.update(p => {
          if (!p) return null;
          // Create a new array to maintain immutability
          const newGallery = [...p.galleryImages];
          newGallery[indexToReplace] = imageUrl;
          return { ...p, galleryImages: newGallery };
        });
      } catch (e) {
        console.error("Error reading gallery file for replacement:", e);
        alert("No se pudo cargar la imagen. Intenta con otra.");
      } finally {
        // Reset state
        this.galleryImageIndexToReplace.set(null);
        input.value = '';
      }
    }
  }

  removeGalleryImage(indexToRemove: number) {
    this.editableProfile.update(p => {
      if (!p) return null;
      const newGallery = p.galleryImages.filter((_, index) => index !== indexToRemove);
      return { ...p, galleryImages: newGallery };
    });
  }

  saveChanges() {
    const finalProfile = this.editableProfile();
    if (finalProfile) {
      this.profileSaved.emit(finalProfile);
    }
  }

  cancel() {
    this.cancelled.emit();
  }
}
