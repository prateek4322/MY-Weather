let map, marker, hourlyChart;

// Map
function showMap(lat, lon, cityName){
  if(!map){ map=L.map("map").setView([lat,lon],8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{ attribution:"© OpenStreetMap" }).addTo(map);
  } else { map.setView([lat,lon],8); }
  if(marker) marker.remove();
  marker=L.marker([lat,lon]).addTo(map).bindPopup(`<b>${cityName}</b>`).openPopup();
}

// Weather icons
function getWeatherIcon(code){
  const map = {0:"☀️",1:"🌤",2:"⛅",3:"☁️",45:"🌫",48:"🌫",51:"🌦",61:"🌧",71:"❄️",80:"🌧",95:"⛈"};
  return map[code]||"🌈";
}

// Dynamic background
function setDynamicBackground(code){
  const bg=document.getElementById("background");
  bg.className="background"; bg.innerHTML="";
  if([0,1].includes(code)) bg.classList.add("sunny");
  else if([2,3].includes(code)) bg.classList.add("cloudy");
  else if([61,63,65,80,81].includes(code)) bg.classList.add("rainy");
  else if([71,73,75].includes(code)) bg.classList.add("snowy");
  else bg.classList.add("sunny");
}

// Coordinates
async function getCoordinates(city){
  const geoUrl=`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=5`;
  const res=await fetch(geoUrl); const data=await res.json();
  if(data.results && data.results.length>0) return data.results[0];
  else throw new Error("City not found");
}

// Update weather
async function updateWeather(lat, lon, name){
  // Current + 5-day
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=auto`;
  const res=await fetch(url); const data=await res.json();
  const current=data.current_weather;

  document.getElementById("weather-icon").textContent=getWeatherIcon(current.weathercode);
  document.getElementById("temperature").textContent=current.temperature+"°C";
  document.getElementById("city-name").textContent=name;
  document.getElementById("description").textContent="Current Weather";
  document.getElementById("extra-info").textContent=`💨 ${current.windspeed} km/h`;

  // 5-day forecast
  const forecastDiv=document.getElementById("forecast"); forecastDiv.innerHTML="";
  for(let i=0;i<data.daily.time.length;i++){
    const rain = data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[i]+"%" : "N/A";
    forecastDiv.innerHTML+=`
      <div class="forecast-card">
        <h4>${data.daily.time[i]}</h4>
        <p>${getWeatherIcon(data.daily.weathercode[i])}</p>
        <p>Max:${data.daily.temperature_2m_max[i]}°C</p>
        <p>Min:${data.daily.temperature_2m_min[i]}°C</p>
        <p>Rain: ${rain}</p>
      </div>`;
  }

  // Hourly chart
  const hourlyUrl=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=auto`;
  const hourlyRes=await fetch(hourlyUrl); const hourlyData=await hourlyRes.json();
  const hours=hourlyData.hourly.time.slice(0,24).map(t=>t.split("T")[1]);
  const temps=hourlyData.hourly.temperature_2m.slice(0,24);

  const ctx=document.getElementById("hourlyChart").getContext("2d");
  if(hourlyChart) hourlyChart.destroy();
  hourlyChart=new Chart(ctx,{
    type:'line',
    data:{ labels:hours, datasets:[{label:'Temp (°C)', data:temps, borderColor:'#ffd166', backgroundColor:'rgba(255,209,102,0.2)', tension:0.3, fill:true, pointRadius:3 }]},
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false}, x:{ticks:{color:'white'}}}}
  });

  setDynamicBackground(current.weathercode);
  showMap(lat,lon,name);
}

// Search
async function getWeather(){
  const city=document.getElementById("city").value.trim();
  if(!city) return alert("Enter a city!");
  try{ 
    const location=await getCoordinates(city);
    updateWeather(location.latitude, location.longitude, `${location.name}, ${location.country}`);
  }catch(err){ alert(err.message);}
}

// Location
function getLocationWeather(){
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      updateWeather(pos.coords.latitude,pos.coords.longitude,"Your Location");
    });
  } else alert("Geolocation not supported!");
}

// Relative search suggestions
async function showSuggestions(query){
  const suggestionsList=document.getElementById("suggestions");
  suggestionsList.innerHTML="";
  if(query.length<2) return;
  try{
    const res=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5`);
    const data=await res.json();
    if(data.results){
      data.results.forEach(city=>{
        const li=document.createElement("li");
        li.textContent=`${city.name}, ${city.country}`;
        li.onclick=()=>{
          document.getElementById("city").value=city.name;
          suggestionsList.innerHTML="";
          updateWeather(city.latitude, city.longitude, `${city.name}, ${city.country}`);
        }
        suggestionsList.appendChild(li);
      });
    }
  }catch(err){ console.log(err);}
}

// Random location on load
const cities = [
  {name:"New York, USA", lat:40.7128, lon:-74.0060},
  {name:"London, UK", lat:51.5074, lon:-0.1278},
  {name:"Tokyo, Japan", lat:35.6895, lon:139.6917},
  {name:"Sydney, Australia", lat:-33.8688, lon:151.2093},
  {name:"Paris, France", lat:48.8566, lon:2.3522},
  {name:"Delhi, India", lat:28.6139, lon:77.2090},
];

window.onload = () => {
  const randomCity = cities[Math.floor(Math.random()*cities.length)];
  updateWeather(randomCity.lat, randomCity.lon, randomCity.name);
};
