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
                // longitude
                const lonMid = (lonMin + lonMax) / 2;
                if (longitude > lonMid) {
                    idx = (idx << 1) + 1;
                    lonMin = lonMid;
                } else {
                    idx = idx << 1;
                    lonMax = lonMid;
                }
            } else {
                // latitude
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
let sortOrder = { event: 0, genre: 0, venue: 0 };

// ============================================
// 1. Auto-detect Location Toggle
// ============================================
document.getElementById('autoDetect').addEventListener('change', function() {
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
// 2. Get User Location (IPInfo API)
// ============================================
async function getUserLocation() {
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
// 3. Geocoding (Google Maps API)
// ============================================
async function geocodeAddress(address) {
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
// 4. Convert to Geohash
// ============================================
function encodeGeohash(lat, lng) {
    const geohash = Geohash.encode(lat, lng, 7);
    console.log(`Geohash for (${lat}, ${lng}):`, geohash);
    return geohash;
}

// ============================================
// 5. Search Form Submission
// ============================================
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log('=== Search Started ===');
    
    const keyword = document.getElementById('keyword').value;
    const distance = document.getElementById('distance').value || 10;
    const category = document.getElementById('category').value;
    
    console.log('Search params:', { keyword, distance, category });
    
    try {
        let lat, lng;
        
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
        
        const geohash = encodeGeohash(parseFloat(lat), parseFloat(lng));
        
        const url = `/api/search?keyword=${encodeURIComponent(keyword)}&distance=${distance}&category=${category}&geohash=${geohash}`;
        console.log('API URL:', url);
        
        const response = await fetch(url);
        const events = await response.json();
        
        console.log('Found events:', events.length);
        
        currentEvents = events;
        displayResults(events);
        
    } catch (error) {
        console.error('Search error:', error);
        alert('Error performing search: ' + error.message);
    }
});

// ============================================
// 6. Display Results Table
// ============================================
function displayResults(events) {
    const resultsContainer = document.getElementById('resultsContainer');
    const tbody = document.querySelector('#resultsTable tbody');
    const noResults = document.getElementById('noResults');
    
    tbody.innerHTML = '';
    
    if (events.length === 0) {
        resultsContainer.style.display = 'block';
        document.getElementById('resultsTable').style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    resultsContainer.style.display = 'block';
    document.getElementById('resultsTable').style.display = 'table';
    noResults.style.display = 'none';
    
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
// 7. Table Sorting
// ============================================
document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', function() {
        const column = this.dataset.column;
        sortTable(column);
    });
});

function sortTable(column) {
    sortOrder[column] = sortOrder[column] === 1 ? -1 : 1;
    
    for (let key in sortOrder) {
        if (key !== column) sortOrder[key] = 0;
    }
    
    currentEvents.sort((a, b) => {
        let valA = a[column].toLowerCase();
        let valB = b[column].toLowerCase();
        
        if (valA < valB) return -1 * sortOrder[column];
        if (valA > valB) return 1 * sortOrder[column];
        return 0;
    });
    
    displayResults(currentEvents);
}

// ============================================
// 8. Show Event Details
// ============================================
async function showDetails(eventId) {
    try {
        console.log('Fetching details for event:', eventId);
        
        const response = await fetch(`/api/event/${eventId}`);
        const details = await response.json();
        
        console.log('Event details:', details);
        
        const detailsCard = document.getElementById('detailsCard');
        
        // Build artists/teams HTML with proper URLs
        const artistsHtml = details.artists && details.artists.length > 0 
            ? details.artists.map(artist => {
                if (typeof artist === 'string') {
                    return artist; // fallback for old format
                }
                return `<a href="${artist.url}" target="_blank">${artist.name}</a>`;
            }).join(' | ')
            : 'N/A';
        
        const statusColors = {
            'onsale': 'green',
            'offsale': 'red',
            'canceled': 'black',
            'cancelled': 'black',
            'postponed': 'orange',
            'rescheduled': 'orange'
        };
        const statusColor = statusColors[details.ticketStatus?.toLowerCase()] || 'gray';
        
        detailsCard.innerHTML = `
            <div class="event-details-card">
                <h2>${details.name}</h2>
                <div class="details-content">
                    <div class="details-info">
                        <p><strong>Date</strong><br>${details.date}</p>
                        <p><strong>Artist/Team</strong><br>${artistsHtml}</p>
                        <p><strong>Venue</strong><br>${details.venue}</p>
                        <p><strong>Genres</strong><br>${details.genres}</p>
                        ${details.priceRange !== 'N/A' ? `<p><strong>Price Ranges</strong><br>${details.priceRange}</p>` : ''}
                        <p><strong>Ticket Status</strong><br>
                            <span class="ticket-status" style="background-color: ${statusColor}; color: white; padding: 5px 10px; border-radius: 5px;">
                                ${details.ticketStatus}
                            </span>
                        </p>
                        <p><strong>Buy Ticket At:</strong><br>
                            <a href="${details.buyTicketUrl}" target="_blank">Ticketmaster</a>
                        </p>
                    </div>
                    ${details.seatmap ? `<div class="seatmap"><img src="${details.seatmap}" alt="Seat Map"></div>` : ''}
                </div>
                <button onclick="showVenueDetails('${details.venue}')" style="margin-top: 20px;">Show Venue Details ▼</button>
            </div>
        `;
        
        detailsCard.style.display = 'block';
        detailsCard.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error fetching event details:', error);
        alert('Error loading event details');
    }
}

// ============================================
// 9. Show Venue Details 
// ============================================
async function showVenueDetails(venueName) {
    try {
        const venueCard = document.getElementById('venueCard');
        
        
        if (venueCard.style.display === 'block') {
            venueCard.style.display = 'none';
            
            const btn = document.querySelector('.event-details-card button');
            if (btn) {
                btn.textContent = 'Show Venue Details ▼';
            }
            return;
        }
        
        console.log('Fetching venue details for:', venueName);
        
        const response = await fetch(`/api/venue?name=${encodeURIComponent(venueName)}`);
        const venue = await response.json();
        
        console.log('Venue details:', venue);
        
        const fullAddress = `${venue.name}, ${venue.address}, ${venue.city}, ${venue.postalCode}`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
        
        // Build venue image HTML
        const venueImageHtml = venue.image 
            ? `<img src="${venue.image}" alt="${venue.name}" style="max-width: 200px; height: auto; margin: 20px auto; display: block;">`
            : '';
        
        venueCard.innerHTML = `
            <div class="venue-card">
                <h3>${venue.name}</h3>
                ${venueImageHtml}
                <div style="text-align: left; display: inline-block;">
                    <p><strong>Address:</strong> ${venue.address}<br>
                    ${venue.city}<br>
                    ${venue.postalCode}</p>
                </div>
                <div style="margin-top: 20px;">
                    <a href="${mapsUrl}" target="_blank" style="margin-right: 20px;">Open in Google Maps</a>
                    <a href="${venue.upcomingEvents}" target="_blank">More events at this venue</a>
                </div>
            </div>
        `;
        
        
        venueCard.style.display = 'block';
        
        
        const btn = document.querySelector('.event-details-card button');
        if (btn) {
            btn.textContent = 'Hide Venue Details ▲';
        }
        
        venueCard.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error fetching venue details:', error);
        alert('Error loading venue details');
    }
}

// ============================================
// 10. Clear Form
// ============================================
document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('searchForm').reset();
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('detailsCard').style.display = 'none';
    document.getElementById('venueCard').style.display = 'none';
    document.getElementById('location').style.display = 'block';
    currentEvents = [];
    sortOrder = { event: 0, genre: 0, venue: 0 };
    console.log('Form cleared');
});

// ============================================
// Test Geohash on Load
// ============================================
console.log('Geohash test:', Geohash.encode(34.0522, -118.2437, 7));
console.log('Search.js loaded successfully');