import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inqueries',
  imports: [CommonModule , FormsModule],
  templateUrl: './inqueries.component.html',
  styleUrl: './inqueries.component.css'
})
export class InqueriesComponent {
  Title = signal('');
  Food = signal('');
  donorName = signal('');
  contactInformation = signal('');
  Message = signal('');
  photoPreview = signal<string | null>(null);
  inquiries: any[] = [];

  constructor(private firestore: Firestore) {
    const inquiryCollection = collection(this.firestore, 'inquery');
    collectionData(inquiryCollection, { idField: 'id' })
      .subscribe(data => {
        this.inquiries = data;
      });
  }

  deleteInquiry(id: string) {
    const inquiryDoc = doc(this.firestore, `inquery/${id}`);
    deleteDoc(inquiryDoc);
  }

  // Download photo from Firebase Storage URL
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

  updateIsDone(id: string){
    const inquiryDoc = doc(this.firestore, `inquery/${id}`);
    updateDoc(inquiryDoc, {
      isDone: true
    });
  }

  get notDoneInquiries(){
    return this.inquiries.filter(item => item['isDone'] == false);
  }

  get olderInquiries(){
    if (!this.inquiries) return [];

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate()-5);

    return this.inquiries.filter(inquiry => {
      const createdAt = inquiry.createdAt?.toDate ? inquiry.createdAt.toDate() : new Date(inquiry.createdAt);
      return (createdAt < fiveDaysAgo)&& (inquiry.isDone == false);
    });
  }


   dateOlderInquiries(id: string){
    const inquiry = this.inquiries.find(item => item.id === id);
    if (!inquiry) return null;
    const createdAt = inquiry.createdAt?.toDate ? inquiry.createdAt.toDate() : new Date(inquiry.createdAt);
    const today = new Date();
    return Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }


}
