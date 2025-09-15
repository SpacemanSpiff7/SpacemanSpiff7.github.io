# Public Art Submission Page

A mobile-optimized public art submission page that integrates with Google Forms, specifically designed for iOS Safari browsers.

## Features

- **Location Capture**: Automatic geolocation with fallback to manual address entry
- **Camera Integration**: Take photos directly or choose from library
- **Mobile Optimized**: Designed specifically for iOS Safari with touch-friendly interface
- **Google Forms Integration**: Direct submission to Google Forms
- **Tags Selection**: Multiple choice checkboxes with predefined options
- **Custom Tags**: Users can enter custom tags when "Other" is selected (30 character limit)
- **Image Compression**: Client-side image compression for optimal upload performance
- **Error Handling**: Comprehensive error handling and user feedback

## Setup Instructions

### 1. Google Form Field ID Configuration

Before using the submission page, you need to identify the correct field IDs from your Google Form:

#### Method 1: Use the Field ID Finder (Recommended)
1. Open `find-field-ids.html` in your browser
2. Follow the step-by-step instructions to find field IDs
3. Use the browser developer tools to locate the entry field names

#### Method 2: Console Script Method
1. Open the Google Form: https://docs.google.com/forms/d/1_L6W_633GYs2vXTbNQBGhrOmm9GQtk3BLOYnTdv0F4A/preview
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Copy and paste the contents of `console-field-finder.js` into the console
5. Press Enter to run the script
6. Look for the field IDs in the output

#### Method 3: Manual Inspection
1. Open the Google Form in edit mode
2. Right-click on each field and select "Inspect Element"
3. Look for the `name` attribute in the HTML, which will be `entry.XXXXXXXXX`
4. Note down the field IDs for each field type

### 2. Update Field IDs

Once you have the correct field IDs, update them in `public-art-submission.html`:

```javascript
this.fieldIds = {
    location: 'entry.ACTUAL_LOCATION_FIELD_ID',     // Location field (required)
    description: 'entry.ACTUAL_DESCRIPTION_FIELD_ID',  // Description and Notes field
    tags: 'entry.ACTUAL_TAGS_FIELD_ID',         // Tags multiple choice field
    picture: 'entry.ACTUAL_PICTURE_FIELD_ID'       // Picture file upload field
};
```

### 3. Google Form Configuration

Your Google Form should have the following fields (which it already does):
- **Location** (required): Short answer text field
- **Description and Notes**: Paragraph text field
- **Tags**: Multiple choice with options: Mural, Graffiti, Sculpture, Mosaic, Other
- **Picture**: File upload field (up to 5 files, max 100MB each)

## Technical Details

### iOS Safari Optimizations

- **Viewport Meta Tag**: Prevents zoom on input focus
- **Touch Targets**: Minimum 44px touch targets for all interactive elements
- **Camera Access**: Uses `capture="environment"` for rear camera
- **File Handling**: Optimized for mobile file selection
- **Performance**: Client-side image compression

### Browser Compatibility

- **iOS Safari**: 12+ (fully optimized)
- **Chrome Mobile**: Full support
- **Firefox Mobile**: Full support
- **Desktop Browsers**: Functional but not optimized

### File Size Limits

- **Client-side**: Images compressed to under 10MB
- **Google Forms**: Subject to Google's file size limits
- **Recommended**: Keep images under 5MB for best performance

## Usage

### For Users
1. Open the page on a mobile device
2. Allow location and camera permissions when prompted
3. Fill out the required fields (marked with *)
4. Take or select a photo
5. Submit the form

### For Developers
1. Update the Google Form URL in the code
2. Update the field IDs as described above
3. Test the form submission
4. Customize styling if needed

## Troubleshooting

### Common Issues

**Location not working:**
- Ensure HTTPS is enabled
- Check browser permissions
- Use manual address entry as fallback

**Camera not working:**
- Check browser permissions
- Ensure device has camera
- Try photo library option

**Form submission fails:**
- Verify field IDs are correct
- Check Google Form is accepting responses
- Ensure all required fields are filled

**Images too large:**
- The page automatically compresses images
- For very large images, compression may take time
- Consider reducing image quality before taking photos

### Debug Mode

To enable debug logging, add this to the browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## File Structure

```
public-art-submission.html          # Main submission page
find-field-ids.html                # Field ID finder tool
console-field-finder.js            # Console script for finding field IDs
field-id-inspector.html            # Field ID testing tool
PUBLIC_ART_SUBMISSION_README.md    # This documentation
```

## Security Considerations

- **HTTPS Required**: Geolocation API requires secure context
- **File Validation**: Client-side file type and size validation
- **Input Sanitization**: Basic input validation and sanitization
- **No Local Storage**: Sensitive data not stored locally
- **Privacy**: Clear messaging about data usage

## Performance Targets

- **Initial Load**: <2 seconds on 3G
- **Camera Ready**: <1 second after permission granted
- **Location Acquired**: <5 seconds with GPS
- **Image Compression**: <2 seconds for typical photos
- **Form Submission**: <3 seconds on good connection

## Support

For technical issues or questions:
1. Check the troubleshooting section above
2. Verify Google Form field IDs are correct
3. Test on different devices and browsers
4. Check browser console for error messages

## License

This code is part of the Simone Longo portfolio website and follows the same licensing terms.
