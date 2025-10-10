from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os

app = Flask(__name__, static_folder='static', static_url_path='')

# Enable CORS for local testing
CORS(app)

# API Key
TICKETMASTER_API_KEY = 'jojFIRo2FHGGqS1uAjnQIfKPuCzdGYz1'

@app.route('/')
def index():
    return send_from_directory('static', 'events.html')

@app.route('/api/search')
def search_events():
    try:
        # Get query parameters
        keyword = request.args.get('keyword')
        distance = request.args.get('distance', 10)
        category = request.args.get('category', 'Default')
        geohash = request.args.get('geohash')
        
        print(f"Search request - Keyword: {keyword}, Distance: {distance}, Category: {category}, Geohash: {geohash}")
        
        # Build Ticketmaster API URL
        url = 'https://app.ticketmaster.com/discovery/v2/events.json'
        params = {
            'apikey': TICKETMASTER_API_KEY,
            'keyword': keyword,
            'radius': distance,
            'unit': 'miles',
            'geoPoint': geohash
        }
        
        if category != 'Default':
            params['segmentId'] = category
        
        # Call Ticketmaster API
        response = requests.get(url, params=params)
        print(f"Ticketmaster API Status: {response.status_code}")
        
        data = response.json()
        
        # Parse results
        events = []
        if '_embedded' in data and 'events' in data['_embedded']:
            for event in data['_embedded']['events']:
                # Format date and time
                date_str = event['dates']['start'].get('localDate', 'N/A')
                time_str = event['dates']['start'].get('localTime', '')
                formatted_date = f"{date_str} {time_str}".strip()
                
                events.append({
                    'id': event['id'],
                    'name': event['name'],
                    'date': formatted_date,
                    'icon': event['images'][0]['url'] if event.get('images') else '',
                    'genre': event['classifications'][0]['segment']['name'] if event.get('classifications') else 'N/A',
                    'venue': event['_embedded']['venues'][0]['name'] if '_embedded' in event and 'venues' in event['_embedded'] else 'N/A'
                })
        
        print(f"Found {len(events)} events")
        return jsonify(events)
    
    except Exception as e:
        print(f"Error in search_events: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/event/<event_id>')
def get_event_details(event_id):
    try:
        print(f"Getting details for event: {event_id}")
        
        # Get event details
        url = f'https://app.ticketmaster.com/discovery/v2/events/{event_id}.json'
        params = {'apikey': TICKETMASTER_API_KEY}
        
        response = requests.get(url, params=params)
        print(f"Event details API Status: {response.status_code}")
        
        data = response.json()
        
        # Parse date
        date_str = data['dates']['start'].get('localDate', 'N/A')
        time_str = data['dates']['start'].get('localTime', '')
        formatted_date = f"{date_str} {time_str}".strip()
        
        # Parse artists/teams
        artists = []
        if '_embedded' in data and 'attractions' in data['_embedded']:
            artists = [a['name'] for a in data['_embedded']['attractions']]
        
        # Parse venue
        venue = 'N/A'
        if '_embedded' in data and 'venues' in data['_embedded'] and len(data['_embedded']['venues']) > 0:
            venue = data['_embedded']['venues'][0]['name']
        
        # Parse genres
        genres = []
        if 'classifications' in data:
            for classification in data['classifications']:
                if 'segment' in classification and 'name' in classification['segment']:
                    genres.append(classification['segment']['name'])
                if 'genre' in classification and 'name' in classification['genre']:
                    genres.append(classification['genre']['name'])
                if 'subGenre' in classification and 'name' in classification['subGenre']:
                    genres.append(classification['subGenre']['name'])
        genre_str = ' | '.join(filter(None, genres)) if genres else 'N/A'
        
        # Parse price range
        price_range = 'N/A'
        if 'priceRanges' in data and len(data['priceRanges']) > 0:
            min_price = data['priceRanges'][0].get('min', 'N/A')
            max_price = data['priceRanges'][0].get('max', 'N/A')
            price_range = f"{min_price} - {max_price} USD"
        
        # Parse ticket status
        ticket_status = data['dates']['status'].get('code', 'N/A')
        
        # Parse buy ticket URL
        buy_ticket_url = data.get('url', '#')
        
        # Parse seatmap
        seatmap = None
        if 'seatmap' in data and 'staticUrl' in data['seatmap']:
            seatmap = data['seatmap']['staticUrl']
        
        details = {
            'name': data.get('name', 'N/A'),
            'date': formatted_date,
            'artists': artists,
            'venue': venue,
            'genres': genre_str,
            'priceRange': price_range,
            'ticketStatus': ticket_status,
            'buyTicketUrl': buy_ticket_url,
            'seatmap': seatmap
        }
        
        return jsonify(details)
    
    except Exception as e:
        print(f"Error in get_event_details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/venue')
def get_venue_details():
    try:
        venue_name = request.args.get('name')
        print(f"Getting venue details for: {venue_name}")
        
        url = 'https://app.ticketmaster.com/discovery/v2/venues.json'
        params = {
            'apikey': TICKETMASTER_API_KEY,
            'keyword': venue_name
        }
        
        response = requests.get(url, params=params)
        print(f"Venue API Status: {response.status_code}")
        
        data = response.json()
        
        if '_embedded' in data and 'venues' in data['_embedded'] and len(data['_embedded']['venues']) > 0:
            venue = data['_embedded']['venues'][0]
            
            # Parse address
            address = venue.get('address', {}).get('line1', 'N/A')
            
            # Parse city and state
            city_name = venue.get('city', {}).get('name', 'N/A')
            state_code = venue.get('state', {}).get('stateCode', '')
            city = f"{city_name}, {state_code}" if state_code else city_name
            
            # Parse postal code
            postal_code = venue.get('postalCode', 'N/A')
            
            # Parse upcoming events URL
            upcoming_events = venue.get('url', '#')
            
            return jsonify({
                'name': venue.get('name', 'N/A'),
                'address': address,
                'city': city,
                'postalCode': postal_code,
                'upcomingEvents': upcoming_events
            })
        
        return jsonify({
            'name': 'N/A',
            'address': 'N/A',
            'city': 'N/A',
            'postalCode': 'N/A',
            'upcomingEvents': '#'
        })
    
    except Exception as e:
        print(f"Error in get_venue_details: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run on localhost with debug mode
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)