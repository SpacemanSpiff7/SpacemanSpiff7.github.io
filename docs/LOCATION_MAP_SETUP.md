# Location Map Setup Guide

This guide will help you configure the Location Map feature to display user-submitted locations from Google Sheets with photos from Google Drive.

## Overview

The Location Map feature provides:
- Interactive Google Maps display
- Integration with Google Sheets for location data
- Integration with Google Drive for photo storage
- Responsive design that matches your site's theme
- Search and filtering capabilities
- Photo gallery with lightbox functionality

## Setup Steps

### 1. Google Cloud Platform Setup

1. **Create a Google Cloud Project** (if you don't have one):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Required APIs**:
   - Go to "APIs & Services" > "Library"
   - Enable the following APIs:
     - Google Maps JavaScript API
     - Google Sheets API
     - Google Drive API

3. **Create Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Create an API key for Google Maps
   - Create OAuth 2.0 credentials for Sheets and Drive access

### 2. Google Maps API Configuration

1. **Get your Maps API Key**:
   - In Google Cloud Console, go to "APIs & Services" > "Credentials"
   - Copy your API key

2. **Configure API Key Restrictions** (Recommended):
   - Set HTTP referrers to your domain
   - Restrict to Google Maps JavaScript API

3. **Update the HTML file**:
   ```html
   <!-- Replace YOUR_API_KEY with your actual API key -->
   <script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry,places&callback=initMap"></script>
   ```

### 3. Google Sheets Setup

1. **Create your Google Sheet**:
   - Create a new Google Sheet
   - Set up columns for your location data (see example below)
   - Note the Sheet ID from the URL

2. **Example Sheet Structure**:
   ```
   | id | title | description | latitude | longitude | date_submitted |
   |----|-------|-------------|----------|-----------|----------------|
   | loc1 | Central Park | Beautiful park in NYC | 40.7829 | -73.9654 | 2024-01-15 |
   | loc2 | Golden Gate | Iconic bridge | 37.8199 | -122.4783 | 2024-01-16 |
   ```

3. **Required Columns**:
   - `id` or `location_id`: Unique identifier
   - `latitude`: Decimal latitude
   - `longitude`: Decimal longitude
   - `title` or `name`: Location name
   - `description`: Optional description
   - `date_submitted`: Optional submission date

### 4. Google Drive Setup

1. **Create a folder for photos**:
   - Create a dedicated folder in Google Drive
   - Note the folder ID from the URL

2. **Photo naming convention**:
   - Name photos with the location ID as prefix: `loc1_photo1.jpg`
   - This links photos to locations in the sheet

3. **Set folder permissions**:
   - Make sure you have read access to the folder
   - Photos should be accessible via the Drive API

### 5. Configure the Application

1. **Update `location-map.js`**:
   ```javascript
   this.config = {
       sheetsId: 'YOUR_GOOGLE_SHEETS_ID_HERE',
       driveFileId: 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE',
       defaultCenter: { lat: 37.7749, lng: -122.4194 }, // Your preferred center
       defaultZoom: 10
   };

   this.gapi = {
       clientId: 'YOUR_GOOGLE_CLIENT_ID_HERE',
       apiKey: 'YOUR_GOOGLE_API_KEY_HERE',
       // ... rest of config
   };
   ```

2. **Get your Google Sheets ID**:
   - From your sheet URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the SHEET_ID part

3. **Get your Google Drive Folder ID**:
   - From your folder URL: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Copy the FOLDER_ID part

### 6. OAuth 2.0 Setup

1. **Configure OAuth consent screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Fill in required information
   - Add your domain to authorized domains

2. **Create OAuth 2.0 Client ID**:
   - Go to "APIs & Services" > "Credentials"
   - Create OAuth 2.0 Client ID
   - Add your domain to authorized JavaScript origins

3. **Update scopes** (if needed):
   - The app requests read-only access to Sheets and Drive
   - Scopes are defined in the JavaScript file

### 7. Testing

1. **Test locally**:
   - Serve the files from a local web server
   - OAuth won't work with `file://` protocol

2. **Test authentication**:
   - Click "Connect Google Account"
   - Grant necessary permissions

3. **Verify data loading**:
   - Check browser console for errors
   - Ensure locations appear on the map

## Data Format Examples

### Google Sheets Structure
```
id,title,description,latitude,longitude,date_submitted,category
loc1,Central Park,Beautiful urban park,40.7829,-73.9654,2024-01-15,park
loc2,Times Square,Busy commercial intersection,40.7580,-73.9855,2024-01-16,landmark
loc3,Brooklyn Bridge,Historic suspension bridge,40.7061,-73.9969,2024-01-17,bridge
```

### Photo Naming Convention
```
loc1_main.jpg          // Main photo for location loc1
loc1_detail1.jpg       // Additional photos
loc1_detail2.jpg
loc2_sunrise.jpg       // Photos for location loc2
loc2_crowd.jpg
```

## Customization Options

### Map Styling
- The map uses a dark theme to match your site
- Modify `getMapStyles()` in `location-map.js` to change appearance

### Marker Icons
- Custom markers are generated using HTML5 Canvas
- Modify `createMarkerIcon()` to change marker appearance

### Info Window Content
- Customize `createInfoWindowContent()` to change popup content
- Add additional location fields as needed

### Search and Filtering
- Current filters: All, Recent (30 days), With Photos
- Add custom filters in `handleFilter()` method

## Troubleshooting

### Common Issues

1. **"Failed to initialize Google APIs"**:
   - Check API key and client ID
   - Ensure APIs are enabled in Google Cloud Console

2. **"Authentication failed"**:
   - Verify OAuth 2.0 configuration
   - Check authorized domains

3. **"No data found in spreadsheet"**:
   - Verify sheet ID
   - Check sheet permissions
   - Ensure first row contains headers

4. **Map not loading**:
   - Check Maps API key
   - Verify API restrictions
   - Check browser console for errors

5. **Photos not loading**:
   - Verify Drive folder ID
   - Check photo naming convention
   - Ensure Drive API is enabled

### Debug Mode
Add this to the browser console to enable detailed logging:
```javascript
localStorage.setItem('DEBUG_LOCATION_MAP', 'true');
```

## Security Considerations

1. **API Key Restrictions**:
   - Always restrict API keys to your domain
   - Use HTTP referrer restrictions for client-side keys

2. **OAuth Scopes**:
   - Use minimal required scopes (read-only)
   - Review permissions before granting access

3. **Data Privacy**:
   - Ensure compliance with privacy laws
   - Consider user consent for location data

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all configuration steps
3. Test with sample data first
4. Check Google Cloud Console for API usage and errors

## File Structure

```
├── location-map.html          # Main map page
├── location-map.js           # JavaScript functionality
├── style.css                # Existing styles (used by map page)
├── components/nav.html       # Updated navigation
└── LOCATION_MAP_SETUP.md    # This setup guide
```
