const MAX = 30;
const history = [];

let chart;
let activeKey = "temperature";
let prev = {};

const COLORS = {
  temperature: "#ef4444",
  humidity: "#3b82f6",
  pressure: "#7c3aed"
};

function fmt(v) {
  return v != null ? (+v).toFixed(1) : "--";
}

function delta(cur, old, unit) {
  if (old == null) return "—";

  const d = cur - old;

  if (Math.abs(d) < 0.05) {
    return "→ stable";
  }

  return (d > 0 ? "↑ +" : "↓ ") +
    Math.abs(d).toFixed(1) + unit;
}

function getStats(key) {
  const values = history
    .map(d => d[key])
    .filter(v => v != null);

  if (!values.length) {
    return {
      min: "--",
      max: "--",
      avg: "--"
    };
  }

  return {
    min: Math.min(...values).toFixed(1),
    max: Math.max(...values).toFixed(1),
    avg: (
      values.reduce((a,b)=>a+b,0)
      / values.length
    ).toFixed(1)
  };
}

function getStatus(data) {

  if (
    data.temperature > 37.5 ||
    data.humidity >  85.0
  ) {
    return ["danger", "Alert"];
  }

  if (
    data.temperature > 40 ||
    data.humidity > 90
  ) {
    return ["warn", "Warning"];
  }

  return ["ok", "Normal"];
}


function statusBadge(type, label) {

  const cls = {
    ok:
      "bg-emerald-50 text-emerald-600",
    warn:
      "bg-amber-50 text-amber-600",
    danger:
      "bg-red-50 text-red-500"
  };

  return `
    <span class="
      text-xs px-2 py-0.5
      rounded-full font-medium
      ${cls[type]}
    ">
      ${label}
    </span>
  `;
}
// Chart
function initChart() {

  const ctx =
    document
    .getElementById("chart")
    .getContext("2d");


  chart = new Chart(ctx, {

    type: "line",

    data: {

      labels: [],

      datasets: [
        {
          data: [],
          borderColor:
            COLORS[activeKey],

          backgroundColor:
            COLORS[activeKey] + "15",

          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
          fill: true
        }
      ]

    },

    options: {

      responsive: true,
      maintainAspectRatio: false,

      animation: {
        duration: 200
      },


      plugins: {

        legend: {
          display: false
        },

        tooltip: {
          mode: "index",
          intersect: false
        }

      },

      scales: {

        x: {
          grid: {
            display: false
          }
        },


        y: {
          ticks: {
            maxTicksLimit: 4
          }
        }

      }

    }

  });

}

// Change chart

function switchTab(el, key) {

  document
    .querySelectorAll(".tab-btn")
    .forEach(btn => {

      btn.classList.remove(
        "bg-slate-800",
        "text-white",
        "border-slate-800"
      );


      btn.classList.add(
        "text-slate-500",
        "border-slate-200"
      );

    });

  el.classList.add(
    "bg-slate-800",
    "text-white",
    "border-slate-800"
  );

  el.classList.remove(
    "text-slate-500",
    "border-slate-200"
  );

  activeKey = key;

  const slice = history.slice(-MAX);

  chart.data.labels =
    slice.map(d => d.time);

  chart.data.datasets[0].data =
    slice.map(d => d[key]);

  chart.data.datasets[0].borderColor =
    COLORS[key];

  chart.data.datasets[0].backgroundColor =
    COLORS[key] + "15";

  chart.update();

}

// Realtime update
function update(data) {

  const now = new Date();

  data.time = now.toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );

  // Save chart
  history.push({
    ...data
  });

  // Limit 30 data of the chart
  if (history.length > MAX) {
    history.shift();
  }
  // Update card sensor
  document.getElementById("temp").textContent =
    fmt(data.temperature);

  document.getElementById("hum").textContent =
    fmt(data.humidity);

  document.getElementById("press").textContent =
    fmt(data.pressure);

  // Delta change
  document.getElementById("temp-delta").textContent =
    delta(data.temperature, prev.temperature, "°C");

  document.getElementById("hum-delta").textContent =
    delta(data.humidity, prev.humidity, "%");

  document.getElementById("press-delta").textContent =
    delta(data.pressure, prev.pressure, " hPa");

  // Statistik
  [
    "temperature",
    "humidity",
    "pressure"
  ].forEach((key, index) => {

    const ids = [
      "temp",
      "hum",
      "press"
    ];

    const stats = getStats(key);

    document.getElementById(ids[index] + "-min")
      .textContent = stats.min;


    document.getElementById(ids[index] + "-max")
      .textContent = stats.max;


    document.getElementById(ids[index] + "-avg")
      .textContent = stats.avg;

  });
  // Update chart
  chart.data.labels =
    history.map(item => item.time);

  chart.data.datasets[0].data =
    history.map(item => item[activeKey]);

  chart.update("none");

  // save historycal data 
  prev = {
    ...data
  };

}
// Load Reading Log from backend
async function loadLogs() {

  try {

    const response = await fetch("/api/logs");
    const logs = await response.json();
    const tbody = document.getElementById("log-body");

    tbody.innerHTML = "";

    logs
      .slice()
      .reverse()
      .forEach((data, index) => {

        const [statusClass, statusLabel] =
          getStatus(data);

        const row = document.createElement("tr");

        row.className =
          "border-t border-slate-100 hover:bg-slate-50";

        row.innerHTML = `
          <td class="px-4 py-2 text-slate-400">
            ${index + 1}
          </td>

          <td class="px-4 py-2 text-slate-600">
            ${data.time}
          </td>

          <td class="px-4 py-2 text-slate-600">
            ${fmt(data.temperature)}
          </td>

          <td class="px-4 py-2 text-slate-600">
            ${fmt(data.humidity)}
          </td>

          <td class="px-4 py-2 text-slate-600">
            ${fmt(data.pressure)}
          </td>

          <td class="px-4 py-2">
            ${statusBadge(
              statusClass,
              statusLabel
            )}
          </td>
        `;

        tbody.appendChild(row);
      });

    document.getElementById("row-count")
      .textContent =
      logs.length + " readings";

  } catch (error) {

    console.error(
      "Failed load logs:",
      error
    );

  }

}
// Export from backend
function saveCSV() {

  window.location.href =
    "/api/export/csv";
}

function saveJSON() {

  window.location.href =
    "/api/export/json";
}

// Initial setup

// activated first style tab 
document
  .querySelector(".tab-btn.active")
  .classList.add(
    "bg-slate-800",
    "text-white",
    "border-slate-800"
  );

document
  .querySelector(".tab-btn.active")
  .classList.remove(
    "text-slate-500",
    "border-slate-200"
  );

// create chart
initChart();

// load 5 latest data 
loadLogs();

// refresh log each  5 second
setInterval(
  loadLogs,
  5000
);

// Socket io
const socket = io();

socket.on(
  "sensor-update",
  update
);