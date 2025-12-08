import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, doc, deleteDoc, updateDoc, addDoc} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin {


  filterInput: any = '';
  clickedSearch: boolean = false;

  inputUsername: string = "";
  inputPassword: string = "";
  selectedPhotoUrl: string = '';
  isLightboxOpen: boolean = false;
  donationIdToEdit = signal<string | null>(null);

  foodEdit = signal('');
  descriptionEdit = signal('');
  quantityEdit = signal('');
  bestByDateEdit = signal<string | null>(null);
  pickupLocationEdit = signal('');
  donorNameEdit = signal('');
  contactInformationEdit = signal('');


  hasLoggedIn: boolean = false;

  username: string = "admin";
  password: string = "password";

  donations = signal<any[]>([]);
  pendingDonations: any[] = [];
  claimedDonations: any[] = [];
  availableDonations: any[] = [];
  deliveredDonations: any[] = [];

  currentFiler = signal<string>('All');
  sortOrder = signal<string>('normal');

  stats = signal({
    total: 0,
    available: 0,
    claimed: 0,
    pending: 0,
    delivered: 0
  });

  reports: any[] = [];
  showFoodReported: boolean = false;

  constructor(private firestore: Firestore) {
    const savedLoginState = sessionStorage.getItem('adminLoggedIn');
    if (savedLoginState === 'true') {
      this.hasLoggedIn = true;
    }

    const donationsCollection = collection(this.firestore, 'donations');
    collectionData(donationsCollection, { idField: 'id' })
      .subscribe((data: any[]) => {

        this.donations.set(data);

        // treat missing status as 'available'
        const total = data.length;
        const available = data.filter(d => (d.status ?? 'available') === 'available').length;
        const claimed = data.filter(d => (d.status ?? '') === 'claimed').length;
        const pending = data.filter(d => (d.status ?? '') === 'pending').length;
        const delivered = data.filter(d => (d.status ?? '') === 'delivered').length;

        this.stats.set({
          total,
          available,
          claimed,
          pending,
          delivered
        });


        this.pendingDonations = data.filter(d => (d.status ?? '') === 'pending');
        this.claimedDonations = data.filter(d => (d.status ?? '') === 'claimed');
        this.availableDonations = data.filter(d => (d.status ?? 'available') === 'available');
        this.deliveredDonations = data.filter(d => (d.status ?? '') === 'delivered');
      });


      const reportsCollection = collection(this.firestore, 'report');
      collectionData(reportsCollection, { idField: 'id' })
        .subscribe((data: any[]) => {
          this.reports = data;
        });
  }

  deleteDonation(id: string) {
    const donationDoc = doc(this.firestore, `donations/${id}`);
    deleteDoc(donationDoc);
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

  async approveDonation(donation: any){
    const id = donation.id;
    const donationDoc = doc(this.firestore, `donations/${id}`);

    // Build update payload
    const updateData: any = {
      isApproved: true,
      status: 'available'
    };

    // If coordinates are missing or invalid, try to geocode the pickupLocation
    const lat = donation.latitude != null ? Number(donation.latitude) : NaN;
    const lon = donation.longitude != null ? Number(donation.longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      try {
        const geocoded = await this.geocodeAddress(donation.pickupLocation || '');
        if (geocoded) {
          updateData.latitude = geocoded.lat;
          updateData.longitude = geocoded.lon;
          console.log('Approved donation: geocoded and saved coordinates', { id, ...updateData });
        } else {
          console.log('Approved donation: no coordinates available and geocoding returned no result', id);
        }
      } catch (e) {
        console.log('Error geocoding during approveDonation:', (e as any)?.message);
      }
    }

    await updateDoc(donationDoc, updateData);
  }

   checkLogIn(){

    if(this.inputUsername === this.username && this.inputPassword === this.password){
      this.hasLoggedIn = true;
      sessionStorage.setItem('adminLoggedIn', 'true');
      alert("Login successful!");
    }else{
      alert("Incorrect username or password. Please try again.");
    }
  }

   PhotoDonation(id:number) {
     const donation = this.donations().find(d => d.id === id);
      if (donation && donation.photoUrl) {
        this.selectedPhotoUrl = donation.photoUrl;
        this.isLightboxOpen = true;
    }
  }

  closeLightbox() {
    this.isLightboxOpen = false;
    this.selectedPhotoUrl = '';
  }

  // START EDIT
  startEditDonation(donation: any) {
    this.donationIdToEdit.set(donation.id);
    this.foodEdit.set(donation.food || '');
    this.descriptionEdit.set(donation.description || '');
    this.quantityEdit.set(donation.quantity || '');

    if (donation.bestByDate) {
      const dateObj = new Date(donation.bestByDate);
      if (!isNaN(dateObj.getTime())) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        this.bestByDateEdit.set(`${yyyy}-${mm}-${dd}`);
      } else {
        this.bestByDateEdit.set(donation.bestByDate);
      }
    } else {
      this.bestByDateEdit.set(null);
    }

    this.pickupLocationEdit.set(donation.pickupLocation || '');
    this.donorNameEdit.set(donation.donorName || '');
    this.contactInformationEdit.set(donation.contactInformation || '');
  }

  checkExpired(bestByDate: string | null){
    if (!bestByDate) return false;
    const bestBy = new Date(bestByDate);
    const today = new Date();
    return bestBy <= today;
  }

  async saveEditedDonation() {
    const id = this.donationIdToEdit();
    if (!id) return;

    const donationDoc = doc(this.firestore, `donations/${id}`);

    // Find the original donation to check if location changed
    const originalDonation = this.donations().find(d => d.id === id);
    const locationChanged = originalDonation?.pickupLocation !== this.pickupLocationEdit();

    // Prepare update object
    const updateData: any = {
      food: this.foodEdit(),
      description: this.descriptionEdit(),
      quantity: this.quantityEdit(),
      bestByDate: this.bestByDateEdit(),
      pickupLocation: this.pickupLocationEdit(),
      donorName: this.donorNameEdit(),
      contactInformation: this.contactInformationEdit()
    };

    // If location changed, geocode it and update coordinates
    if (locationChanged) {
      const geocoded = await this.geocodeAddress(this.pickupLocationEdit());
      if (geocoded) {
        updateData.latitude = geocoded.lat;
        updateData.longitude = geocoded.lon;
        console.log('Location updated with geocoded coordinates:', { latitude: geocoded.lat, longitude: geocoded.lon });
      } else {
        console.log('Could not geocode new location, keeping old coordinates');
      }
    }

    // Check if the donation became spoiled BEFORE updating, to determine if we need to set flag
    const shouldMarkSpoiled = this.checkExpired(this.bestByDateEdit()) && originalDonation?.isSpoiledReported !== true;
    
    // Add the spoiled flag to update if needed
    if (shouldMarkSpoiled) {
      updateData.isSpoiledReported = true;
    }

    // SINGLE Firestore write - this triggers subscription only once
    await updateDoc(donationDoc, updateData);

    // AFTER the donation is updated, create the report (if needed)
    if (shouldMarkSpoiled) {
      await this.createSpoiledReport(id);
    }

    // Clear the edit state
    this.donationIdToEdit.set(null);
  }

  // Create spoiled report separately to avoid multiple subscription triggers
  private async createSpoiledReport(donationId: string) {
    try {
      const donation = this.donations().find(d => d.id === donationId);
      if (!donation) return;

      const reportCollectionRef = collection(this.firestore, 'report');
      const report = {
        donationId: donationId,
        food: donation.food,
        donor: donation.donorName,
        pickupLocation: donation.pickupLocation,
        contactInformation: donation.contactInformation,
        reporterName: 'System',
        reason: 'Spoiled Donation',
        action: 'Marked as spoiled',
        isSpoiled: true,
        remarks: 'Automatically reported as spoiled due to best by date exceeded.',
        date: new Date().toISOString()
      };

      await addDoc(reportCollectionRef, report);
    } catch (e) {
      console.error('Error creating spoiled report:', (e as any)?.message);
    }
  }


  setFilter(filter: string){
    this.currentFiler.set(filter);
  }

  get filteredDonations(){
    const q = (this.filterInput || '').toString().toLowerCase();
    if (!q) return [];
    const base = this.sortedDonations;
    return base.filter(d => {
      return (
        (d.food ?? '').toString().toLowerCase().includes(q) ||
        (d.description ?? '').toString().toLowerCase().includes(q) ||
        (d.donorName ?? '').toString().toLowerCase().includes(q) ||
        (d.pickupLocation ?? '').toString().toLowerCase().includes(q) ||
        (d.contactInformation ?? '').toString().toLowerCase().includes(q) ||
        (d.bestByDate ?? '').toString().toLowerCase().includes(q) ||
        (d.recipient ?? '').toString().toLowerCase().includes(q)
      );
    });
  }

  // Sorted arrays
  get donationsNewToOld() {
    return [...this.donations()].sort((a, b) => {
      const ta = a?.date ? new Date(a.date).getTime() : 0;
      const tb = b?.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  }

  get donationsOldToNew() {
    return [...this.donations()].sort((a, b) => {
      const ta = a?.date ? new Date(a.date).getTime() : 0;
      const tb = b?.date ? new Date(b.date).getTime() : 0;
      return ta - tb;
    });
  }

  get sortedDonations() {
    const order = this.sortOrder();
    if (order === 'new-old') return this.donationsNewToOld;
    if (order === 'old-new') return this.donationsOldToNew;
    return this.donations();
  }

  clickSearch(){
    this.clickedSearch = true;
  }

  backToAll(){
    if (this.filterInput === ''){
      this.clickedSearch = false;
    }
  }

  deleteReport(id: string){
    const reportDoc = doc(this.firestore, `report/${id}`);
    deleteDoc(reportDoc);
  }

  showDonationStates: { [id: string]: boolean } = {};
  hideAllDonationShown: boolean = false;

    
    toggleDonation(id: string) {
      if (this.showDonationStates[id] === undefined) {
        this.showDonationStates[id] = true;
      } else {
        this.showDonationStates[id] = !this.showDonationStates[id];
      }
    }

    showDonation(id: string) {
      this.showDonationStates[id] = true;
    }

    hideDonation(id: string) {
      this.showDonationStates[id] = false;
    }

    isDonationShown(id: string): boolean {
      return this.showDonationStates[id] === true;
    }

    hideAllDonation(){
      this.hideAllDonationShown = true;
    }

    showAllDonation(){
      this.hideAllDonationShown = false;
    }

    async proceedDonation(id: string, reportId: string){
      const donationDoc = doc(this.firestore, `donations/${id}`);

      const today = new Date();
      const extendedDate = new Date();

      extendedDate.setDate(today.getDate() + 2);
      
      await updateDoc(donationDoc, {
        bestByDate: extendedDate.toISOString().split('T')[0],
        isSpoiledReported: false
      });

      const reportDoc = doc(this.firestore, `report/${reportId}`);
      await deleteDoc(reportDoc);

    }


  
}
