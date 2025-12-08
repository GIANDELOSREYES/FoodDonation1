import { Routes } from '@angular/router';
import { Donate } from './donate/donate';
import { Admin } from './admin/admin';
import { Browse } from './browse/browse';
import { ContactsComponent } from './contacts/contacts.component';
import { InqueriesComponent } from './inqueries/inqueries.component';
import { ToDoComponent } from './to-do/to-do.component';
import { Login } from './login/login';

export const routes: Routes = [

    {path: 'donate', component: Donate},
    {path: 'admin', component: Admin},
    {path: 'login', component: Login},
    {path: 'browse', component: Browse},
    {path: 'contacts', component: ContactsComponent},
    {path: 'inquiry', component: InqueriesComponent},
    {path: 'todo', component: ToDoComponent},
    {path: '', redirectTo: 'donate', pathMatch: 'full' }
];