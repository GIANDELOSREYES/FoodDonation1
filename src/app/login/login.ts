import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  username = signal('');
  password = signal('');
  role = signal('employee');

  private router = inject(Router);

  // simple demo login - in production replace with real auth
  login() {
    const u = this.username().trim();
    const p = this.password();

    if (u === 'employee' && p === 'food4baguio') {
      sessionStorage.setItem('role', 'employee');
      sessionStorage.removeItem('adminLoggedIn');
      this.router.navigate(['/browse']).then(() => location.reload());
      return;
    }

    if (u === 'admin' && p === 'password') {
      sessionStorage.setItem('role', 'admin');
      sessionStorage.setItem('adminLoggedIn', 'true');
      this.router.navigate(['/admin']).then(() => location.reload());
      return;
    }

    alert('Invalid username or password');
  }

  logout() {
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('adminLoggedIn');
    this.router.navigate(['/']).then(() => location.reload());
  }
}
