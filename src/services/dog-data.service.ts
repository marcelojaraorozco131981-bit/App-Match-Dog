import { Injectable } from '@angular/core';

export type DogSize = 'Pequeño' | 'Mediano' | 'Grande';

export interface DogProfile {
  id: number;
  name: string;
  age: number;
  breed: string;
  size: DogSize;
  bio: string;
  imageUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class DogDataService {
  private initialProfiles: Omit<DogProfile, 'id' | 'imageUrl'>[] = [
    { name: 'Max', age: 3, breed: 'Golden Retriever', size: 'Grande', bio: 'Me encanta perseguir pelotas y los largos paseos por el parque. Busco un amigo para compartir mis juguetes.' },
    { name: 'Bella', age: 2, breed: 'Poodle', size: 'Mediano', bio: 'Soy una diva a la que le encantan los mimos y los snacks gourmet. ¿Tienes buen gusto?' },
    { name: 'Rocky', age: 5, breed: 'Bulldog Francés', size: 'Pequeño', bio: 'Experto en siestas y en roncar fuerte. Mi pasatiempo favorito es comer.' },
    { name: 'Lucy', age: 1, breed: 'Beagle', size: 'Mediano', bio: 'Tengo una energía infinita y una nariz que lo encuentra todo. ¡Vamos a la aventura!' },
    { name: 'Charlie', age: 4, breed: 'Labrador', size: 'Grande', bio: 'Amante del agua y de hacer nuevos amigos. Si tienes una piscina, ya me gustas.' },
    { name: 'Daisy', age: 6, breed: 'Shih Tzu', size: 'Pequeño', bio: 'Pequeña en tamaño pero grande en personalidad. Disfruto de una buena sesión de sofá y series.' },
    { name: 'Cooper', age: 2, breed: 'Husky Siberiano', size: 'Grande', bio: 'Me gusta hablar (aullar) de mis sentimientos y correr como si no hubiera un mañana.' },
    { name: 'Sadie', age: 3, breed: 'Pastor Alemán', size: 'Grande', bio: 'Leal, inteligente y siempre lista para aprender un nuevo truco. ¿Jugamos a buscar?' },
    { name: 'Toby', age: 7, breed: 'Corgi', size: 'Pequeño', bio: 'Mis patas cortas no me impiden tener grandes sueños. Soy el rey de los memes.' },
    { name: 'Molly', age: 1, breed: 'Dachshund', size: 'Pequeño', bio: 'Larga, bajita y llena de amor. Me especializo en cavar en el jardín y acurrucarme.' },
  ];
  
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getDogProfiles(): DogProfile[] {
    // Assign stable IDs first based on the initial array order
    const profilesWithIds = this.initialProfiles.map((profile, index) => ({
      ...profile,
      id: index + 1, // This ID is now stable for each dog
    }));

    const shuffled = this.shuffleArray(profilesWithIds);

    // Now, map the shuffled array to get new image URLs each time
    return shuffled.map(profile => ({
      ...profile,
      imageUrl: `https://picsum.photos/seed/${profile.name}${Date.now()}/400/600`,
    }));
  }
}