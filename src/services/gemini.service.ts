
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { DogProfile } from './dog-data.service';
import { Message } from '../app.component';

export type MapLocationCategory = 'Parque para perros' | 'Clínica veterinaria' | 'Tienda de mascotas' | 'Alojamiento que admite mascotas';

export interface MapLocation {
  name: string;
  address: string;
  category: MapLocationCategory;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateIcebreaker(dogName: string, dogBreed: string): Promise<string> {
    const prompt = `Actúa como un perro muy carismático y divertido. 
    Crea un mensaje corto y juguetón (máximo 20 palabras) para romper el hielo en una app de citas para perros. 
    El mensaje es para un perro llamado ${dogName} de raza ${dogBreed}. 
    Ejemplos: "¡Guau! ¿Esa correa es de diseño? Tenemos que pasear juntos.", "He olido tu perfil desde el otro lado del parque. ¿Quedamos?".
    Sé original y encantador.`;

    try {
      const response: GenerateContentResponse = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return response.text.trim();
    } catch (error) {
      console.error('Error calling Gemini API for icebreaker:', error);
      // Fallback message
      return `¡Guau, ${dogName}! Tienes un perfil increíble. ¿Jugamos a buscar la pelota?`;
    }
  }

  async generateChatReply(dog: DogProfile, chatHistory: Message[]): Promise<string> {
    const formattedHistory = chatHistory.map(m => `${m.sender === 'user' ? 'Otro perro' : dog.name}: ${m.text}`).join('\n');
    
    const prompt = `Eres ${dog.name}, un ${dog.breed} carismático y juguetón en una app de citas para perros llamada Pinder. 
    Tu personalidad es divertida y un poco traviesa.
    Estás chateando con otro perro. Continúa la conversación de forma natural y atractiva.
    Aquí está el historial del chat:
    ${formattedHistory}

    Responde al último mensaje del 'Otro perro'. Tu respuesta debe ser corta (máximo 25 palabras), ingeniosa y mantener viva la conversación.
    No te repitas. ¡Sé creativo!`;

    try {
       const response: GenerateContentResponse = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return response.text.trim().replace(/^"/, '').replace(/"$/, ''); // Remove quotes if AI adds them
    } catch (error) {
       console.error('Error calling Gemini API for chat reply:', error);
      // Fallback message
      return `¡Guau! Me distraje persiguiendo mi cola. ¿Qué decías?`;
    }
  }

  async findNearbyDogPlaces(latitude: number, longitude: number): Promise<MapLocation[]> {
    const prompt = `Basado en la latitud ${latitude} y longitud ${longitude}, encuentra lugares de interés para perros en un radio de 5km. 
    Las categorías de interés son 'Parque para perros', 'Clínica veterinaria', 'Tienda de mascotas', y 'Alojamiento que admite mascotas'. 
    Devuelve una lista de hasta 10 lugares.`;

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                category: { 
                  type: Type.STRING,
                  enum: ['Parque para perros', 'Clínica veterinaria', 'Tienda de mascotas', 'Alojamiento que admite mascotas'] 
                }
              },
              required: ['name', 'address', 'category']
            }
          }
        }
      });
      
      const jsonText = response.text.trim();
      return JSON.parse(jsonText) as MapLocation[];

    } catch (error) {
      console.error('Error calling Gemini API for map locations:', error);
      throw new Error('Failed to fetch dog-friendly places.');
    }
  }
}
