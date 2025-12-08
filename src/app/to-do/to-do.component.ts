import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, addDoc, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-to-do',
  imports: [CommonModule, FormsModule],
  templateUrl: './to-do.component.html',
  styleUrl: './to-do.component.css'
})
export class ToDoComponent {

  toDos: any[] = [];

  constructor(private firestore: Firestore) {
    const toDoCollection = collection(this.firestore, 'inquery');
    collectionData(toDoCollection, { idField: 'id' })
      .subscribe(data => {
        this.toDos = data.filter(item => item['isDone'] == true);
      });
  }

    removeToDo(id: string) {
      const toDoDoc = doc(this.firestore, `inquery/${id}`);
      deleteDoc(toDoDoc);
    }

    async downloadPhoto(photoUrl: string, fileName: string = 'photo') {
    if (!photoUrl) {
      alert('No photo available for download');
      return;
    }

    try {
      // Fetch the image from the URL
      const response = await fetch(photoUrl);
      if (!response.ok) {
        throw new Error('Failed to download photo');
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${fileName}.jpg`; // Add .jpg extension
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download photo');
    }
  }

  returnInquiry(id: string){
    const toDoDoc = doc(this.firestore, `inquery/${id}`);
    updateDoc(toDoDoc, { isDone: false });
  }




}
