import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, addDoc, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-contacts',
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css'
})
export class ContactsComponent {

  Title = signal('');
  Food = signal('');
  donorName = signal('');
  contactInformation = signal('');
  Message = signal('');
  photoPreview = signal<string | null>(null);

  constructor(private firestore: Firestore) {}

  
  async onSubmit() {
      const contactsCollection = collection(this.firestore, 'inquery');

      const newInquery = {
        title: this.Title(),
        food: this.Food(),
        donorName: this.donorName(),
        contactInformation: this.contactInformation(),
        message: this.Message(),
        photoUrl: this.photoPreview(),
        isDone: false,
        createdAt: new Date()
      }

      await addDoc(contactsCollection, newInquery);

      this.Title.set('');
      this.Food.set('');
      this.donorName.set('');
      this.contactInformation.set('');
      this.Message.set('');
      this.photoPreview.set(null);

      alert('Submitted! Please wait for admin response... Thank you!');
    }

    onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }


}
