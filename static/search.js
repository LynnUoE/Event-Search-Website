// ============================================
// Geohash Implementation (Self-contained)
// ============================================
const Geohash = {
    base32: '0123456789bcdefghjkmnpqrstuvwxyz',
    
    encode: function(latitude, longitude, precision = 7) {
        let idx = 0;
        let bit = 0;
        let evenBit = true;
        let geohash = '';
        
        let latMin = -90, latMax = 90;
        let lonMin = -180, lonMax = 180;
        
        while (geohash.length < precision) {
            if (evenBit) {
                // Process longitude
                const lonMid = (lonMin + lonMax) / 2;
                if (longitude > lonMid) {
                    idx = (idx << 1) + 1;
                    lonMin = lonMid;
                } else {
                    idx = idx << 1;
                    lonMax = lonMid;
                }
            } else {
                // Process latitude
                const latMid = (latMin + latMax) / 2;
                if (latitude > latMid) {
                    idx = (idx << 1) + 1;
                    latMin = latMid;
                } else {
                    idx = idx << 1;
                    latMax = latMid;
                }
            }
            evenBit = !evenBit;
            
            if (++bit === 5) {
                geohash += this.base32[idx];
                bit = 0;
                idx = 0;
            }
        }
        
        return geohash;
    }
};

// ============================================
// Global Variables
// ============================================
let currentEvents = [];
let sortOrder = { name: 0, genre: 0, venue: 0 };

// ============================================
// Form Value Persistence Functions
// ============================================
function saveFormValues() {
    /**
     * Save current form values to preserve them after search
     * Returns: Object containing all form field values
     */
    const formData = {
        keyword: document.getElementById('keyword').value,
        distance: document.getElementById('distance').value,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        autoDetect: document.getElementById('autoDetect').checked
    };
    return formData;
}

function restoreFormValues(formData) {
    /**
     * Restore form values after search completion
     * Parameters:
     * - formData: Object containing form field values
     * ENHANCED: Added null checks and explicit visibility control
     */
    if (formData) {
        // Restore each field with verification
        const keywordInput = document.getElementById('keyword');
        if (keywordInput) keywordInput.value = formData.keyword || '';
        
        const distanceInput = document.getElementById('distance');
        if (distanceInput) distanceInput.value = formData.distance || '';
        
        const categorySelect = document.getElementById('category');
        if (categorySelect) categorySelect.value = formData.category || 'Default';
        
        const locationInput = document.getElementById('location');
        if (locationInput) locationInput.value = formData.location || '';
        
        const autoDetectCheckbox = document.getElementById('autoDetect');
        if (autoDetectCheckbox && locationInput) {
            autoDetectCheckbox.checked = formData.autoDetect || false;
            
            // Manually trigger the visibility logic for location field
            if (formData.autoDetect) {
                locationInput.style.display = 'none';
                locationInput.removeAttribute('required');
            } else {
                locationInput.style.display = 'block';
                locationInput.setAttribute('required', 'required');
            }
        }
        
        console.log('Form values restored:', formData);
    }
}

// ============================================
// Auto-detect Location Toggle
// ============================================
document.getElementById('autoDetect').addEventListener('change', function() {
    /**
     * Toggle location input visibility based on auto-detect checkbox
     * When checked: hide location input
     * When unchecked: show location input
     */
    const locationInput = document.getElementById('location');
    if (this.checked) {
        locationInput.style.display = 'none';
        locationInput.removeAttribute('required');
    } else {
        locationInput.style.display = 'block';
        locationInput.setAttribute('required', 'required');
    }
});

// ============================================
// Get User Location (IPInfo API)
// ============================================
async function getUserLocation() {
    /**
     * Get user's location using IPInfo API
     * Returns: String in format "latitude,longitude"
     * Throws: Error if API call fails
     */
    try {
        const response = await fetch('https://ipinfo.io/?token=bf8f570fb8f455');
        const data = await response.json();
        console.log('User location from IPInfo:', data.loc);
        return data.loc;
    } catch (error) {
        console.error('Error getting user location:', error);
        throw error;
    }
}

// ============================================
// Geocoding (Google Maps API)
// ============================================
async function geocodeAddress(address) {
    /**
     * Convert address to coordinates using Google Maps Geocoding API
     * Parameters:
     * - address: String address to geocode
     * Returns: Object with lat and lng properties
     * Throws: Error if geocoding fails
     */
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyBLI3A7HJUJ4jTPEPuESWCppDVdyYYMSGY`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            console.log('Geocoded location:', data.results[0].geometry.location);
            return data.results[0].geometry.location;
        } else {
            throw new Error('No results found for address');
        }
    } catch (error) {
        console.error('Error geocoding address:', error);
        throw error;
    }
}

// ============================================
// Convert to Geohash
// ============================================
function encodeGeohash(lat, lng) {
    /**
     * Encode latitude and longitude to geohash
     * Parameters:
     * - lat: Latitude (number)
     * - lng: Longitude (number)
     * Returns: 7-character geohash string
     */
    const geohash = Geohash.encode(lat, lng, 7);
    console.log(`Geohash for (${lat}, ${lng}):`, geohash);
    return geohash;
}

// ============================================
// Search Form Submission
// ============================================
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    /**
     * Handle search form submission
     * - Prevents default form submission
     * - Gets location (auto-detect or manual)
     * - Converts location to geohash
     * - Calls backend API to search events
     * - Displays results
     * - Preserves form values after search
     * FIXED: Enhanced form value persistence using requestAnimationFrame
     */
    e.preventDefault();
    
    console.log('=== Search Started ===');
    
    // Save form values before search
    const formData = saveFormValues();
    
    const keyword = document.getElementById('keyword').value;
    const distance = document.getElementById('distance').value || 10;
    const category = document.getElementById('category').value;
    
    console.log('Search params:', { keyword, distance, category });
    
    try {
        let lat, lng;
        
        // Get location based on auto-detect checkbox
        if (document.getElementById('autoDetect').checked) {
            console.log('Using auto-detect location...');
            const loc = await getUserLocation();
            [lat, lng] = loc.split(',');
        } else {
            const location = document.getElementById('location').value;
            console.log('Geocoding location:', location);
            const coords = await geocodeAddress(location);
            lat = coords.lat;
            lng = coords.lng;
        }
        
        // Convert coordinates to geohash
        const geohash = encodeGeohash(parseFloat(lat), parseFloat(lng));
        
        // Build API URL and make request
        const url = `/api/search?keyword=${encodeURIComponent(keyword)}&distance=${distance}&category=${category}&geohash=${geohash}`;
        console.log('API URL:', url);
        
        const response = await fetch(url);
        const events = await response.json();
        
        console.log('Found events:', events.length);
        
        // Store and display results
        currentEvents = events;
        displayResults(events);
        
        // FIXED: Use double requestAnimationFrame to ensure DOM is fully updated
        // This prevents race conditions and ensures form values are maintained correctly
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                restoreFormValues(formData);
                console.log('Form values restored successfully');
            });
        });
        
    } catch (error) {
        console.error('Search error:', error);
        alert('Error performing search: ' + error.message);
        // Restore form values even if error occurs
        requestAnimationFrame(() => {
            restoreFormValues(formData);
        });
    }
});

// ============================================
// Display Results Table
// ============================================
function displayResults(events) {
    /**
     * Display search results in table format
     * Parameters:
     * - events: Array of event objects
     * Shows "No records found" if array is empty
     */
    const resultsContainer = document.getElementById('resultsContainer');
    const tbody = document.querySelector('#resultsTable tbody');
    const noResults = document.getElementById('noResults');
    
    // Clear existing results
    tbody.innerHTML = '';
    
    // Handle empty results
    if (events.length === 0) {
        resultsContainer.style.display = 'block';
        document.getElementById('resultsTable').style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    // Show table and hide "no results" message
    resultsContainer.style.display = 'block';
    document.getElementById('resultsTable').style.display = 'table';
    noResults.style.display = 'none';
    
    // Populate table rows
    events.forEach(event => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${event.date}</td>
            <td><img src="${event.icon}" width="50" height="50" alt="Event icon"></td>
            <td><a href="#" onclick="showDetails('${event.id}'); return false;">${event.name}</a></td>
            <td>${event.genre}</td>
            <td>${event.venue}</td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================
// Table Sorting
// ============================================
document.querySelectorAll('.sortable').forEach(header => {
    /**
     * Add click event listeners to sortable table headers
     * Toggles between ascending and descending sort
     */
    header.addEventListener('click', function() {
        const column = this.dataset.column;
        sortTable(column);
    });
});

function sortTable(column) {
    /**
     * Sort table by specified column
     * Parameters:
     * - column: Column name to sort by ('name', 'genre', or 'venue')
     * Toggles between ascending (1) and descending (-1) order
     */
    // Toggle sort order: 0 -> 1 (ascending) -> -1 (descending) -> 1 ...
    sortOrder[column] = sortOrder[column] === 1 ? -1 : 1;
    
    // Reset other columns to unsorted
    for (let key in sortOrder) {
        if (key !== column) sortOrder[key] = 0;
    }
    
    // Sort events array
    currentEvents.sort((a, b) => {
        let valA = a[column].toLowerCase();
        let valB = b[column].toLowerCase();
        
        if (valA < valB) return -1 * sortOrder[column];
        if (valA > valB) return 1 * sortOrder[column];
        return 0;
    });
    
    // Redisplay sorted results
    displayResults(currentEvents);
}

// ============================================
// Show Event Details - COMPLETE VERSION
// ============================================
async function showDetails(eventId) {
    /**
     * Fetch and display detailed information for a specific event
     * COMPLETE FIX: Properly hides all N/A fields per assignment requirements
     * 
     * Requirements from description:
     * "If the returned JSON stream doesn't contain certain fields, 
     *  those fields will not appear on the detail page."
     */
    try {
        console.log('Fetching details for event:', eventId);
        
        const response = await fetch(`/api/event/${eventId}`);
        const details = await response.json();
        
        console.log('Event details:', details);
        
        const detailsCard = document.getElementById('detailsCard');
        const venueCard = document.getElementById('venueCard');
        
        // Hide venue card when showing new event
        venueCard.style.display = 'none';
        
        // ========================================
        // Helper Functions
        // ========================================
        
        /**
         * Check if a value should be displayed (not N/A, null, undefined, or empty)
         */
        const shouldDisplay = (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') {
                const trimmed = value.trim();
                return trimmed !== '' && trimmed !== 'N/A';
            }
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return true;
        };
        
        /**
         * Build HTML for a field only if it should be displayed
         */
        const buildField = (label, value, isHtml = false) => {
            if (!shouldDisplay(value)) return '';
            const content = isHtml ? value : value;
            return `<p><strong>${label}</strong><br>${content}</p>`;
        };
        
        // ========================================
        // Process Artists/Teams
        // ========================================
        let artistsHtml = null;
        if (details.artists && Array.isArray(details.artists) && details.artists.length > 0) {
            artistsHtml = details.artists.map(artist => {
                if (typeof artist === 'string') {
                    return artist;
                }
                if (artist.name && artist.name !== 'N/A') {
                    const url = artist.url && artist.url !== '#' ? artist.url : '#';
                    return `<a href="${url}" target="_blank">${artist.name}</a>`;
                }
                return null;
            }).filter(a => a !== null).join(' | ');
            
            // If result is empty after filtering, set to null
            if (!artistsHtml) artistsHtml = null;
        }
        
        // ========================================
        // Process Ticket Status with Color
        // ========================================
        let ticketStatusHtml = null;
        if (shouldDisplay(details.ticketStatus)) {
            const statusColors = {
                'onsale': 'green',
                'offsale': 'red',
                'canceled': 'black',
                'cancelled': 'black',
                'postponed': 'orange',
                'rescheduled': 'orange'
            };
            const statusColor = statusColors[details.ticketStatus.toLowerCase()] || 'gray';
            ticketStatusHtml = `
                <span class="ticket-status" style="background-color: ${statusColor}; color: white; padding: 5px 10px; border-radius: 5px;">
                    ${details.ticketStatus}
                </span>`;
        }
        
        // ========================================
        // Process Buy Ticket URL
        // ========================================
        let buyTicketHtml = null;
        if (shouldDisplay(details.buyTicketUrl) && details.buyTicketUrl !== '#') {
            buyTicketHtml = `<a href="${details.buyTicketUrl}" target="_blank">Ticketmaster</a>`;
        }
        
        // ========================================
        // Build Details Info Section
        // ========================================
        let detailsInfoHtml = '<div class="details-info">';
        
        // Add each field conditionally
        detailsInfoHtml += buildField('Date', details.date);
        detailsInfoHtml += buildField('Artist/Team', artistsHtml, true);
        detailsInfoHtml += buildField('Venue', details.venue);
        detailsInfoHtml += buildField('Genres', details.genres);
        detailsInfoHtml += buildField('Price Ranges', details.priceRange);
        detailsInfoHtml += buildField('Ticket Status', ticketStatusHtml, true);
        detailsInfoHtml += buildField('Buy Ticket At:', buyTicketHtml, true);
        
        detailsInfoHtml += '</div>';
        
        // ========================================
        // Process Seatmap
        // ========================================
        const seatmapHtml = shouldDisplay(details.seatmap) 
            ? `<div class="seatmap"><img src="${details.seatmap}" alt="Seat Map"></div>` 
            : '';
        
        // ========================================
        // Build Complete Card
        // ========================================
        detailsCard.innerHTML = `
            <div class="event-details-card">
                <h2>${details.name || 'Event Details'}</h2>
                <div class="details-content">
                    ${detailsInfoHtml}
                    ${seatmapHtml}
                </div>
            </div>
            <div class="venue-btn-container">
                <button class="venue-details-btn" onclick="showVenueDetails('${(details.venue || 'N/A').replace(/'/g, "\\'")}', '${details.venueId || ''}')">
                    Show Venue Details
                </button>
            </div>
        `;
        
        // Display card and scroll to it
        detailsCard.style.display = 'block';
        detailsCard.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error fetching event details:', error);
        alert('Error loading event details');
    }
}

// ============================================
// Show Venue Details 
// ============================================
async function showVenueDetails(venueName, venueId = null) {
    /**
     * Toggle venue details display and fetch venue information
     */
    try {
        const venueCard = document.getElementById('venueCard');
        const btn = document.querySelector('.venue-details-btn');
        
        // Toggle: if already showing, hide it
        if (venueCard.style.display === 'block') {
            venueCard.style.display = 'none';
            if (btn) {
                btn.innerHTML = 'Show Venue Details';
                btn.classList.remove('expanded');
            }
            return;
        }
        
        // If venue name is invalid, show N/A message
        if (!venueName || venueName === 'N/A') {
            venueCard.innerHTML = `
                <div class="venue-card">
                    <h3>Venue Information Not Available</h3>
                    <p style="color: #999; font-style: italic; margin-top: 20px;">
                        No venue details found for this event.
                    </p>
                </div>
            `;
            venueCard.style.display = 'block';
            
            if (btn) {
                btn.innerHTML = 'Hide Venue Details';
                btn.classList.add('expanded');
            }
            return;
        }
        
        console.log('Fetching venue details for:', venueName);
        
        // Fetch venue details from backend
        const response = await fetch(`/api/venue?name=${encodeURIComponent(venueName)}`);
        const venue = await response.json();
        
        console.log('Venue details:', venue);
        
        // Check if we have valid venue data
        const hasValidData = venue.address !== 'N/A' || venue.city !== 'N/A' || venue.postalCode !== 'N/A';
        
        if (!hasValidData) {
            venueCard.innerHTML = `
                <div class="venue-card">
                    <h3>${venue.name}</h3>
                    <p style="color: #999; font-style: italic; margin-top: 20px;">
                        Detailed venue information is not available for this location.
                    </p>
                    ${venue.upcomingEvents && venue.upcomingEvents !== '#' ? 
                        `<div style="margin-top: 30px;">
                            <a href="${venue.upcomingEvents}" target="_blank">More events at this venue</a>
                        </div>` : ''
                    }
                </div>
            `;
        } else {
            // Display complete venue information with two-column layout
            const fullAddress = `${venue.name}, ${venue.address}, ${venue.city}, ${venue.postalCode}`;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
            
            const venueImageHtml = venue.image 
                ? `<img src="${venue.image}" alt="${venue.name}">`
                : '';
            
            venueCard.innerHTML = `
                <div class="venue-card">
                    <h3>${venue.name}</h3>
                    ${venueImageHtml}
                    <div class="venue-info-container">
                        <div class="venue-address">
                            <p><strong>Address:</strong> ${venue.address}<br>
                            ${venue.city}<br>
                            ${venue.postalCode}</p>
                            <p style="margin-top: 20px;">
                                <a href="${mapsUrl}" target="_blank">Open in Google Maps</a>
                            </p>
                        </div>
                        <div class="venue-links">
                            <a href="${venue.upcomingEvents}" target="_blank">More events at this venue</a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Show venue card
        venueCard.style.display = 'block';
        
        // Update button
        if (btn) {
            btn.innerHTML = 'Hide Venue Details';
            btn.classList.add('expanded');
        }
        
        // Scroll to venue card
        venueCard.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error fetching venue details:', error);
        
        const venueCard = document.getElementById('venueCard');
        venueCard.innerHTML = `
            <div class="venue-card">
                <h3>Error Loading Venue Details</h3>
                <p style="color: #d32f2f; margin-top: 20px;">Unable to load venue information at this time.</p>
            </div>
        `;
        venueCard.style.display = 'block';
        
        const btn = document.querySelector('.venue-details-btn');
        if (btn) {
            btn.innerHTML = 'Hide Venue Details';
            btn.classList.add('expanded');
        }
    }
}

// ============================================
// Clear Form
// ============================================
document.getElementById('clearBtn').addEventListener('click', function() {
    /**
     * Clear all form inputs and results
     * - Resets form to default values
     * - Hides all result sections
     * - Resets sort order
     * - Shows location input
     */
    document.getElementById('searchForm').reset();
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('detailsCard').style.display = 'none';
    document.getElementById('venueCard').style.display = 'none';
    document.getElementById('location').style.display = 'block';
    document.getElementById('location').setAttribute('required', 'required');
    currentEvents = [];
    sortOrder = { name: 0, genre: 0, venue: 0 };
    console.log('Form cleared');
});

// ============================================
// Initialize and Test
// ============================================
console.log('Geohash test:', Geohash.encode(34.0522, -118.2437, 7));
console.log('Search.js loaded successfully');