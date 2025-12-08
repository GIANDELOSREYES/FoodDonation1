import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  protected readonly title = signal('FoodDonation');
  protected menuOpen = signal(false);
  private router = inject(Router);
 
  // role is stored in sessionStorage as 'role' = 'admin' | 'employee' | null
  get role(): string | null {
    return sessionStorage.getItem('role');
  }

  isAdmin() {
    return this.role === 'admin';
  }

  isEmployee() {
    return this.role === 'employee';
  }

  isLoggedIn() {
    return !!this.role;
  }

  ngOnInit() {
    // If admin is logged in and not on admin/login page, redirect to admin
    if (this.isAdmin() && !this.router.url.includes('/admin') && !this.router.url.includes('/login')) {
      this.router.navigate(['/admin']);
    }
  }

  toggleMenu() {
    this.menuOpen.update(isOpen => !isOpen);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  logoutAdmin() {
    // clear role on logout
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('adminLoggedIn');
    this.router.navigate(['/login']).then(() => {
      location.reload();
    });
  }
}

