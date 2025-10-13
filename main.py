from flask import Flask, request, jsonify, send_from_directory
import requests
import os

app = Flask(__name__, static_folder='static', static_url_path='')

# Ticketmaster API Key
TICKETMASTER_API_KEY = 'jojFIRo2FHGGqS1uAjnQIfKPuCzdGYz1'

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'events.html')

@app.route('/images/<path:filename>')
def serve_image(filename):
    """Serve images from the images folder"""
    return send_from_directory('images', filename)

@app.route('/api/search')
def search_events():
    """
    Search for events using Ticketmaster API
    Query parameters:
    - keyword: Search keyword (required)
    - distance: Search radius in miles (default: 10)
    - category: Event category segment ID (default: Default)
    - geohash: Geohash of location (required)
    """
    try:
        # Get query parameters from request
        keyword = request.args.get('keyword')
        distance = request.args.get('distance', 10)
        category = request.args.get('category', 'Default')
        geohash = request.args.get('geohash')
        
        # Build Ticketmaster API URL
        url = 'https://app.ticketmaster.com/discovery/v2/events.json'
        params = {
            'apikey': TICKETMASTER_API_KEY,
            'keyword': keyword,
            'radius': distance,
            'unit': 'miles',
            'geoPoint': geohash
        }
        
        # Add category filter if not default
        if category != 'Default':
            params['segmentId'] = category
        
        # Call Ticketmaster API
        response = requests.get(url, params=params)
        data = response.json()
        
        # Parse and format results
        events = []
        if '_embedded' in data and 'events' in data['_embedded']:
            for event in data['_embedded']['events']:
                # Format date and time
                date_str = event['dates']['start'].get('localDate', 'N/A')
                time_str = event['dates']['start'].get('localTime', '')
                formatted_date = f"{date_str} {time_str}".strip()
                
                # Extract event information
                events.append({
                    'id': event['id'],
                    'name': event['name'],
                    'date': formatted_date,
                    'icon': event['images'][0]['url'] if event.get('images') else '',
                    'genre': event['classifications'][0]['segment']['name'] if event.get('classifications') else 'N/A',
                    'venue': event['_embedded']['venues'][0]['name'] if '_embedded' in event and 'venues' in event['_embedded'] else 'N/A'
                })
        
        return jsonify(events)
    
    except Exception as e:
        print(f"Error in search_events: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/event/<event_id>')
def get_event_details(event_id):
    """
    Get detailed information for a specific event
    Parameters:
    - event_id: Ticketmaster event ID
    """
    try:
        # Build API request for event details
        url = f'https://app.ticketmaster.com/discovery/v2/events/{event_id}.json'
        params = {'apikey': TICKETMASTER_API_KEY}
        
        response = requests.get(url, params=params)
        data = response.json()
        
        # Parse date and time
        date_str = data['dates']['start'].get('localDate', 'N/A')
        time_str = data['dates']['start'].get('localTime', '')
        formatted_date = f"{date_str} {time_str}".strip()
        
        # Parse artists/teams with URLs
        artists = []
        if '_embedded' in data and 'attractions' in data['_embedded']:
            for attraction in data['_embedded']['attractions']:
                artists.append({
                    'name': attraction.get('name', 'N/A'),
                    'url': attraction.get('url', '#')
                })
        
        # Parse venue information - get full venue object
        venue_name = 'N/A'
        venue_id = None
        if '_embedded' in data and 'venues' in data['_embedded'] and len(data['_embedded']['venues']) > 0:
            venue_obj = data['_embedded']['venues'][0]
            venue_name = venue_obj.get('name', 'N/A')
            venue_id = venue_obj.get('id', None)
        
        # Parse genres/classifications
        genres = []
        if 'classifications' in data:
            for classification in data['classifications']:
                # Add segment
                if 'segment' in classification and 'name' in classification['segment']:
                    segment_name = classification['segment']['name']
                    if segment_name:
                        genres.append(segment_name)
                
                # Add genre
                if 'genre' in classification and 'name' in classification['genre']:
                    genre_name = classification['genre']['name']
                    if genre_name and genre_name != 'Undefined':
                        genres.append(genre_name)
                
                # Add sub-genre
                if 'subGenre' in classification and 'name' in classification['subGenre']:
                    subgenre_name = classification['subGenre']['name']
                    if subgenre_name and subgenre_name != 'Undefined':
                        genres.append(subgenre_name)
                
                # Add type
                if 'type' in classification and 'name' in classification['type']:
                    type_name = classification['type']['name']
                    if type_name and type_name != 'Undefined':
                        genres.append(type_name)
                
                # Add sub-type
                if 'subType' in classification and 'name' in classification['subType']:
                    subtype_name = classification['subType']['name']
                    if subtype_name and subtype_name != 'Undefined':
                        genres.append(subtype_name)
        
        # Join genres with pipe separator, remove duplicates
        genre_str = ' | '.join(dict.fromkeys(filter(None, genres))) if genres else 'N/A'
        
        # Parse price range
        price_range = 'N/A'
        if 'priceRanges' in data and len(data['priceRanges']) > 0:
            min_price = data['priceRanges'][0].get('min', None)
            max_price = data['priceRanges'][0].get('max', None)
            if min_price is not None and max_price is not None:
                price_range = f"{min_price} - {max_price} USD"
        
        # Parse ticket status
        ticket_status = 'N/A'
        if 'dates' in data and 'status' in data['dates']:
            ticket_status = data['dates']['status'].get('code', 'N/A')
        
        # Parse buy ticket URL
        buy_ticket_url = data.get('url', '#')
        
        # Parse seatmap
        seatmap = None
        if 'seatmap' in data and 'staticUrl' in data['seatmap']:
            seatmap = data['seatmap']['staticUrl']
        
        # Build response object
        details = {
            'name': data.get('name', 'N/A'),
            'date': formatted_date,
            'artists': artists,
            'venue': venue_name,
            'venueId': venue_id,
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
    """
    Get detailed information for a specific venue
    Query parameters:
    - id: Venue ID (preferred if available)
    - name: Venue name to search for (fallback)
    """
    try:
        venue_id = request.args.get('id')
        venue_name = request.args.get('name')
        
        # Priority 1: Use Venue ID if provided
        if venue_id and venue_id not in ['None', 'null', '']:
            url = f'https://app.ticketmaster.com/discovery/v2/venues/{venue_id}.json'
            params = {'apikey': TICKETMASTER_API_KEY}
            
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                venue = response.json()
                
                # Extract venue information
                name = venue.get('name', 'N/A')
                
                address_data = venue.get('address', {})
                address = address_data.get('line1', 'N/A') if address_data else 'N/A'
                
                city_data = venue.get('city', {})
                city_name = city_data.get('name', 'N/A') if city_data else 'N/A'
                
                state_data = venue.get('state', {})
                state_code = state_data.get('stateCode', '') if state_data else ''
                
                city = f"{city_name}, {state_code}" if state_code else city_name
                postal_code = venue.get('postalCode', 'N/A')
                upcoming_events = venue.get('url', '#')
                
                venue_image = None
                if 'images' in venue and isinstance(venue['images'], list) and len(venue['images']) > 0:
                    venue_image = venue['images'][0].get('url', None)
                
                return jsonify({
                    'name': name,
                    'address': address,
                    'city': city,
                    'postalCode': postal_code,
                    'upcomingEvents': upcoming_events,
                    'image': venue_image
                })
        
        # Priority 2: Fallback to search by name
        if not venue_name or venue_name == 'N/A':
            return jsonify({
                'name': 'N/A',
                'address': 'N/A',
                'city': 'N/A',
                'postalCode': 'N/A',
                'upcomingEvents': '#',
                'image': None
            })
        
        # Search by venue name
        url = 'https://app.ticketmaster.com/discovery/v2/venues.json'
        params = {
            'apikey': TICKETMASTER_API_KEY,
            'keyword': venue_name
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if '_embedded' in data and 'venues' in data['_embedded'] and len(data['_embedded']['venues']) > 0:
            venue = data['_embedded']['venues'][0]
            
            name = venue.get('name', 'N/A')
            address_data = venue.get('address', {})
            address = address_data.get('line1', 'N/A') if address_data else 'N/A'
            
            city_data = venue.get('city', {})
            city_name = city_data.get('name', 'N/A') if city_data else 'N/A'
            
            state_data = venue.get('state', {})
            state_code = state_data.get('stateCode', '') if state_data else ''
            
            city = f"{city_name}, {state_code}" if state_code else city_name
            postal_code = venue.get('postalCode', 'N/A')
            upcoming_events = venue.get('url', '#')
            
            venue_image = None
            if 'images' in venue and isinstance(venue['images'], list) and len(venue['images']) > 0:
                venue_image = venue['images'][0].get('url', None)
            
            return jsonify({
                'name': name,
                'address': address,
                'city': city,
                'postalCode': postal_code,
                'upcomingEvents': upcoming_events,
                'image': venue_image
            })
        else:
            return jsonify({
                'name': venue_name,
                'address': 'N/A',
                'city': 'N/A',
                'postalCode': 'N/A',
                'upcomingEvents': '#',
                'image': None
            })
    
    except Exception as e:
        print(f"Error in get_venue_details: {str(e)}")
        return jsonify({
            'name': venue_name if 'venue_name' in locals() else 'N/A',
            'address': 'N/A',
            'city': 'N/A',
            'postalCode': 'N/A',
            'upcomingEvents': '#',
            'image': None
        }), 500

if __name__ == '__main__':
    # Run Flask app in debug mode for development
    app.run(debug=True, host='0.0.0.0', port=8080)