// Global variables for sorting
let currentEvents = [];
let sortOrder = { event: 0, genre: 0, venue: 0 }; // 0: none, 1: asc, -1: desc

// 1. Auto-detect location toggle
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

// 2. Get user location using IPInfo API
async function getUserLocation() {
    try {
        const response = await fetch('https://ipinfo.io/?token=bf8f570fb8f455');
        const data = await response.json();
        return data.loc; // Returns "lat,lng"
    } catch (error) {
        console.error('Error getting user location:', error);
        throw error;
    }
}

// 3. Geocoding using Google Maps API
async function geocodeAddress(address) {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyBLI3A7HJUJ4jTPEPuESWCppDVdyYYMSGY`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0].geometry.location; // {lat, lng}
        } else {
            throw new Error('No results found for address');
        }
    } catch (error) {
        console.error('Error geocoding address:', error);
        throw error;
    }
}

// 4. Convert to Geohash
function encodeGeohash(lat, lng) {
    return Geohash.encode(lat, lng, 7);
}

// 5. Search form submission
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const keyword = document.getElementById('keyword').value;
    const distance = document.getElementById('distance').value || 10;
    const category = document.getElementById('category').value;
    
    try {
        // Get location
        let lat, lng;
        if (document.getElementById('autoDetect').checked) {
            const loc = await getUserLocation();
            [lat, lng] = loc.split(',');
        } else {
            const location = document.getElementById('location').value;
            const coords = await geocodeAddress(location);
            lat = coords.lat;
            lng = coords.lng;
        }
        
        const geohash = encodeGeohash(parseFloat(lat), parseFloat(lng));
        
        // Call backend API
        const url = `/api/search?keyword=${encodeURIComponent(keyword)}&distance=${distance}&category=${category}&geohash=${geohash}`;
        const response = await fetch(url);
        const events = await response.json();
        
        // Store events for sorting
        currentEvents = events;
        
        // Display results
        displayResults(events);
    } catch (error) {
        console.error('Search error:', error);
        alert('Error performing search. Please try again.');
    }
});

// 6. Display results table
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
            <td><img src="${event.icon}" width="50" alt="Event icon"></td>
            <td><a href="#" onclick="showDetails('${event.id}'); return false;">${event.name}</a></td>
            <td>${event.genre}</td>
            <td>${event.venue}</td>
        `;
        tbody.appendChild(row);
    });
}

// 7. Table sorting
document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', function() {
        const column = this.dataset.column;
        sortTable(column);
    });
});

function sortTable(column) {
    // Update sort order
    sortOrder[column] = sortOrder[column] === 1 ? -1 : 1;
    
    // Reset other columns
    for (let key in sortOrder) {
        if (key !== column) sortOrder[key] = 0;
    }
    
    // Sort events
    currentEvents.sort((a, b) => {
        let valA = a[column].toLowerCase();
        let valB = b[column].toLowerCase();
        
        if (valA < valB) return -1 * sortOrder[column];
        if (valA > valB) return 1 * sortOrder[column];
        return 0;
    });
    
    displayResults(currentEvents);
}

// 8. Show event details
async function showDetails(eventId) {
    try {
        const response = await fetch(`/api/event/${eventId}`);
        const details = await response.json();
        
        const detailsCard = document.getElementById('detailsCard');
        
        // Build artists/teams string
        const artistsHtml = details.artists && details.artists.length > 0 
            ? details.artists.map(artist => `<a href="#" target="_blank">${artist}</a>`).join(' | ')
            : 'N/A';
        
        // Get ticket status color
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
                <button onclick="showVenueDetails('${details.venue}')">Show Venue Details ▼</button>
            </div>
        `;
        
        detailsCard.style.display = 'block';
        detailsCard.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error fetching event details:', error);
    }
}

// 9. Show venue details
async function showVenueDetails(venueName) {
    try {
        const response = await fetch(`/api/venue?name=${encodeURIComponent(venueName)}`);
        const venue = await response.json();
        
        const venueCard = document.getElementById('venueCard');
        
        const fullAddress = `${venue.name}, ${venue.address}, ${venue.city}, ${venue.postalCode}`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
        
        venueCard.innerHTML = `
            <div class="venue-card">
                <h3>${venue.name}</h3>
                <p><strong>Address:</strong> ${venue.address}<br>
                   ${venue.city}<br>
                   ${venue.postalCode}</p>
                <p><a href="${mapsUrl}" target="_blank">Open in Google Maps</a></p>
                <p><a href="${venue.upcomingEvents}" target="_blank">More events at this venue</a></p>
            </div>
        `;
        
        venueCard.style.display = 'block';
        venueCard.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error fetching venue details:', error);
    }
}

// 10. Clear form
document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('searchForm').reset();
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('detailsCard').style.display = 'none';
    document.getElementById('venueCard').style.display = 'none';
    document.getElementById('location').style.display = 'block';
    currentEvents = [];
    sortOrder = { event: 0, genre: 0, venue: 0 };
});