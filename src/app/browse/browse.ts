import { Component, OnInit, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, doc, deleteDoc, updateDoc, addDoc } from '@angular/fire/firestore';
import { query, where, getDocs } from 'firebase/firestore';
declare const L: any;

// Inject Leaflet CSS into the document head
const leafletCSS = document.createElement('link');
leafletCSS.rel = 'stylesheet';
leafletCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
document.head.appendChild(leafletCSS);

// Fix the default icon path issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './browse.html',
  styleUrls: ['./browse.css']
})
export class Browse implements OnInit {

  sortOrder = signal<string>('best-by-date');
  filterInput: any = '';
  clickedSearch: boolean = false;
  private mymap: any = null;
  private donationMarkers: Record<string, any> = {};

  ngOnInit() {
    // keep ngOnInit minimal; map will be initialized in ngAfterViewInit
  }

  ngAfterViewInit() {
    // Initialize map once the view is ready and the #map container exists
    if (this.isEmployee() || this.isAdmin()) {
      // default Baguio location
      this.initializeMap([16.4023, 120.5960]);
      // give leaflet a tick to render tiles and container sizing
      setTimeout(() => {
        try { this.mymap.invalidateSize(); } catch (e) {}
      }, 250);
    }
  }

  // Initialize the Leaflet map given [lat, lon]
  initializeMap(latLong: number[]) {
    try {
      // If we already created a map for this component instance, reuse it and move the view/marker.
      if (this.mymap) {
        this.mymap.setView(latLong, 13);
        return;
      }

      this.mymap = L.map('map').setView(latLong, 13);

      L.tileLayer(
        'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGV2ZWxvcGVyaWFuIiwiYSI6ImNtaXU2OHY2dTB6cWIzZm9udHRoaXI2dDEifQ.21ORe8yQEFAv9BYXr7_pyw',
        {
          attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          maxZoom: 18,
          id: 'mapbox/streets-v11',
          tileSize: 512,
          zoomOffset: -1,
          accessToken: 'your.mapbox.access.token',
        }
      ).addTo(this.mymap);

      // Do not add a persistent user-location marker here — markers will represent approved donations only.
    } catch (e) {
      // If map initialization fails, do not log geolocation errors here
    }
  }

  // Add/update/remove donation markers on the map
  updateDonationMarkers(donations: any[]) {
    if (!this.mymap) return;

    const seen = new Set<string>();
    for (const d of donations) {
      const id = d.id;
      // If the donation has been delivered, ensure any existing marker is removed and skip it
      if (d.status === 'delivered') {
        if (this.donationMarkers[id]) {
          try { this.mymap.removeLayer(this.donationMarkers[id]); } catch (e) {}
          delete this.donationMarkers[id];
        }
        continue;
      }
      // Determine approval state (accept boolean true, string 'true', or status 'available')
      const approved = d.isApproved === true || d.isApproved === 'true' || d.status === 'available';
      // Coerce coordinates to numbers (FireStore may return them as strings)
      const lat = d.latitude != null ? Number(d.latitude) : NaN;
      const lon = d.longitude != null ? Number(d.longitude) : NaN;
      if (!approved) continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      seen.add(id);
      const latlng = [lat, lon];

      if (this.donationMarkers[id]) {
        try { this.donationMarkers[id].setLatLng(latlng); } catch (e) {}
        try { this.donationMarkers[id].setPopupContent(`<strong>${d.food}</strong><br>${d.pickupLocation || ''}`); } catch (e) {}
      } else {
        try {
          const m = L.marker(latlng).addTo(this.mymap);
          m.bindPopup(`<strong>${d.food}</strong><br>${d.pickupLocation || ''}`);
          this.donationMarkers[id] = m;
        } catch (e) {
          // ignore marker creation errors
        }
      }
    }

    // remove markers for donations that no longer exist
    for (const id of Object.keys(this.donationMarkers)) {
      if (!seen.has(id)) {
        try {
          this.mymap.removeLayer(this.donationMarkers[id]);
        } catch (e) {}
        delete this.donationMarkers[id];
      }
    }
  }

  donations: any[] = []
  donationIdToEdit = signal<string | null>(null);

  // Edit fields (same as before)
  foodEdit = signal('');
  descriptionEdit = signal('');
  quantityEdit = signal('');
  bestByDateEdit = signal<string | null>(null);
  pickupLocationEdit = signal('');
  donorNameEdit = signal('');
  contactInformationEdit = signal('');

  // Claim fields
  claimId = signal<string | null>(null);
  recipientName = signal('');

  constructor(private firestore: Firestore) {
    const donationsCollection = collection(this.firestore, 'donations');
    collectionData(donationsCollection, { idField: 'id' })
      .subscribe(data => {
        this.donations = data;
        if (this.mymap) {
          this.updateDonationMarkers(data);
        }
        this.addSpoliedToReports();
      });

      
  }

  // role helpers for template
  isEmployee() {
    return sessionStorage.getItem('role') === 'employee';
  }

  isAdmin() {
    return sessionStorage.getItem('role') === 'admin';
  }

  // DELETE 
  deleteDonation(id: string) {
    const donationDoc = doc(this.firestore, `donations/${id}`);
    deleteDoc(donationDoc);
  }

  // BEGIN CLAIM PROCESS
  startClaim(id: string) {
    this.claimId.set(id);
    this.recipientName.set('');
  }

  // Get the current donation being claimed (for lightbox display)
  currentClaimDonation() {
    const id = this.claimId();
    if (!id) return null;
    return this.donations.find(d => d.id === id);
  }

  // COMPLETE CLAIM PROCESS
  async confirmClaim(donation: any) {
    const id = this.claimId();
    if (!id) return;

    const donationDoc = doc(this.firestore, `donations/${id}`);

    await updateDoc(donationDoc, {
      status: 'claimed',
      recipient: this.recipientName(),
      isClaimed: true
    });

    // Keep markers visible for claimed donations; map will update via subscription.
    this.claimId.set(null);
    this.recipientName.set('');
  }


  approvedDonationsList() {    
    const donation = this.donations.filter(d => d.isApproved === true && d.status !== 'delivered' && this.checkExpired(d.bestByDate)!==true);
    return donation;
  }

  // Return approved donations sorted according to sortOrder
  get sortedApprovedDonations() {
    const approved = this.approvedDonationsList();
    const order = this.sortOrder();
    if (order === 'new-old') {
      return [...approved].sort((a, b) => {
        const ta = a?.date ? new Date(a.date).getTime() : 0;
        const tb = b?.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });
    }
    if (order === 'old-new') {
      return [...approved].sort((a, b) => {
        const ta = a?.date ? new Date(a.date).getTime() : 0;
        const tb = b?.date ? new Date(b.date).getTime() : 0;
        return ta - tb;
      });
    }
    if (order === 'best-by-date') {
      return [...approved].sort((a, b) => {
        const today = new Date();
        // Parse best by dates
        const dateA = a?.bestByDate ? new Date(a.bestByDate).getTime() : Infinity;
        const dateB = b?.bestByDate ? new Date(b.bestByDate).getTime() : Infinity;
        // Calculate days until expiration
        const daysUntilA = (dateA - today.getTime()) / (1000 * 60 * 60 * 24);
        const daysUntilB = (dateB - today.getTime()) / (1000 * 60 * 60 * 24);
        // Sort by days until expiration (ascending: soonest first)
        return daysUntilA - daysUntilB;
      });
    }

    if (order === 'Nearly-Expired'){
      return this.NearlyExpiredDonations;
    }
    return approved;
  }


  checkNearlyExpired(bestByDate: string | null){
    if (!bestByDate) return false;
    const bestBy = new Date(bestByDate);
    const today = new Date();
    // Reset time to midnight for accurate day calculation
    today.setHours(0, 0, 0, 0);
    bestBy.setHours(0, 0, 0, 0);
    const diffTime = bestBy.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 3;
  }

  checkExpired(bestByDate: string | null){
    if (!bestByDate) return false;
    const bestBy = new Date(bestByDate);
    const today = new Date();
    return bestBy <= today;
  }



  get filteredDonations(){
    const q = (this.filterInput || '').toString().toLowerCase();
    if (!q) return [];
    const base = this.sortedDonations;
    return base.filter(d => {
      return (
        (d.food ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed' ||
        (d.description ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed'||
        (d.donorName ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed' ||
        (d.pickupLocation ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed' ||
        (d.contactInformation ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed' ||
        (d.bestByDate ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed' ||
        (d.recipient ?? '').toString().toLowerCase().includes(q) && d.status !=='claimed'
      );
    });
  }

  // Sorted arrays
  get donationsNewToOld() {
    return [...this.donations].sort((a, b) => {
      const ta = a?.date ? new Date(a.date).getTime() : 0;
      const tb = b?.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  }

  get donationsOldToNew() {
    return [...this.donations].sort((a, b) => {
      const ta = a?.date ? new Date(a.date).getTime() : 0;
      const tb = b?.date ? new Date(b.date).getTime() : 0;
      return ta - tb;
    });
  }

  get sortedDonations() {
    const order = this.sortOrder();
    if (order === 'new-old') return this.donationsNewToOld;
    if (order === 'old-new') return this.donationsOldToNew;
    if (order === 'best-by-date') {
      return [...this.donations].sort((a, b) => {
        const today = new Date();
        const dateA = a?.bestByDate ? new Date(a.bestByDate).getTime() : Infinity;
        const dateB = b?.bestByDate ? new Date(b.bestByDate).getTime() : Infinity;
        const daysUntilA = (dateA - today.getTime()) / (1000 * 60 * 60 * 24);
        const daysUntilB = (dateB - today.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilA - daysUntilB;
      });
    }

    if (order === 'Near'){
      return this.NearlyExpiredDonations;
    }

    return this.donations;
  }

  get NearlyExpiredDonations(){
    // Return all donations (including claimed) that are nearly expired
    return this.donations.filter(d => this.checkNearlyExpired(d.bestByDate) === true);
  }

  clickSearch(){
    this.clickedSearch = true;
  }

  backToAll(){
    if (this.filterInput === ''){
      this.clickedSearch = false;
    }
  }

  reporterName = signal('');
  reason = signal('');
  action = signal('');
  remarks = signal<string | null>(null);

  async addReport(donation: any){
    const reportCollection = collection(this.firestore, 'report');
    const report = {
      donationId: donation.id,
      food: donation.food,
      donor: donation.donorName,
      pickupLocation: donation.pickupLocation,
      contactInformation: donation.contactInformation,
      reporterName: this.reporterName(),
      reason: this.reason(),
      action: this.action(),
      remarks: this.remarks(),
      date: new Date().toISOString()
    };

    await addDoc(reportCollection, report);

    this.reporterName.set('');
    this.reason.set('');
    this.action.set('');
    this.remarks.set(null);

    alert('Report submitted successfully!')

  }


  startReport(id: string) {
    this.donationIdToEdit.set(id);
  }

  currentReportDonation() {
    const id = this.donationIdToEdit();
    if (!id) return null;
    return this.donations.find(d => d.id === id);
  }

  deliveryId = signal<string | null>(null);
  
  async confirmDelivery(){
    const id = this.deliveryId();
    if (!id) return;

    const donationDoc = doc(this.firestore, `donations/${id}`);

    await updateDoc(donationDoc, {
      status: 'delivered',
      isClaimed: true
    });

    
  }

  startDelivery(id: string) {
    this.deliveryId.set(id);
  }

  recipientNameConfirm = signal('');

  checkRecipientNameMatch(id: string | null){
    if (!id) return;
    const donation = this.donations.find(d => d.id === this.deliveryId())

      const check = donation.recipient === this.recipientNameConfirm();

      if(check){
        alert('Donation successfully marked as delivered!');
        this.confirmDelivery();
        this.deliveryId.set(null);
      }else{
        alert('Recipient name does not match. Please try again.');
      }
  }

  addSpoliedToReports(){
    const processed = new Set<string>();
    this.donations.forEach(async (donation) => {
      if (this.checkExpired(donation.bestByDate) && donation.status !== 'delivered') {
        const id = donation.id;
        // Skip if already reported or if in current batch
        if (processed.has(id) || donation.isSpoiledReported === true) return;

        processed.add(id);

        try {
          const reportCollectionRef = collection(this.firestore, 'report');
          const report = {
            donationId: id,
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
          // mark donation so we don't report it again
          await updateDoc(doc(this.firestore, `donations/${id}`), { isSpoiledReported: true });
        } catch (e) {
          console.error('Error adding spoiled report for', id, ':', (e as any)?.message);
        }
      }
    });
  }





  


}



