// 1. Auto-detect位置切换
document.getElementById('autoDetect').addEventListener('change', function() {
    const locationInput = document.getElementById('location');
    locationInput.style.display = this.checked ? 'none' : 'block';
    if (!this.checked) {
        locationInput.required = true;
    }
});

// 2. 获取用户位置（使用IPInfo API）
async function getUserLocation() {
    const response = await fetch('https://ipinfo.io/?token=bf8f570fb8f455');
    const data = await response.json();
    return data.loc; // 返回 "lat,lng"
}

// 3. Geocoding（使用Google Maps API）
async function geocodeAddress(address) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyBLI3A7HJUJ4jTPEPuESWCppDVdyYYMSGY`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results[0].geometry.location; // {lat, lng}
}

// 4. 转换为Geohash（需要引入geohash库）
function encodeGeohash(lat, lng) {
    // 使用 latlon-geohash.js 库
    return Geohash.encode(lat, lng, 7);
}

// 5. 提交搜索表单
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 获取表单数据
    const keyword = document.getElementById('keyword').value;
    const distance = document.getElementById('distance').value || 10;
    const category = document.getElementById('category').value;
    
    // 获取位置
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
    
    // 调用后端API
    const url = `/api/search?keyword=${keyword}&distance=${distance}&category=${category}&geohash=${geohash}`;
    const response = await fetch(url);
    const events = await response.json();
    
    // 显示结果
    displayResults(events);
});

// 6. 显示结果表格
function displayResults(events) {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';
    
    if (events.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        return;
    }
    
    events.forEach(event => {
        const row = `
            <tr>
                <td>${event.date}</td>
                <td><img src="${event.icon}" width="50"></td>
                <td><a href="#" onclick="showDetails('${event.id}')">${event.name}</a></td>
                <td>${event.genre}</td>
                <td>${event.venue}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// 7. 清除表单
document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('searchForm').reset();
    document.getElementById('resultsTable').style.display = 'none';
    document.getElementById('detailsCard').style.display = 'none';
});