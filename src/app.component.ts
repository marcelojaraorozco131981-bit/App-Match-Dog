import { Component, ChangeDetectionStrategy, signal, computed, effect, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { DogProfile, DogDataService } from './services/dog-data.service';
import { GeminiService } from './services/gemini.service';
import { DogCardComponent } from './components/dog-card/dog-card.component';
import { LoginComponent } from './components/login/login.component';
import { EditProfileComponent } from './components/edit-profile/edit-profile.component';
import { FiltersComponent, Filters } from './components/filters/filters.component';

export interface Message {
  sender: 'user' | 'dog';
  text: string;
}

export interface Match {
  dog: DogProfile;
  messages: Message[];
  isLoadingIcebreaker: boolean;
  isDogTyping: boolean;
}

export interface UserProfile {
  name: string;
  dogName: string;
  age: number;
  location: string;
  imageUrl: string;
  gender: 'Masculino' | 'Femenino' | 'Otro';
  description: string;
  galleryImages: string[];
  breed: string;
}

type AppView = 'swipe' | 'matches' | 'profile' | 'editProfile';

const DEFAULT_FILTERS: Filters = {
  breed: 'all',
  ageRange: { min: 0, max: 15 },
  sizes: [],
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, DogCardComponent, LoginComponent, EditProfileComponent, FiltersComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private dogDataService = inject(DogDataService);
  private geminiService = inject(GeminiService);
  @ViewChild('chatContainer') private chatContainer?: ElementRef<HTMLDivElement>;

  // App state
  isLoggedIn = signal<boolean>(false);
  currentView = signal<AppView>('swipe');
  
  // User profile
  userProfile = signal<UserProfile>({
    name: 'Carlos',
    dogName: 'Max',
    age: 4,
    location: 'Ciudad de México, MX',
    imageUrl: 'https://picsum.photos/seed/carlos-pinder/200',
    gender: 'Masculino',
    description: 'Amante de los perros, el café y las largas caminatas. Mi Golden Retriever es mi mejor amigo y siempre estamos buscando nuevas aventuras.',
    galleryImages: [
      'https://picsum.photos/seed/gallery1/400',
      'https://picsum.photos/seed/gallery2/400',
      'https://picsum.photos/seed/gallery3/400',
    ],
    breed: 'Golden Retriever'
  });

  // Dog profiles state
  allProfiles = signal<DogProfile[]>([]);
  currentIndex = signal(0);
  
  // Filter state
  showFilters = signal(false);
  filters = signal<Filters>(DEFAULT_FILTERS);
  
  // Match state
  matches = signal<Match[]>([]);
  selectedMatch = signal<Match | null>(null);
  showMatchNotification = signal<DogProfile | null>(null);

  // UI State for image replacement
  imageSourceToReplaceIndex = signal<number | null>(null);
  
  // Computed signals
  availableBreeds = computed(() => 
    [...new Set(this.dogDataService.getDogProfiles().map(p => p.breed))].sort()
  );

  filteredProfiles = computed(() => {
    const { breed, ageRange, sizes } = this.filters();
    return this.allProfiles().filter(profile => {
      const breedMatch = breed === 'all' || profile.breed === breed;
      const ageMatch = profile.age >= ageRange.min && profile.age <= ageRange.max;
      const sizeMatch = sizes.length === 0 || sizes.includes(profile.size);
      return breedMatch && ageMatch && sizeMatch;
    });
  });

  currentProfile = computed(() => this.filteredProfiles()?.[this.currentIndex()]);
  
  activeFilterCount = computed(() => {
    const current = this.filters();
    let count = 0;
    if (current.breed !== 'all') count++;
    if (current.sizes.length > 0) count++;
    if (current.ageRange.min !== DEFAULT_FILTERS.ageRange.min || current.ageRange.max !== DEFAULT_FILTERS.ageRange.max) count++;
    return count;
  });
  
  constructor() {
    this.loadMatchesFromStorage();
    this.loadUserProfileFromStorage();
    this.allProfiles.set(this.dogDataService.getDogProfiles());

    // Auto-scroll effect for chat
    effect(() => {
      const messages = this.selectedMatch()?.messages;
      if (messages && this.chatContainer) {
        // Use a timeout to allow the DOM to update before scrolling
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });

    // Save matches to localStorage whenever they change
    effect(() => {
      this.saveMatchesToStorage(this.matches());
    });
    
     // Save user profile to localStorage whenever it changes
    effect(() => {
      this.saveUserProfileToStorage(this.userProfile());
    });
  }

  private saveMatchesToStorage(matches: Match[]): void {
    try {
      const storableMatches = matches.map(m => ({
          dog: m.dog,
          messages: m.messages
      }));
      localStorage.setItem('pinder_matches', JSON.stringify(storableMatches));
    } catch (e) {
      console.error('Error saving matches to localStorage', e);
    }
  }

  private loadMatchesFromStorage(): void {
    try {
      const storedData = localStorage.getItem('pinder_matches');
      if (storedData) {
        const parsedData: {dog: DogProfile, messages: Message[]}[] = JSON.parse(storedData);
        const fullMatches: Match[] = parsedData.map(m => ({
          ...m,
          isLoadingIcebreaker: false,
          isDogTyping: false
        }));
        this.matches.set(fullMatches);
      }
    } catch (e) {
      console.error('Error loading matches from localStorage', e);
      this.matches.set([]);
    }
  }
  
  private saveUserProfileToStorage(profile: UserProfile): void {
    try {
      localStorage.setItem('pinder_user_profile', JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving user profile to localStorage', e);
    }
  }

  private loadUserProfileFromStorage(): void {
    try {
      const storedData = localStorage.getItem('pinder_user_profile');
      if (storedData) {
        this.userProfile.set(JSON.parse(storedData));
      }
    } catch (e) {
      console.error('Error loading user profile from localStorage', e);
    }
  }

  private scrollToBottom(): void {
    if(this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }

  onLogin() {
    this.isLoggedIn.set(true);
  }

  onLogout() {
    this.isLoggedIn.set(false);
    this.currentView.set('swipe');
    this.selectedMatch.set(null);
  }
  
  onSwipe(liked: boolean) {
    const swipedProfile = this.currentProfile();
    if (!swipedProfile) return;

    if (liked) {
      const alreadyMatched = this.matches().some(m => m.dog.id === swipedProfile.id);
      if (!alreadyMatched && Math.random() > 0.5) {
        this.createMatch(swipedProfile);
      }
    }
    
    this.currentIndex.update(i => i + 1);
  }

  private createMatch(profile: DogProfile) {
    const newMatch: Match = { dog: profile, messages: [], isLoadingIcebreaker: true, isDogTyping: false };
    this.matches.update(m => [newMatch, ...m]);
    
    this.showMatchNotification.set(profile);
    setTimeout(() => this.showMatchNotification.set(null), 3000);

    this.geminiService.generateIcebreaker(profile.name, profile.breed).then(icebreaker => {
      const firstMessage: Message = { sender: 'dog', text: icebreaker };
      this.matches.update(currentMatches => 
        currentMatches.map(m => 
          m.dog.id === profile.id 
          ? { ...m, messages: [firstMessage], isLoadingIcebreaker: false } 
          : m
        )
      );
    }).catch(error => {
      console.error("Error generating icebreaker:", error);
      const errorMessage: Message = { sender: 'dog', text: '¡Ups! No pude pensar en nada ingenioso.' };
       this.matches.update(currentMatches => 
        currentMatches.map(m => 
          m.dog.id === profile.id 
          ? { ...m, messages: [errorMessage], isLoadingIcebreaker: false } 
          : m
        )
      );
    });
  }

  setView(view: AppView) {
    this.currentView.set(view);
    this.showFilters.set(false);
    if (view !== 'matches') {
      this.selectedMatch.set(null);
    }
  }

  selectMatch(match: Match | null) {
    this.selectedMatch.set(match);
  }
  
  handleProfileUpdate(updatedProfile: UserProfile) {
    this.userProfile.set(updatedProfile);
    this.setView('profile');
  }

  async sendMessage(text: string, form: HTMLFormElement) {
    const currentMatch = this.selectedMatch();
    if (!text.trim() || !currentMatch) return;
    form.reset();

    const userMessage: Message = { sender: 'user', text: text.trim() };
    
    const matchesWithUserMessage = this.matches().map(m =>
      m.dog.id === currentMatch.dog.id
        ? { ...m, messages: [...m.messages, userMessage], isDogTyping: true }
        : m
    );
    this.matches.set(matchesWithUserMessage);
    const updatedSelectedMatch = matchesWithUserMessage.find(m => m.dog.id === currentMatch.dog.id);
    this.selectedMatch.set(updatedSelectedMatch || null);

    const chatHistory = updatedSelectedMatch?.messages ?? [];
    try {
      const replyText = await this.geminiService.generateChatReply(currentMatch.dog, chatHistory);
      const dogReply: Message = { sender: 'dog', text: replyText };

      const matchesWithAiReply = this.matches().map(m =>
        m.dog.id === currentMatch.dog.id
          ? { ...m, messages: [...m.messages, dogReply], isDogTyping: false }
          : m
      );
      this.matches.set(matchesWithAiReply);
      const finalSelectedMatch = matchesWithAiReply.find(m => m.dog.id === currentMatch.dog.id);
      this.selectedMatch.set(finalSelectedMatch || null);

    } catch (error) {
       console.error("Error generating chat reply:", error);
       const errorReply: Message = { sender: 'dog', text: "¡Guau! Mi cerebro se tomó una siesta. ¿Qué decías?" };

       const matchesWithError = this.matches().map(m =>
        m.dog.id === currentMatch.dog.id
          ? { ...m, messages: [...m.messages, errorReply], isDogTyping: false }
          : m
      );
      this.matches.set(matchesWithError);
      const finalSelectedMatch = matchesWithError.find(m => m.dog.id === currentMatch.dog.id);
      this.selectedMatch.set(finalSelectedMatch || null);
    }
  }

  resetProfiles() {
    this.currentIndex.set(0);
    this.allProfiles.set(this.dogDataService.getDogProfiles()); // Reshuffle
    this.setView('swipe');
  }
  
  toggleFilters() {
    this.showFilters.update(v => !v);
  }
  
  applyFilters(newFilters: Filters) {
    this.filters.set(newFilters);
    this.currentIndex.set(0);
    this.showFilters.set(false);
  }
  
  resetFilters() {
    this.filters.set(DEFAULT_FILTERS);
    this.currentIndex.set(0);
  }

  openImageSourceSelector(index: number) {
    this.imageSourceToReplaceIndex.set(index);
  }

  closeImageSourceSelector() {
    this.imageSourceToReplaceIndex.set(null);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async onGalleryImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const indexToReplace = this.imageSourceToReplaceIndex();

    if (input.files?.length && indexToReplace !== null) {
      const file = input.files[0];
      try {
        const imageUrl = await this.readFileAsDataUrl(file);
        this.userProfile.update(p => {
          const newGallery = [...p.galleryImages];
          newGallery[indexToReplace] = imageUrl;
          return { ...p, galleryImages: newGallery };
        });
      } catch (e) {
        console.error("Error reading gallery file for replacement:", e);
        alert("No se pudo cargar la imagen. Intenta con otra.");
      } finally {
        this.closeImageSourceSelector();
        input.value = ''; // Reset file input
      }
    } else {
      this.closeImageSourceSelector();
    }
  }
}