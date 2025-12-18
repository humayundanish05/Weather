const apiKey = '3fe22051fe0e5bb7a229bb1b21ca2d5c'; // User provided key
const apiBaseUrl = 'https://api.openweathermap.org/data/2.5/';

const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// State
let currentUnit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit

// Elements to update
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const currentTempEl = document.getElementById('current-temp');
const weatherIconEl = document.getElementById('weather-icon');
const weatherDescEl = document.getElementById('weather-description');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const pressureEl = document.getElementById('pressure');
const visibilityEl = document.getElementById('visibility');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const forecastContainer = document.getElementById('forecast-container');
const celsiusBtn = document.getElementById('celsius');
const fahrenheitBtn = document.getElementById('fahrenheit');

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value;
    if (city) {
        fetchWeather(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value;
        if (city) {
            fetchWeather(city);
        }
    }
});

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        }, () => {
            showError('Geolocation access denied');
        });
    } else {
        showError('Geolocation not supported');
    }
});

celsiusBtn.addEventListener('click', () => {
    if (currentUnit !== 'metric') {
        currentUnit = 'metric';
        updateUnitUI();
        refreshWeather();
    }
});

fahrenheitBtn.addEventListener('click', () => {
    if (currentUnit !== 'imperial') {
        currentUnit = 'imperial';
        updateUnitUI();
        refreshWeather();
    }
});

// Init
let lastCity = 'London'; // Default
fetchWeather(lastCity);

function updateUnitUI() {
    if (currentUnit === 'metric') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
    }
}

function refreshWeather() {
    const city = cityNameEl.innerText;
    if (city && city !== '--') {
        fetchWeather(city);
    }
}

async function fetchWeather(city) {
    try {
        const response = await fetch(`${apiBaseUrl}weather?q=${city}&units=${currentUnit}&appid=${apiKey}`);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();

        // Also fetch forecast
        const { lat, lon } = data.coord;
        fetchForecast(lat, lon);

        updateCurrentWeather(data);
        hideError();
        lastCity = city;
    } catch (error) {
        showError(error.message);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`${apiBaseUrl}weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`);
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();

        fetchForecast(lat, lon);
        updateCurrentWeather(data);
        hideError();
    } catch (error) {
        showError(error.message);
    }
}

async function fetchForecast(lat, lon) {
    try {
        // Using the 5-day / 3-hour forecast endpont (free tier)
        const response = await fetch(`${apiBaseUrl}forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`);
        const data = await response.json();

        updateForecast(data.list);
    } catch (error) {
        console.error('Forecast error', error);
    }
}

function updateCurrentWeather(data) {
    cityNameEl.innerText = `${data.name}, ${data.sys.country}`;
    currentDateEl.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    currentTempEl.innerText = Math.round(data.main.temp);

    // Description & Icon
    const weather = data.weather[0];
    weatherDescEl.innerText = weather.description;
    weatherIconEl.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
    weatherIconEl.classList.remove('hidden');

    // Details/Details
    humidityEl.innerText = `${data.main.humidity}%`;
    windSpeedEl.innerText = `${data.wind.speed} ${currentUnit === 'metric' ? 'km/h' : 'mph'}`;
    pressureEl.innerText = `${data.main.pressure} hPa`;
    visibilityEl.innerText = `${(data.visibility / 1000).toFixed(1)} km`;

    // Sun
    sunriseEl.innerText = formatTime(data.sys.sunrise, data.timezone);
    sunsetEl.innerText = formatTime(data.sys.sunset, data.timezone);

    updateBackground(weather.main, data.sys.sunset, data.sys.sunrise, data.timezone);
}

function updateForecast(forecastList) {
    forecastContainer.innerHTML = '';

    // The API returns 3-hour intervals. We want daily.
    // We'll pick one entry per day (e.g., closest to noon)
    const dailyData = {};

    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = [];
        }
        dailyData[date].push(item);
    });

    // Take the next 7 days (or however many available, usually 5 for free tier)
    const dates = Object.keys(dailyData).slice(0, 7);

    dates.forEach(dateStr => {
        const dayItems = dailyData[dateStr];
        // Find min and max temp for the day
        let min = 1000;
        let max = -1000;
        let icon = '';
        let desc = '';

        // Let's pick the icon from the item closest to 12:00 PM
        let midDayItem = dayItems[Math.floor(dayItems.length / 2)];

        dayItems.forEach(item => {
            if (item.main.temp_min < min) min = item.main.temp_min;
            if (item.main.temp_max > max) max = item.main.temp_max;
        });

        const dayName = new Date(midDayItem.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">
                <img src="https://openweathermap.org/img/wn/${midDayItem.weather[0].icon}.png" alt="icon">
                <span>${Math.round(midDayItem.pop * 100)}% Rain</span>
            </div>
            <div class="forecast-temps">
                <span class="max-temp">${Math.round(max)}°</span>
                <span class="min-temp">${Math.round(min)}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

function updateBackground(weatherMain, sunset, sunrise, timezoneOffset) {
    const body = document.body;
    body.className = ''; // clear previous classes

    // Check if it's night
    // Javascript timestamps are ms, API are seconds. Timezone offset is seconds.
    // Calculate local time of the city
    const nowUTC = Math.floor(Date.now() / 1000);
    // Simple check: if now > sunset OR now < sunrise (adjusting for next day sunrise if needed is complex, 
    // but simple check against today's sunrise/sunset is usually enough for a quick app)
    // A better way is to see if the icon string contains 'n' (night) vs 'd' (day)

    // Actually, let's use the weather condition first.
    const lowerWeather = weatherMain.toLowerCase();

    switch (true) {
        case lowerWeather.includes('cloud'):
            body.classList.add('clouds');
            break;
        case lowerWeather.includes('rain'):
            body.classList.add('rain');
            break;
        case lowerWeather.includes('drizzle'):
            body.classList.add('drizzle');
            break;
        case lowerWeather.includes('thunder'):
            body.classList.add('thunderstorm');
            break;
        case lowerWeather.includes('snow'):
            body.classList.add('snow');
            break;
        case lowerWeather.includes('clear'):
            body.classList.add('clear');
            break;
        default:
            body.classList.add('clear');
    }

    // Check for night time to override or darken
    // OWM icons end in 'd' for day and 'n' for night.
    // We can fetch the current icon from DOM or store it.
    // But let's use the timestamp logic or just add a 'night' class if it is late.

    if (nowUTC > sunset || nowUTC < sunrise) {
        body.classList.add('night');
    }
}

function formatTime(timestamp, timezoneOffset) {
    // timestamp is UTC seconds. timezoneOffset is seconds.
    // Create a date object shifted by the timezone offset
    // We treat this shifted time as if it were UTC to extract the correct local components
    const date = new Date((timestamp + timezoneOffset) * 1000);

    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function showError(msg) {
    errorMessage.classList.remove('hidden');
    errorText.innerText = msg;
    setTimeout(() => {
        hideError();
    }, 3000);
}

function hideError() {
    errorMessage.classList.add('hidden');
}

window.addEventListener('appinstalled', () => {
    showError('App installed successfully!');
    errorMessage.style.background = 'rgba(75, 181, 67, 0.9)'; // Green for success
    setTimeout(() => {
        errorMessage.style.background = ''; // Reset
    }, 3000);
});
