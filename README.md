# Events Search Web Application

A full-stack web application for searching and exploring events using the Ticketmaster API, built with Python Flask backend and vanilla JavaScript frontend.

![Events Search](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.0.0-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![GCP](https://img.shields.io/badge/Deploy-Google%20Cloud-red)

## 🎯 Features

- **Event Search**: Search for events by keyword, category, location, and distance
- **Auto-detect Location**: Automatically detect user location using IPInfo API
- **Interactive Results Table**: Display search results with sortable columns
- **Event Details**: View comprehensive event information including:
  - Date, time, and venue
  - Artist/team information
  - Price ranges and ticket status
  - Seat maps
  - Genre classifications
- **Venue Information**: Detailed venue details with:
  - Address and contact information
  - Google Maps integration
  - Upcoming events at the venue
- **Responsive Design**: Modern UI with frosted glass effects and smooth animations

## 🛠️ Technologies Used

### Backend
- **Python 3.12**
- **Flask 3.0.0** - Web framework
- **Gunicorn 21.2.0** - WSGI HTTP server
- **Requests 2.31.0** - HTTP library
- **Geolib 1.0.7** - Geohash encoding
- **Flask-CORS 4.0.0** - Cross-origin resource sharing

### Frontend
- **HTML5/CSS3** - Structure and styling
- **Vanilla JavaScript** - Client-side functionality
- **No frameworks** - Pure DOM manipulation

### APIs
- **Ticketmaster Discovery API** - Event data
- **Google Maps Geocoding API** - Location geocoding
- **IPInfo API** - User location detection

### Deployment
- **Google Cloud Platform (GCP)** - App Engine hosting

## 📁 Project Structure

```
.
├── main.py                 # Flask backend server
├── app.yaml               # GCP App Engine configuration
├── requirements.txt       # Python dependencies
├── .gcloudignore         # GCP ignore file
├── .gitattributes        # Git attributes
├── static/
│   ├── events.html       # Main HTML page
│   ├── mystyle.css       # Styles and animations
│   └── search.js         # Frontend JavaScript logic
└── images/
    └── background.jpg    # Background image
```

## 🚀 Setup and Installation

### Prerequisites
- Python 3.12 or higher
- Google Cloud SDK (for deployment)
- API Keys:
  - Ticketmaster API Key
  - Google Maps API Key
  - IPInfo API Token

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd <repository-name>
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure API Keys**

Update the API keys in `app.yaml`:
```yaml
env_variables:
  TICKETMASTER_API_KEY: "your_ticketmaster_key"
  GOOGLE_API_KEY: "your_google_maps_key"
```

Update the IPInfo token in `static/search.js` (line ~123):
```javascript
const response = await fetch('https://ipinfo.io/?token=your_ipinfo_token');
```

Update the Google Maps API key in `static/search.js` (line ~144):
```javascript
const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=YOUR_API_KEY`;
```

4. **Run locally**
```bash
python main.py
```
Visit `http://localhost:8080` in your browser.

### Deployment to Google Cloud Platform

1. **Initialize GCP project**
```bash
gcloud init
```

2. **Deploy to App Engine**
```bash
gcloud app deploy
```

3. **View your application**
```bash
gcloud app browse
```

## 🔧 Key Implementation Details

### Geohash Encoding
Custom JavaScript implementation for converting latitude/longitude coordinates to geohash format:
```javascript
const geohash = Geohash.encode(latitude, longitude, 7);
```

### Form Persistence
Search form values are preserved after searches using `saveFormValues()` and `restoreFormValues()` functions.

### Dynamic Content Loading
- Event and venue details are loaded asynchronously using `fetch()` API
- Content is displayed in dynamically generated HTML cards
- Smooth scroll navigation to newly loaded content

### Error Handling
- Comprehensive try-catch blocks for API calls
- User-friendly error messages
- Graceful handling of missing data (displays "N/A")

### Auto-detect Location
- Uses IPInfo API to get user's IP-based location
- Toggle between auto-detect and manual location input
- Dynamic form field visibility

## 📊 Data Flow

```
User Input → JavaScript Validation → Backend API Call → Ticketmaster API
                                              ↓
                              JSON Response Processing
                                              ↓
                              Frontend Rendering
```

## 📚 Documentation References

- [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/start)
- [IPInfo API](https://ipinfo.io/developers)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Google App Engine Python](https://cloud.google.com/appengine/docs/standard/python3)

**Last Updated:** October 2025
