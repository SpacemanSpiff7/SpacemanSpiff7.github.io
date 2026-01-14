// Location Map Application
// Interactive map with Google Sheets and Google Drive integration

class LocationMapApp {
    constructor() {
        this.map = null;
        this.markers = [];
        this.locations = [];
        this.photos = {};
        this.infoWindow = null;
        this.isAuthenticated = false;
        
        // Configuration - Update these with your actual IDs
        this.config = {
            // Replace with your Google Sheets ID
            sheetsId: 'YOUR_GOOGLE_SHEETS_ID_HERE',
            // Replace with your Google Drive folder ID (where photos are stored)
            driveFileId: 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE',
            // Default map center (San Francisco)
            defaultCenter: { lat: 37.7749, lng: -122.4194 },
            defaultZoom: 10
        };
        
        // Google API configuration
        this.gapi = {
            clientId: 'YOUR_GOOGLE_CLIENT_ID_HERE',
            apiKey: 'YOUR_GOOGLE_API_KEY_HERE',
            discoveryDocs: [
                'https://sheets.googleapis.com/$discovery/rest?version=v4',
                'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
            ],
            scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly'
        };
        
        this.initializeApp();
    }
    
    async initializeApp() {
        console.log('Initializing Location Map App...');
        
        // Initialize Google APIs
        try {
            await this.initializeGoogleAPIs();
        } catch (error) {
            console.error('Failed to initialize Google APIs:', error);
            this.showError('Failed to initialize Google APIs. Please check your configuration.');
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize map when Google Maps API is ready
        if (typeof google !== 'undefined' && google.maps) {
            this.initializeMap();
        } else {
            // Wait for Google Maps API to load
            window.initMap = () => this.initializeMap();
        }
    }
    
    async initializeGoogleAPIs() {
        return new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                reject(new Error('Google API library not loaded'));
                return;
            }
            
            gapi.load('auth2:client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.gapi.apiKey,
                        clientId: this.gapi.clientId,
                        discoveryDocs: this.gapi.discoveryDocs,
                        scope: this.gapi.scopes
                    });
                    
                    // Check if user is already signed in
                    const authInstance = gapi.auth2.getAuthInstance();
                    this.isAuthenticated = authInstance.isSignedIn.get();
                    this.updateAuthButton();
                    
                    if (this.isAuthenticated) {
                        console.log('User already authenticated');
                        this.loadLocationData();
                    }
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
    
    initializeMap() {
        console.log('Initializing Google Map...');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }
        
        // Initialize map
        this.map = new google.maps.Map(mapElement, {
            center: this.config.defaultCenter,
            zoom: this.config.defaultZoom,
            styles: this.getMapStyles(),
            mapTypeControl: true,
            fullscreenControl: true,
            streetViewControl: true,
            zoomControl: true
        });
        
        // Initialize info window
        this.infoWindow = new google.maps.InfoWindow({
            maxWidth: 300
        });
        
        // Hide loading overlay
        this.hideLoading();
        
        console.log('Map initialized successfully');
        
        // Load data if authenticated
        if (this.isAuthenticated) {
            this.loadLocationData();
        }
    }
    
    getMapStyles() {
        // Dark theme map styles to match the site design
        return [
            {
                "elementType": "geometry",
                "stylers": [{"color": "#212121"}]
            },
            {
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#757575"}]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#212121"}]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry",
                "stylers": [{"color": "#757575"}]
            },
            {
                "featureType": "administrative.country",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#9e9e9e"}]
            },
            {
                "featureType": "administrative.land_parcel",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "administrative.locality",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#bdbdbd"}]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#757575"}]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [{"color": "#181818"}]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#616161"}]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#1b1b1b"}]
            },
            {
                "featureType": "road",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#2c2c2c"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#8a8a8a"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry",
                "stylers": [{"color": "#373737"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{"color": "#3c3c3c"}]
            },
            {
                "featureType": "road.highway.controlled_access",
                "elementType": "geometry",
                "stylers": [{"color": "#4e4e4e"}]
            },
            {
                "featureType": "road.local",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#616161"}]
            },
            {
                "featureType": "transit",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#757575"}]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{"color": "#000000"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#3d3d3d"}]
            }
        ];
    }
    
    setupEventListeners() {
        // Authentication button
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => this.handleAuth());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Filter select
        const filterSelect = document.getElementById('filter-select');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => this.handleFilter(e.target.value));
        }
        
        // Photo modal
        this.setupPhotoModal();
    }
    
    setupPhotoModal() {
        const modal = document.getElementById('photo-modal');
        const closeBtn = document.getElementById('photo-modal-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePhotoModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closePhotoModal();
                }
            });
        }
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePhotoModal();
            }
        });
    }
    
    async handleAuth() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            
            if (this.isAuthenticated) {
                // Sign out
                await authInstance.signOut();
                this.isAuthenticated = false;
                this.clearMap();
                this.updateStats(0, 0, '--');
            } else {
                // Sign in
                await authInstance.signIn();
                this.isAuthenticated = true;
                this.loadLocationData();
            }
            
            this.updateAuthButton();
        } catch (error) {
            console.error('Authentication error:', error);
            this.showError('Authentication failed. Please try again.');
        }
    }
    
    updateAuthButton() {
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.textContent = this.isAuthenticated ? 'Disconnect' : 'Connect Google Account';
            authBtn.disabled = false;
        }
    }
    
    async loadLocationData() {
        if (!this.isAuthenticated) {
            this.showError('Please connect your Google account to load location data.');
            return;
        }
        
        this.showLoading('Loading location data...');
        
        try {
            // Load data from Google Sheets
            const sheetData = await this.loadFromGoogleSheets();
            
            // Load photos from Google Drive
            const photoData = await this.loadFromGoogleDrive();
            
            // Process and display the data
            this.processLocationData(sheetData, photoData);
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load location data. Please check your Google Sheets and Drive permissions.');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadFromGoogleSheets() {
        console.log('Loading data from Google Sheets...');
        
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.sheetsId,
                range: 'A:Z', // Adjust range as needed
            });
            
            const rows = response.result.values;
            if (!rows || rows.length === 0) {
                throw new Error('No data found in spreadsheet');
            }
            
            // Assume first row contains headers
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
                });
                return obj;
            });
            
            console.log(`Loaded ${data.length} locations from Google Sheets`);
            return data;
            
        } catch (error) {
            console.error('Error loading from Google Sheets:', error);
            throw error;
        }
    }
    
    async loadFromGoogleDrive() {
        console.log('Loading photos from Google Drive...');
        
        try {
            const response = await gapi.client.drive.files.list({
                q: `'${this.config.driveFileId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/')`,
                fields: 'files(id,name,mimeType,webViewLink,thumbnailLink,webContentLink)',
                pageSize: 1000 // Adjust as needed
            });
            
            const files = response.result.files || [];
            console.log(`Found ${files.length} media files in Google Drive`);
            
            // Group files by location (assuming filename contains location identifier)
            const photosByLocation = {};
            files.forEach(file => {
                // Extract location identifier from filename
                // This assumes a naming convention like "location_id_photo.jpg"
                const locationId = this.extractLocationIdFromFilename(file.name);
                if (!photosByLocation[locationId]) {
                    photosByLocation[locationId] = [];
                }
                photosByLocation[locationId].push(file);
            });
            
            return photosByLocation;
            
        } catch (error) {
            console.error('Error loading from Google Drive:', error);
            throw error;
        }
    }
    
    extractLocationIdFromFilename(filename) {
        // Simple extraction - assumes filename like "loc123_photo1.jpg"
        // Customize this based on your naming convention
        const match = filename.match(/^([^_]+)_/);
        return match ? match[1] : 'unknown';
    }
    
    processLocationData(sheetData, photoData) {
        console.log('Processing location data...');
        
        this.locations = sheetData.filter(location => {
            // Validate required fields
            return location.latitude && location.longitude && 
                   !isNaN(parseFloat(location.latitude)) && 
                   !isNaN(parseFloat(location.longitude));
        });
        
        this.photos = photoData;
        
        // Clear existing markers
        this.clearMap();
        
        // Create markers for each location
        this.locations.forEach((location, index) => {
            this.createMarker(location, index);
        });
        
        // Update statistics
        const totalPhotos = Object.values(photoData).reduce((sum, photos) => sum + photos.length, 0);
        this.updateStats(this.locations.length, totalPhotos, new Date().toLocaleDateString());
        
        // Fit map to show all markers
        if (this.locations.length > 0) {
            this.fitMapToMarkers();
        }
        
        console.log(`Processed ${this.locations.length} locations with ${totalPhotos} photos`);
    }
    
    createMarker(location, index) {
        const position = {
            lat: parseFloat(location.latitude),
            lng: parseFloat(location.longitude)
        };
        
        // Create custom marker icon
        const marker = new google.maps.Marker({
            position: position,
            map: this.map,
            title: location.title || location.name || `Location ${index + 1}`,
            icon: {
                url: this.createMarkerIcon(location),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 40)
            },
            animation: google.maps.Animation.DROP
        });
        
        // Create info window content
        const infoContent = this.createInfoWindowContent(location);
        
        // Add click listener
        marker.addListener('click', () => {
            this.infoWindow.setContent(infoContent);
            this.infoWindow.open(this.map, marker);
        });
        
        this.markers.push({
            marker: marker,
            location: location,
            index: index
        });
    }
    
    createMarkerIcon(location) {
        // Create a data URL for a custom marker
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        // Draw marker shape
        ctx.fillStyle = '#00D4FF';
        ctx.beginPath();
        ctx.arc(20, 15, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add white center
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(20, 15, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add pointer
        ctx.fillStyle = '#00D4FF';
        ctx.beginPath();
        ctx.moveTo(20, 27);
        ctx.lineTo(15, 35);
        ctx.lineTo(25, 35);
        ctx.closePath();
        ctx.fill();
        
        return canvas.toDataURL();
    }
    
    createInfoWindowContent(location) {
        const locationId = location.id || location.location_id || 'unknown';
        const photos = this.photos[locationId] || [];
        
        let content = `
            <div class="custom-info-window">
                <div class="info-title">${location.title || location.name || 'Untitled Location'}</div>
        `;
        
        if (location.description) {
            content += `<div class="info-description">${location.description}</div>`;
        }
        
        if (photos.length > 0) {
            content += `<div class="info-photos">`;
            photos.slice(0, 4).forEach(photo => { // Limit to 4 photos in preview
                const thumbnailUrl = photo.thumbnailLink || photo.webContentLink;
                if (thumbnailUrl) {
                    content += `
                        <img src="${thumbnailUrl}" 
                             class="info-photo" 
                             alt="${photo.name}"
                             onclick="locationMapApp.openPhotoModal('${photo.webContentLink}', '${photo.name}')"
                             loading="lazy" />
                    `;
                }
            });
            if (photos.length > 4) {
                content += `<div style="font-size: 12px; color: #666; margin-top: 4px;">+${photos.length - 4} more photos</div>`;
            }
            content += `</div>`;
        }
        
        content += `</div>`;
        return content;
    }
    
    openPhotoModal(imageUrl, title) {
        const modal = document.getElementById('photo-modal');
        const modalImage = document.getElementById('photo-modal-image');
        const modalTitle = document.getElementById('photo-modal-title');
        
        if (modal && modalImage && modalTitle) {
            modalImage.src = imageUrl;
            modalImage.alt = title;
            modalTitle.textContent = title;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    closePhotoModal() {
        const modal = document.getElementById('photo-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    fitMapToMarkers() {
        if (this.markers.length === 0) return;
        
        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach(item => {
            bounds.extend(item.marker.getPosition());
        });
        
        this.map.fitBounds(bounds);
        
        // Ensure minimum zoom level
        const listener = google.maps.event.addListener(this.map, 'idle', () => {
            if (this.map.getZoom() > 15) {
                this.map.setZoom(15);
            }
            google.maps.event.removeListener(listener);
        });
    }
    
    clearMap() {
        this.markers.forEach(item => {
            item.marker.setMap(null);
        });
        this.markers = [];
        
        if (this.infoWindow) {
            this.infoWindow.close();
        }
    }
    
    handleSearch(query) {
        const lowercaseQuery = query.toLowerCase();
        
        this.markers.forEach(item => {
            const location = item.location;
            const isMatch = !query || 
                (location.title && location.title.toLowerCase().includes(lowercaseQuery)) ||
                (location.name && location.name.toLowerCase().includes(lowercaseQuery)) ||
                (location.description && location.description.toLowerCase().includes(lowercaseQuery));
            
            item.marker.setVisible(isMatch);
        });
    }
    
    handleFilter(filterType) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        this.markers.forEach(item => {
            const location = item.location;
            let isVisible = true;
            
            switch (filterType) {
                case 'recent':
                    // Filter by submission date if available
                    if (location.date_submitted || location.timestamp) {
                        const submissionDate = new Date(location.date_submitted || location.timestamp);
                        isVisible = submissionDate > thirtyDaysAgo;
                    }
                    break;
                    
                case 'with-photos':
                    // Filter locations that have photos
                    const locationId = location.id || location.location_id || 'unknown';
                    const photos = this.photos[locationId] || [];
                    isVisible = photos.length > 0;
                    break;
                    
                case 'all':
                default:
                    isVisible = true;
                    break;
            }
            
            item.marker.setVisible(isVisible);
        });
    }
    
    refreshData() {
        if (!this.isAuthenticated) {
            this.showError('Please connect your Google account first.');
            return;
        }
        
        this.loadLocationData();
    }
    
    updateStats(locations, photos, lastUpdated) {
        const totalLocationsEl = document.getElementById('total-locations');
        const totalPhotosEl = document.getElementById('total-photos');
        const lastUpdatedEl = document.getElementById('last-updated');
        
        if (totalLocationsEl) totalLocationsEl.textContent = locations;
        if (totalPhotosEl) totalPhotosEl.textContent = photos;
        if (lastUpdatedEl) lastUpdatedEl.textContent = lastUpdated;
    }
    
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay?.querySelector('.loading-text');
        
        if (overlay) {
            overlay.style.display = 'flex';
            if (text) text.textContent = message;
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 10000);
        }
    }
}

// Initialize the application when the page loads
let locationMapApp;

document.addEventListener('DOMContentLoaded', () => {
    locationMapApp = new LocationMapApp();
    
    // Navigation functionality
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                navToggle.setAttribute('aria-expanded', 'false');
                navLinks.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navToggle.setAttribute('aria-expanded', 'false');
                navLinks.classList.remove('active');
            }
        });
    }
});

// Global function for Google Maps callback
function initMap() {
    if (locationMapApp) {
        locationMapApp.initializeMap();
    }
}

// Export for global access
window.locationMapApp = locationMapApp;
