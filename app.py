# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import random
import datetime
import os

app = Flask(__name__)
CORS(app)  # Allow requests from frontend

# Load your landslide dataset
CSV_FILE = os.path.join(os.path.dirname(__file__), "LandslideIncidences_Final sending.csv")
df = pd.read_csv(CSV_FILE)
print("Looking for CSV at:", CSV_FILE)
assert os.path.exists(CSV_FILE), "CSV file not found!"

# In-memory storage for alerts
alerts = []

@app.route("/api/risk", methods=["GET"])
def get_risk():
    # Pick a random row (simulate "latest landslide event")
    row = df.sample(1).iloc[0]

    # Generate a random risk score (10-100)
    risk_score = random.randint(10, 100)

    # Determine risk status
    status = "Low Risk"
    if risk_score > 70:
        status = "High Risk"
        # Avoid duplicate alerts for same location
        if not any(a.get("location_title") == row["Title"] for a in alerts if not a.get("acknowledged")):
            alerts.append({
                "id": len(alerts) + 1,
                "message": f"🚨 Landslide Risk near {row['Title']} ({row['latitude']:.3f},{row['longitude']:.3f})",
                "created_at": datetime.datetime.now().isoformat(),
                "acknowledged": False,
                "lat": row["latitude"],
                "lon": row["longitude"],
                "risk_score": risk_score,
                "location_title": row["Title"]
            })
    elif risk_score > 40:
        status = "Moderate Risk"

    data = {
        "rainfall": random.randint(50, 200),
        "temperature": random.randint(15, 30),
        "slope": random.randint(20, 45),
        "vibration": "Normal" if random.random() > 0.3 else "High",
        "risk_score": risk_score,
        "status": status,
        "last_update": datetime.datetime.now().isoformat(),
        "location": {"lat": row["latitude"], "lon": row["longitude"], "title": row["Title"]}
    }
    return jsonify(data)

@app.route("/api/alerts", methods=["GET", "POST"])
def manage_alerts():
    if request.method == "POST":
        body = request.get_json()
        alerts.append({
            "id": len(alerts) + 1,
            "message": body.get("message", "🚨 Manual Alert"),
            "created_at": datetime.datetime.now().isoformat(),
            "acknowledged": False,
            "lat": body.get("lat"),
            "lon": body.get("lon")
        })
        return jsonify({"success": True})
    return jsonify({"alerts": alerts})

@app.route("/api/ack", methods=["POST"])
def ack_alert():
    body = request.get_json()
    alert_id = body.get("id")
    for a in alerts:
        if a["id"] == alert_id:
            a["acknowledged"] = True
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)
