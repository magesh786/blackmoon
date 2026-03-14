/* =========================
   API URLs
========================= */

const ESP_IP = "10.252.36.168";
const sensorAPI = `http://${ESP_IP}/data`;
const mlAPI = "http://127.0.0.1:5000/predict";

// Track connection status
let espConnected = false;
let aiConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/* =========================
   INITIALIZATION
========================= */

document.addEventListener('DOMContentLoaded', function() {
    // Request notification permission
    if ("Notification" in window) {
        Notification.requestPermission();
    }
    
    // Test connections on load
    setTimeout(testConnections, 1000);
    
    // Load initial data
    loadSensorData();
    
    // Update connection status every 30 seconds
    setInterval(testConnections, 30000);
});

/* =========================
   CONNECTION TESTING
========================= */

async function testConnections() {
    console.log("Testing connections...");
    
    // Test ESP32 connection
    try {
        let res = await fetch(sensorAPI, { method: 'HEAD', timeout: 3000 });
        espConnected = res.ok;
        updateESPStatus(espConnected);
    } catch(err) {
        espConnected = false;
        updateESPStatus(false);
    }
    
    // Test AI Model connection
    try {
        let res = await fetch(mlAPI, { 
            method: 'OPTIONS',
            timeout: 3000 
        });
        aiConnected = true;
        updateAIStatus(true);
    } catch(err) {
        // Try simple GET request
        try {
            let res = await fetch(mlAPI, { timeout: 3000 });
            aiConnected = res.ok;
        } catch(err2) {
            aiConnected = false;
        }
        updateAIStatus(aiConnected);
    }
    
    return { espConnected, aiConnected };
}

function updateESPStatus(connected) {
    const statusEl = document.getElementById('espStatus');
    if (statusEl) {
        statusEl.className = connected ? 'status-badge connected' : 'status-badge disconnected';
        statusEl.textContent = connected ? 'Connected' : 'Disconnected';
    }
}

function updateAIStatus(connected) {
    const statusEl = document.getElementById('aiStatus');
    if (statusEl) {
        statusEl.className = connected ? 'status-badge connected' : 'status-badge disconnected';
        statusEl.textContent = connected ? 'Connected' : 'Disconnected';
    }
}

/* =========================
   REQUEST NOTIFICATION
========================= */

if ("Notification" in window) {
    Notification.requestPermission();
}


/* =========================
   POLLUTION ALERT
========================= */

function sendPollutionAlert(message){

if(Notification.permission === "granted"){

new Notification("Climate Health Alert",{
body: message,
icon: 'https://cdn-icons-png.flaticon.com/512/2936/2936617.png'
});

}

}


/* =========================
   GRAPH SETUP
========================= */

const ctx = document.getElementById("chart").getContext("2d");

let climateChart = new Chart(ctx,{
type:'line',
data:{
labels:[],
datasets:[

{
label:'Temperature (°C)',
data:[],
borderColor:'#f72585',
backgroundColor:'rgba(247, 37, 133, 0.1)',
tension:0.4,
fill:true,
borderWidth:2,
pointBackgroundColor:'#f72585'
},

{
label:'Humidity (%)',
data:[],
borderColor:'#4361ee',
backgroundColor:'rgba(67, 97, 238, 0.1)',
tension:0.4,
fill:true,
borderWidth:2,
pointBackgroundColor:'#4361ee'
},

{
label:'Air Quality',
data:[],
borderColor:'#4cc9f0',
backgroundColor:'rgba(76, 201, 240, 0.1)',
tension:0.4,
fill:true,
borderWidth:2,
pointBackgroundColor:'#4cc9f0'
}

]
},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
labels:{
usePointStyle:true,
font:{
size:12
}
}
}
},
scales:{
y:{
beginAtZero:true,
grid:{
color:'rgba(0,0,0,0.05)'
}
}
},
animation:{
duration:1000
}
}
});


/* =========================
   LOAD SENSOR DATA FROM ESP32
========================= */

async function loadSensorData(){

try{

console.log("Fetching data from ESP32 at 10.252.36.168...");

// Try multiple possible endpoints
let endpoints = [
    sensorAPI,
    `http://${ESP_IP}/sensor`,
    `http://${ESP_IP}/status`,
    `http://${ESP_IP}/api/sensor`,
    `http://${ESP_IP}/json`
];

let data = null;

// Try each endpoint until one works
for(let endpoint of endpoints) {
    try {
        let res = await fetch(endpoint, { timeout: 2000 });
        if(res.ok) {
            // Try to parse response
            const contentType = res.headers.get("content-type");
            if(contentType && contentType.includes("application/json")){
                data = await res.json();
            } else {
                const text = await res.text();
                // Try to parse as JSON if it looks like JSON
                if(text.trim().startsWith('{') || text.trim().startsWith('[')){
                    data = JSON.parse(text);
                } else {
                    // Parse CSV format (temp,hum,air)
                    const parts = text.split(',');
                    if(parts.length >= 3){
                        data = {
                            temp: parseFloat(parts[0]),
                            hum: parseFloat(parts[1]),
                            air: parseFloat(parts[2])
                        };
                    }
                }
            }
            if(data) break;
        }
    } catch(e) {
        console.log(`Endpoint ${endpoint} failed:`, e.message);
    }
}

if(!data) {
    throw new Error("Could not get data from ESP32");
}

console.log("ESP32 Data received:", data);

// Update connection status
espConnected = true;
updateESPStatus(true);

/* EXTRACT VALUES - Handle different key names */
let tempValue, humValue, airValue;

// Temperature
if(data.temp !== undefined) tempValue = data.temp;
else if(data.temperature !== undefined) tempValue = data.temperature;
else if(data.Temperature !== undefined) tempValue = data.Temperature;
else if(data.t !== undefined) tempValue = data.t;
else tempValue = 25;

// Humidity
if(data.hum !== undefined) humValue = data.hum;
else if(data.humidity !== undefined) humValue = data.humidity;
else if(data.Humidity !== undefined) humValue = data.Humidity;
else if(data.h !== undefined) humValue = data.h;
else humValue = 50;

// Air Quality
if(data.air !== undefined) airValue = data.air;
else if(data.airQuality !== undefined) airValue = data.airQuality;
else if(data.AirQuality !== undefined) airValue = data.AirQuality;
else if(data.aqi !== undefined) airValue = data.aqi;
else if(data.AQI !== undefined) airValue = data.AQI;
else if(data.mq135 !== undefined) airValue = data.mq135;
else airValue = 100;

// Ensure numbers
tempValue = parseFloat(tempValue) || 0;
humValue = parseFloat(humValue) || 0;
airValue = parseFloat(airValue) || 0;

console.log(`Values - Temp: ${tempValue}°C, Hum: ${humValue}%, Air: ${airValue}`);

/* UPDATE DASHBOARD */
document.getElementById("temp").innerText = tempValue.toFixed(1);
document.getElementById("hum").innerText = humValue.toFixed(1);
document.getElementById("air").innerText = Math.round(airValue);

/* UPDATE PROGRESS BARS */
updateProgressBars(tempValue, humValue, airValue);

/* UPDATE AQI MARKER */
updateAQIMarker(airValue);

/* UPDATE AQI COLOR */
updateAQIColor(airValue);

/* POLLUTION ALERT */
if(airValue > 200){
sendPollutionAlert(
"⚠️ High pollution detected! Wear mask and stay indoors."
);
} else if(airValue > 150){
sendPollutionAlert(
"😷 Moderate pollution. Sensitive individuals should wear mask."
);
}

/* UPDATE GRAPH */
let time = new Date().toLocaleTimeString();

climateChart.data.labels.push(time);
climateChart.data.datasets[0].data.push(tempValue);
climateChart.data.datasets[1].data.push(humValue);
climateChart.data.datasets[2].data.push(airValue);

if(climateChart.data.labels.length > 20){
climateChart.data.labels.shift();
climateChart.data.datasets[0].data.shift();
climateChart.data.datasets[1].data.shift();
climateChart.data.datasets[2].data.shift();
}

climateChart.update();

/* UPDATE LAST SEEN */
document.getElementById("lastSeen").innerText = new Date().toLocaleTimeString();

// Trigger AI recommendation update if form is filled
if(document.getElementById("name").value) {
    updateAIRecommendation();
}

}catch(err){
console.log("ESP32 connection error:", err);
espConnected = false;
updateESPStatus(false);

// Show -- on dashboard
document.getElementById("temp").innerText = "--";
document.getElementById("hum").innerText = "--";
document.getElementById("air").innerText = "--";
}

}

// Helper function to update progress bars
function updateProgressBars(temp, hum, air) {
const tempProgress = document.getElementById('tempProgress');
if(tempProgress) {
tempProgress.style.width = Math.min((temp / 50) * 100, 100) + '%';
}

const humProgress = document.getElementById('humProgress');
if(humProgress) {
humProgress.style.width = Math.min(hum, 100) + '%';
}

const airProgress = document.getElementById('airProgress');
if(airProgress) {
airProgress.style.width = Math.min((air / 500) * 100, 100) + '%';
}
}

// Helper function to update AQI marker
function updateAQIMarker(air) {
const marker = document.getElementById('aqiMarker');
if(marker) {
let position = Math.min((air / 500) * 100, 100);
marker.style.left = position + '%';
}
}

// Helper function to update AQI color
function updateAQIColor(air) {
const airElement = document.getElementById('air');
if(airElement) {
if(air <= 50) airElement.style.color = '#00e400';
else if(air <= 100) airElement.style.color = '#ffff00';
else if(air <= 150) airElement.style.color = '#ff7e00';
else if(air <= 200) airElement.style.color = '#ff0000';
else if(air <= 300) airElement.style.color = '#8f3f97';
else airElement.style.color = '#7e0023';
}
}

// Start loading data
setInterval(loadSensorData, 3000);
loadSensorData();


/* =========================
   AI DIET RECOMMENDATION
========================= */

document.getElementById("userForm").addEventListener("submit", async function(e){

e.preventDefault();
await updateAIRecommendation();

});

async function updateAIRecommendation() {

let name = document.getElementById("name").value;
let age = parseInt(document.getElementById("age").value) || 30;
let diseaseText = document.getElementById("disease").value;

// Map disease to numeric value expected by AI model
let disease = 0;
if(diseaseText === "asthma") disease = 1;
if(diseaseText === "chronic") disease = 2;
if(diseaseText === "heart") disease = 3;
if(diseaseText === "allergy") disease = 4;

let temp = parseFloat(document.getElementById("temp").innerText) || 25;
let hum = parseFloat(document.getElementById("hum").innerText) || 50;
let air = parseFloat(document.getElementById("air").innerText) || 100;

// Show loading state
const adviceEl = document.getElementById("dietAdvice");
adviceEl.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> AI is analyzing your health data...';
adviceEl.classList.add('ai-thinking');

/* SEND DATA TO ML MODEL AT 127.0.0.1:5000 */

let payload = {
temp: temp,
humidity: hum,
air_quality: air,
age: age,
disease_type: disease,
name: name,
timestamp: new Date().toISOString()
};

console.log("Sending to AI Model at 127.0.0.1:5000:", payload);

try{

let res = await fetch(mlAPI, {
method:"POST",
headers:{
"Content-Type":"application/json",
"Accept":"application/json"
},
body: JSON.stringify(payload),
timeout: 5000
});

if(!res.ok){
throw new Error(`AI Model error: ${res.status}`);
}

let result = await res.json();
console.log("AI Model Response:", result);

// Update AI status
aiConnected = true;
updateAIStatus(true);

// Parse AI response
let dietPlan = "";
let healthAdvice = "";

// Handle different response formats
if(result.food) {
    dietPlan = result.food;
} else if(result.recommendation) {
    dietPlan = result.recommendation;
} else if(result.diet) {
    dietPlan = result.diet;
} else if(result.message) {
    dietPlan = result.message;
} else {
    dietPlan = getRuleBasedRecommendation(temp, hum, air, diseaseText);
}

if(result.advice) {
    healthAdvice = result.advice;
}

// Display AI recommendation
adviceEl.innerHTML = `
    <div class="ai-recommendation">
        <div class="ai-header">
            <i class="fas fa-brain"></i>
            <strong>AI Analysis Complete</strong>
        </div>
        <div class="ai-diet">${dietPlan}</div>
        ${healthAdvice ? `<div class="ai-advice">${healthAdvice}</div>` : ''}
        <div class="ai-footer">
            <i class="fas fa-check-circle"></i> Based on real-time sensor data
        </div>
    </div>
`;

} catch(err) {

console.log("AI Model error:", err);
aiConnected = false;
updateAIStatus(false);

// Use rule-based fallback
let fallbackAdvice = getRuleBasedRecommendation(temp, hum, air, diseaseText);

adviceEl.innerHTML = `
    <div class="warning-message">
        <i class="fas fa-exclamation-triangle"></i>
        AI Model at 127.0.0.1:5000 not responding.
    </div>
    <div class="fallback-advice">
        ${fallbackAdvice}
    </div>
`;

}

adviceEl.classList.remove('ai-thinking');
}

// Rule-based fallback when AI is unavailable
function getRuleBasedRecommendation(temp, hum, air, disease) {

let advice = "🌿 RECOMMENDED DIET:\n\n";

// Temperature based
if(temp > 35) {
advice += "🔥 Heat Alert: Eat light meals\n";
advice += "🥥 Drink coconut water, buttermilk\n";
advice += "🍉 Eat watermelon, cucumber\n";
} else if(temp < 15) {
advice += "❄️ Cold Weather: Eat warm soups\n";
advice += "☕ Drink herbal teas\n";
advice += "🥜 Include nuts and dry fruits\n";
} else {
advice += "✅ Normal: Balanced diet with fruits\n";
}

// Air quality based
if(air > 200) {
advice += "\n😷 HIGH POLLUTION:\n";
advice += "🥦 Eat broccoli, garlic\n";
advice += "🍊 Take Vitamin C foods\n";
advice += "🥛 Drink turmeric milk\n";
} else if(air > 150) {
advice += "\n⚠️ Moderate Pollution:\n";
advice += "🍎 Eat apples, berries\n";
advice += "🍵 Drink green tea\n";
}

// Disease specific
if(disease === "asthma" || disease === "chronic") {
advice += "\n🫁 For Respiratory Health:\n";
advice += "🥬 Eat ginger, turmeric\n";
advice += "🍯 Honey with warm water\n";
advice += "🚫 Avoid cold foods\n";
}

if(disease === "heart") {
advice += "\n❤️ For Heart Health:\n";
advice += "🥑 Eat avocados, nuts\n";
advice += "🐟 Include omega-3 foods\n";
advice += "🧂 Reduce salt intake\n";
}

advice += "\n💧 Drink 8-10 glasses of water daily";
advice += "\n🥗 Eat seasonal fruits and vegetables";

return advice;
}


/* =========================
   PDF HEALTH REPORT
========================= */

function generatePDF(){

const { jsPDF } = window.jspdf;

let doc = new jsPDF();

let name = document.getElementById("name").value || "Not provided";
let age = document.getElementById("age").value || "Not provided";
let gender = document.getElementById("gender").value || "Not provided";
let disease = document.getElementById("disease").value || "None";

let temp = document.getElementById("temp").innerText;
let hum = document.getElementById("hum").innerText;
let air = document.getElementById("air").innerText;

let advice = document.getElementById("dietAdvice").innerText;

// Add title
doc.setFontSize(24);
doc.setTextColor(67, 97, 238);
doc.text("Climate Health Report", 20, 20);

// Add date and time
doc.setFontSize(10);
doc.setTextColor(100, 100, 100);
doc.text("Generated: " + new Date().toLocaleString(), 20, 30);

// Add connection info
doc.setFontSize(8);
doc.setTextColor(150, 150, 150);
doc.text("ESP32: 10.252.36.168 | AI Model: 127.0.0.1:5000", 20, 37);

// Add personal info
doc.setFontSize(14);
doc.setTextColor(0, 0, 0);
doc.text("Personal Information", 20, 50);

doc.setFontSize(12);
doc.text("Name: " + name, 20, 60);
doc.text("Age: " + age, 20, 68);
doc.text("Gender: " + gender, 20, 76);
doc.text("Health Condition: " + disease, 20, 84);

// Add environmental data
doc.setFontSize(14);
doc.text("Environmental Readings", 20, 100);

doc.setFontSize(12);
doc.text("Temperature: " + temp + " °C", 20, 110);
doc.text("Humidity: " + hum + " %", 20, 118);
doc.text("Air Quality: " + air + " AQI", 20, 126);

// Add recommendations
doc.setFontSize(14);
doc.text("Health Recommendations", 20, 144);

doc.setFontSize(10);
let lines = doc.splitTextToSize(advice, 170);
doc.text(lines, 20, 154);

// Add footer
doc.setFontSize(8);
doc.setTextColor(150, 150, 150);
doc.text("Smart Climate Health Monitoring System", 20, 280);
doc.text("Live data from ESP32 • AI-powered recommendations", 20, 285);

doc.save("health_report.pdf");

}


/* =========================
   AWARENESS GUIDE
========================= */

function downloadAwareness(){

const { jsPDF } = window.jspdf;

let doc = new jsPDF();

// Title
doc.setFontSize(28);
doc.setTextColor(67, 97, 238);
doc.text("Climate Health", 20, 20);
doc.text("Awareness Guide", 20, 35);

// Subtitle
doc.setFontSize(12);
doc.setTextColor(100, 100, 100);
doc.text("Stay Safe & Healthy in Changing Climate", 20, 50);

// Tips
let tips = [
"😷 WEAR MASK in polluted areas and crowded places",
"💧 STAY HYDRATED - Drink 8-10 glasses of water daily",
"🧴 USE SUNSCREEN SPF 30+ during high temperature",
"🚫 ASTHMA PATIENTS avoid polluted environments",
"🥗 EAT FIBER-RICH foods like oats, fruits, vegetables",
"🏃 EXERCISE indoors when air quality is poor",
"💊 TAKE VITAMIN C to boost immunity",
"🏠 STAY INDOORS during extreme weather alerts",
"🌿 USE AIR PURIFIER in high pollution areas",
"🧥 DRESS APPROPRIATELY according to temperature",
"💨 CHECK AIR QUALITY before outdoor activities",
"🫁 PRACTICE DEEP BREATHING exercises regularly",
"🍵 DRINK HERBAL TEAS for respiratory health",
"🫐 EAT ANTIOXIDANT rich foods like berries",
"🚭 AVOID SMOKE and harmful fumes"
];

doc.setFontSize(11);
doc.setTextColor(0, 0, 0);

let y = 70;
tips.forEach(tip => {
doc.text(tip, 20, y);
y += 8;
});

// Emergency section
doc.setFontSize(16);
doc.setTextColor(247, 37, 133);
doc.text("Emergency Tips:", 20, y + 15);

doc.setFontSize(10);
doc.setTextColor(0)}
async function uploadPDF(){

let file = document.getElementById("pdfFile").files[0];

let formData = new FormData();
formData.append("file", file);

let res = await fetch("http://127.0.0.1:5000/analyze_pdf",{

method:"POST",
body: formData

});

let result = await res.json();

document.getElementById("dietAdvice").innerText =
"AI Diet Recommendation: " + result.diet;

document.getElementById("pdfResult").innerText =
"Detected Symptoms: " + result.symptoms;

}
let memberCount = 0;

function addMember(){

memberCount++;

let container = document.getElementById("familyMembers");

let html = `

<div class="member-card">

<h3>Patient ${memberCount}</h3>

<div class="form-grid">

<div class="form-group">
<label>Name</label>
<input type="text" class="name" placeholder="Patient Name">
</div>

<div class="form-group">
<label>Age</label>
<input type="number" class="age" placeholder="Age">
</div>

<div class="form-group">
<label>Gender</label>
<select class="gender">
<option>Male</option>
<option>Female</option>
<option>Other</option>
</select>
</div>

<div class="form-group">
<label>Disease</label>
<select class="disease">
<option value="none">Normal</option>
<option value="asthma">Asthma</option>
<option value="chronic">Chronic</option>
</select>
</div>

<div class="form-group">
<label>Doctor Prescription</label>
<input type="file" class="pdfFile" accept=".pdf">
</div>

</div>

<button onclick="savePatient(this)" class="save-btn">
<i class="fas fa-save"></i> Save Patient
</button>

</div>

`;

container.innerHTML += html;

}
function savePatient(btn){

let card = btn.parentElement;

let name = card.querySelector(".name").value;
let age = card.querySelector(".age").value;
let disease = card.querySelector(".disease").value;

let patientData = {

name:name,
age:age,
disease:disease

};

localStorage.setItem(name,JSON.stringify(patientData));

alert("Patient data saved");

}
function checkEmergency(air,temp){

let phone = document.getElementById("emergencyPhone").value;

if(air > 2000){

alert("Emergency: Dangerous pollution!");

sendAlert(phone);

}

if(temp > 40){

alert("Emergency: High temperature risk!");

sendAlert(phone);

}

}
async function sendAlert(phone){

await fetch("http://127.0.0.1:5000/send_alert",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

phone:phone,
message:"Emergency detected in Climate Health Monitoring System"

})

});

}
async function savePatient(){

let name = document.getElementById("name").value;
let age = document.getElementById("age").value;
let gender = document.getElementById("gender").value;
let disease = document.getElementById("disease").value;

let data = {

name: name,
age: age,
gender: gender,
disease: disease

};

let res = await fetch("http://127.0.0.1:5000/add_patient",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body: JSON.stringify(data)

});

let result = await res.json();

console.log(result);

alert("Patient added successfully");

}
function saveMember(btn){

let card = btn.parentElement.parentElement;

let name = card.querySelector(".memberName").value;
let age = card.querySelector(".memberAge").value;
let disease = card.querySelector(".memberDisease").value;

let data = {

name:name,
age:age,
disease:disease

};

localStorage.setItem(name, JSON.stringify(data));

alert("Family member saved");

}

