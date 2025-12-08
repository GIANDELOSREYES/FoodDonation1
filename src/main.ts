import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { environment } from './app/environments/environment';

bootstrapApplication(App, {
	providers: [
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		provideFirestore(() => getFirestore()),
		provideRouter(routes)
	]
}).catch(err => console.error(err));