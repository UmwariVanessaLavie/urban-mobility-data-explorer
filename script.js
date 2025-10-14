const loading = document.getElementById('loading');
const dashboard = document.getElementById('dashboard');
const fareValue = document.getElementById('fare-value');
const fareSlider = document.getElementById('fare-slider');
const applyBtn = document.getElementById('apply-filters');

fareSlider.addEventListener('input', () => {
  fareValue.textContent = '$' + fareSlider.value;
});

applyBtn.addEventListener('click', loadData);
setTimeout(loadData, 800);

let hourlyChart = null;
let fareChart = null;

async function loadData() {
  loading.classList.add('active');
  dashboard.classList.add('hidden');

  const start = document.getElementById('start-date').value;
  const end = document.getElementById('end-date').value;
  const minFare = fareSlider.value;

  try {
    const [stats, trips, zones] = await Promise.all([
      (await fetch(`http://localhost:5000/api/stats`)).json(),
      (await fetch(`http://localhost:5000/api/trips?start=${start}&end=${end}&min_fare=${minFare}&limit=5000`)).json(),
      (await fetch('http://localhost:5000/api/busiest-zones')).json()
    ]);

    // Update stats
    document.getElementById('total-trips').textContent = stats.total_trips.toLocaleString();
    document.getElementById('avg-speed').textContent = stats.avg_speed_kmh + ' km/h';
    document.getElementById('avg-fare').textContent = '$' + stats.avg_fare_per_km;

    // Charts
    const hours = Array(24).fill(0);
    trips.forEach(t => {
      const h = new Date(t.pickup_datetime).getHours();
      if (h >= 0 && h < 24) hours[h]++;
    });
    renderHourlyChart(hours);
    renderFareChart(trips.slice(0, 300));

    // Hotspots
    const grid = document.getElementById('hotspots-grid');
    grid.innerHTML = '';
    zones.slice(0, 6).forEach((z, i) => {
      const el = document.createElement('div');
      el.className = 'hotspot-item';
      el.innerHTML = `
        <div class="hotspot-rank">${i+1}</div>
        <div>${z.lat.toFixed(3)}</div>
        <div>${z.lon.toFixed(3)}</div>
        <div class="hotspot-count">${z.count}</div>
      `;
      grid.appendChild(el);
    });

    loading.classList.remove('active');
    dashboard.classList.remove('hidden');

  } catch (err) {
    loading.innerHTML = `<p style="color:#FFD700">⚠️ Start Flask backend on port 5000</p>`;
  }
}

function renderHourlyChart(data) {
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  if (hourlyChart) hourlyChart.destroy();
  hourlyChart = new Chart(ctx, {
    type: 'bar',
     { labels: data.map((_,i)=>i), datasets: [{  data, backgroundColor: 'rgba(0, 240, 255, 0.5)', borderColor: '#00f0ff', borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b0b0' } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b0b0', precision: 0 } } } }
  });
}

function renderFareChart(trips) {
  const ctx = document.getElementById('fareDistanceChart').getContext('2d');
  if (fareChart) fareChart.destroy();
  const data = trips.map(t => ({ x: t.trip_distance_km, y: t.fare_amount }));
  fareChart = new Chart(ctx, {
    type: 'scatter',
     { datasets: [{ data, backgroundColor: 'rgba(255, 215, 0, 0.6)' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Distance (km)', color: '#b0b0b0' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b0b0' } },
        y: { title: { display: true, text: 'Fare ($)', color: '#b0b0b0' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b0b0' } }
      }
    }
  });
}