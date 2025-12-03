
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { DogProfile } from '../../services/dog-data.service';

type SwipeDirection = 'left' | 'right' | null;

@Component({
  selector: 'app-dog-card',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './dog-card.component.html',
  styleUrls: ['./dog-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DogCardComponent {
  profile = input.required<DogProfile>();
  swipe = output<boolean>();

  swipeState = signal<SwipeDirection>(null);

  triggerSwipe(liked: boolean) {
    this.swipeState.set(liked ? 'right' : 'left');
    
    // Wait for animation to complete before emitting event
    setTimeout(() => {
      this.swipe.emit(liked);
      // Reset state for next card, though this component will be destroyed
      this.swipeState.set(null); 
    }, 400); 
  }
}
