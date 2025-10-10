from flask import Flask, request, jsonify, send_from_directory
import requests
import geolib

app = Flask(__name__, static_folder='static', static_url_path='')

# API密钥
TICKETMASTER_API_KEY = '	jojFIRo2FHGGqS1uAjnQIfKPuCzdGYz1'

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/search')
def search_events():
    # 获取查询参数
    keyword = request.args.get('keyword')
    distance = request.args.get('distance', 10)
    category = request.args.get('category', 'Default')
    geohash = request.args.get('geohash')
    
    # 构建Ticketmaster API URL
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
    
    # 调用Ticketmaster API
    response = requests.get(url, params=params)
    data = response.json()
    
    # 解析结果
    events = []
    if '_embedded' in data and 'events' in data['_embedded']:
        for event in data['_embedded']['events']:
            events.append({
                'id': event['id'],
                'name': event['name'],
                'date': event['dates']['start'].get('localDate', 'N/A') + ' ' + event['dates']['start'].get('localTime', ''),
                'icon': event['images'][0]['url'] if event.get('images') else '',
                'genre': event['classifications'][0]['segment']['name'] if event.get('classifications') else 'N/A',
                'venue': event['_embedded']['venues'][0]['name'] if '_embedded' in event else 'N/A'
            })
    
    return jsonify(events)

@app.route('/api/event/<event_id>')
def get_event_details(event_id):
    # 获取活动详情
    url = f'https://app.ticketmaster.com/discovery/v2/events/{event_id}.json'
    params = {'apikey': TICKETMASTER_API_KEY}
    
    response = requests.get(url, params=params)
    data = response.json()
    
    # 解析详情数据
    details = {
        'name': data.get('name'),
        'date': data['dates']['start'].get('localDate', 'N/A'),
        'artists': [a['name'] for a in data['_embedded'].get('attractions', [])],
        'venue': data['_embedded']['venues'][0]['name'],
        'genres': ' | '.join([c['segment']['name'] for c in data.get('classifications', [])]),
        'priceRange': f"{data['priceRanges'][0]['min']} - {data['priceRanges'][0]['max']} USD" if 'priceRanges' in data else 'N/A',
        'ticketStatus': data['dates']['status']['code'],
        'buyTicketUrl': data.get('url'),
        'seatmap': data.get('seatmap', {}).get('staticUrl')
    }
    
    return jsonify(details)

@app.route('/api/venue')
def get_venue_details():
    venue_name = request.args.get('name')
    
    url = 'https://app.ticketmaster.com/discovery/v2/venues.json'
    params = {
        'apikey': TICKETMASTER_API_KEY,
        'keyword': venue_name
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if '_embedded' in data:
        venue = data['_embedded']['venues'][0]
        return jsonify({
            'name': venue['name'],
            'address': venue['address'].get('line1', 'N/A'),
            'city': venue['city']['name'] + ', ' + venue['state']['stateCode'],
            'postalCode': venue.get('postalCode', 'N/A'),
            'upcomingEvents': venue.get('url')
        })
    
    return jsonify({})

if __name__ == '__main__':
    app.run(debug=True)