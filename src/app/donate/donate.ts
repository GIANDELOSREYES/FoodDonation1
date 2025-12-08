import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, addDoc, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donate.html',
  styleUrls: ['./donate.css']
})
export class Donate {

  title = signal('Food Donation Posting – Food4Baguio');

  // INPUT SIGNALS
  food = signal('');
  description = signal('');
  quantity = signal<number | null>(null);
  bestByDate = signal('');
  pickupLocation = signal('');
  donorName = signal('');
  contactInformation = signal('');
  photoPreview = signal<string | null>(null);

  faqItems = signal<Array<{question: string; answer: string; open: boolean}>>([
    { question: 'How do I post a donation?', answer: 'Fill out the form on this page and click "Post Donation". Your donation will be reviewed by the admin after submission.', open: false },
    { question: 'Can I upload a photo?', answer: 'Yes — use the "Upload a photo" field to attach an image. It will show as a preview before you post. Please check the photo upon submitting', open: false },
    { question: 'Can I recieve a donation?', answer: 'You can recieve a donation by going to our building at  64A Otek Street FoodBaguio building, Baguio City. Open at 8am to 7pm every weekdays.', open: false },
    { question: 'Who recieves my donation?', answer: 'When your donation is approved by the admin, an organization staff goes to the pickup location and assess food quality. These staff will contact you when they are on the way.', open: false },
    { question: 'Can I edit or delete my donation after posting?', answer: 'Currently, donors cannot edit or delete donations after posting. Please contact the admin throught the contacts page for any changes needed.', open: false }
  ]);

  donations: any[] = [];

  constructor(private firestore: Firestore) {
    const donationsCollection = collection(this.firestore, 'donations');
    collectionData(donationsCollection, { idField: 'id' })
      .subscribe(data => {
        this.donations = data;
      });
  }

  // Geocode an address string to [lat, lon] using Nominatim API
  private async geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    if (!address || address.trim() === '') return null;
    try {
      const query = encodeURIComponent(address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      const results = await response.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        console.log(`Geocoded "${address}" to [${lat}, ${lon}]`);
        return { lat: parseFloat(lat), lon: parseFloat(lon) };
      }
      console.log(`Geocoding failed: no results for "${address}"`);
      return null;
    } catch (e) {
      console.log('Geocoding error:', (e as any)?.message);
      return null;
    }
  }

  // ADD DOCUMENT
  async onSubmit() {
    const donationsCollection = collection(this.firestore, 'donations');
    // Prioritize geocoding the pickup location; geolocation is only a fallback
    let latitude: number | null = null;
    let longitude: number | null = null;

    // First, try to geocode the pickup location (most reliable since user provides it)
    const geocoded = await this.geocodeAddress(this.pickupLocation());
    if (geocoded) {
      latitude = geocoded.lat;
      longitude = geocoded.lon;
      console.log('Using geocoded pickup location:', { latitude, longitude });
    } else {
      // Geocoding failed; try geolocation as fallback
      console.log('Geocoding failed, attempting geolocation fallback');
      if (navigator.geolocation) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              (err) => {
                console.log('Geolocation failed during donation submit:', err.message);
                reject(err);
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
          });
          latitude = pos.coords?.latitude ?? null;
          longitude = pos.coords?.longitude ?? null;
          console.log('Using geolocation fallback:', { latitude, longitude });
        } catch (e) {
          // Both geocoding and geolocation failed; donation saved without coords
          console.log('Both geocoding and geolocation failed, saving donation without coordinates');
        }
      }
    }

    const donation = {
      food: this.food(),
      description: this.description(),
      quantity: this.quantity(),
      bestByDate: this.bestByDate(),
      pickupLocation: this.pickupLocation(),
      donorName: this.donorName(),
      contactInformation: this.contactInformation(),
      photoUrl: this.photoPreview(),
      isClaimed: false,
      isApproved: false,
      status: 'pending',                 
      date: new Date().toISOString()
    };

    await addDoc(donationsCollection, donation);

    // reset signals
    this.food.set('');
    this.description.set('');
    this.quantity.set(null);
    this.bestByDate.set('');
    this.pickupLocation.set('');
    this.donorName.set('');
    this.contactInformation.set('');
    this.photoPreview.set(null);

    alert('Donation submitted successfully!');
  }


  // HANDLE FILE SELECTION
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

  // Toggle FAQ item open/closed
  toggleFaq(index: number) {
    const items = this.faqItems();
    const newItems = items.map((it, i) => i === index ? { ...it, open: !it.open } : it);
    this.faqItems.set(newItems);
  }

  // DELETE DOCUMENT
  deleteDonation(id: string) {
    const donationDoc = doc(this.firestore, `donations/${id}`);
    deleteDoc(donationDoc);
  }

  // UPDATE DOCUMENT
  updateDonation(id: string, updatedData: any) {
    const donationDoc = doc(this.firestore, `donations/${id}`);
    updateDoc(donationDoc, updatedData);
  }
}
