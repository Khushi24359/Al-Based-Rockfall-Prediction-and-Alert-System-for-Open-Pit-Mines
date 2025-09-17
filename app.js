const API_BASE = "http://127.0.0.1:5000";

// Chart Initialization
const ctx = document.getElementById('riskChart').getContext('2d');
const riskChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Risk Probability (%)',
      data: [],
      borderColor: '#e74c3c',
      backgroundColor: 'rgba(231,76,60,0.2)',
      tension: 0.4,
      fill: true,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: true, labels: { color: '#2c3e50' } } },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#2c3e50' } },
      x: { ticks: { color: '#2c3e50' } }
    }
  }
});

// Track previous alerts for popup notification
let previousAlertCount = 0;

// Update dashboard values
async function updateDashboard() {
  try {
    const response = await fetch(`${API_BASE}/api/risk`);
    const data = await response.json();

    document.getElementById('rainfall').textContent = `Rainfall: ${data.rainfall} mm`;
    document.getElementById('temperature').textContent = `Temp: ${data.temperature}°C`;
    document.getElementById('slope').textContent = `Angle: ${data.slope}°`;
    document.getElementById('vibration').textContent = `Vibration: ${data.vibration}`;
    document.getElementById('location').textContent = `📍 Location: ${data.location.title} (${data.location.lat.toFixed(3)}, ${data.location.lon.toFixed(3)})`;

    const predictionStatus = document.getElementById('prediction-status');
    if (data.status === "High Risk") {
      predictionStatus.textContent = "⚠️ High Risk";
      predictionStatus.style.color = "#e74c3c";
    } else if (data.status === "Moderate Risk") {
      predictionStatus.textContent = "⚠️ Moderate Risk";
      predictionStatus.style.color = "#f39c12";
    } else {
      predictionStatus.textContent = "✅ Low Risk";
      predictionStatus.style.color = "#27ae60";
    }

    document.getElementById('last-update').textContent =
      new Date(data.last_update).toLocaleString();

    // Update chart
    const now = new Date().toLocaleTimeString();
    riskChart.data.labels.push(now);
    riskChart.data.datasets[0].data.push(data.risk_score);
    if (riskChart.data.labels.length > 7) {
      riskChart.data.labels.shift();
      riskChart.data.datasets[0].data.shift();
    }
    riskChart.update();

  } catch (err) {
    console.error("Error fetching risk data:", err);
    const predictionStatus = document.getElementById('prediction-status');
    predictionStatus.textContent = "❌ Backend Offline";
    predictionStatus.style.color = "#999";
  }
}

// Load alerts and show popup if new
async function loadAlerts() {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    const data = await res.json();
    const alertsDiv = document.getElementById("alerts-list");

    if (!data.alerts || data.alerts.length === 0) {
      alertsDiv.innerHTML = "<p>No alerts yet</p>";
      previousAlertCount = 0;
      return;
    }

    // Show popup for new alerts
    if (data.alerts.length > previousAlertCount) {
      const newAlerts = data.alerts.slice(previousAlertCount);
      newAlerts.forEach(a => {
        if (!a.acknowledged) {
          showPopup(`🚨 New Alert: ${a.message}`);
        }
      });
      previousAlertCount = data.alerts.length;
    }

    // Build alert list
    let html = "";
    data.alerts.forEach(a => {
      html += `
        <div style="padding:0.5rem; border-bottom:1px solid #eee;">
          <b>${a.message}</b><br>
          <small>${new Date(a.created_at).toLocaleString()}</small><br>
          <span style="color:${a.acknowledged ? '#27ae60' : '#e74c3c'};">
            ${a.acknowledged ? "✅ Acknowledged" : "❗ Pending"}
          </span>
          ${!a.acknowledged ? `<button onclick="ackAlert(${a.id})" class="btn-ack">Ack</button>` : ""}
        </div>`;
    });
    alertsDiv.innerHTML = html;

  } catch (err) {
    console.error("Error fetching alerts:", err);
  }
}

// Manual alert trigger
async function triggerManualAlert() {
  try {
    await fetch(`${API_BASE}/api/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "🚨 Manual Rockfall Alert Triggered" })
    });
    loadAlerts();
    updateDashboard();
  } catch (err) {
    console.error("Error triggering alert:", err);
  }
}

// Acknowledge alert
async function ackAlert(id) {
  try {
    await fetch(`${API_BASE}/api/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    });
    loadAlerts();
  } catch (err) {
    console.error("Error acknowledging alert:", err);
  }
}

// Custom popup function
function showPopup(message, color="#e74c3c") {
  const popup = document.getElementById("popup");
  popup.textContent = message;
  popup.style.background = color;
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 3500); // auto hide after 3.5s
}

// Initial load + auto refresh
updateDashboard();
loadAlerts();
setInterval(updateDashboard, 5000);
setInterval(loadAlerts, 8000);
