import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type AuthView = 'login' | 'register' | 'forgotPassword';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  login = output<void>();
  view = signal<AuthView>('login');
  passwordResetSent = signal(false);

  handleLogin() {
    // En una app real, aquí se validarían las credenciales.
    // Para esta demo, simplemente emitimos el evento de login.
    this.login.emit();
  }
  
  handleRegister() {
    // En una app real, se registraría al usuario y luego se le iniciaría sesión.
    this.login.emit();
  }

  handlePasswordReset() {
    // Simulamos el envío de un correo electrónico.
    this.passwordResetSent.set(true);
  }

  setView(view: AuthView) {
    this.view.set(view);
    this.passwordResetSent.set(false); // Reiniciar el mensaje al cambiar de vista
  }
}
