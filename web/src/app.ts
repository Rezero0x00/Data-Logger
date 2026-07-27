import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import mqtt from "mqtt"
import path from "path"
import fs from "fs"

const app = express()
const server = createServer(app)
const io = new Server(server)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))

interface SensorData {
  temperature: number
  humidity: number
  pressure: number
}

interface ReadingLog extends SensorData {
  time: string
}

let sensorData: SensorData = {
  temperature: 0,
  humidity: 0,
  pressure: 0,
}

// JSON Log configuration
const LOG_FILE = path.join(
  process.cwd(),
  "reading-log.json"
)

const MAX_LOG = 5
const ONE_HOUR = 60 * 60 * 1000;

// Read log file
function readLogs(): ReadingLog[] {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, "[]")
      return []
    }

    const data = fs.readFileSync(
      LOG_FILE,
      "utf-8"
    )

    if (!data.trim()) {
      return []
    }

    return JSON.parse(data)

  } catch (error) {

    console.error(
      "Error reading log file:",
      error
    )

    return []
  }

}
// Save Data Sensor
function saveLog(data: SensorData): void {

  const logs = readLogs()

  logs.push({
    time: new Date().toLocaleString(
      "id-ID"
    ),
    temperature: data.temperature,
    humidity: data.humidity,
    pressure: data.pressure
  })

  // Delete old data if the data is more than 5
  if (logs.length > MAX_LOG) {
    logs.shift()
  }

  fs.writeFileSync(
    LOG_FILE,
    JSON.stringify(logs, null, 2)
  )

  console.log(
    "Reading saved:",
    logs[logs.length - 1]
  )
}

// MQTT Configure
const client = mqtt.connect(
  "mqtt://192.168.5.216:1883"
)

client.on("connect", () => {
  console.log(
    "Connected to MQTT"
  )
  client.subscribe(
    "sensor/env"
  )
})

// Receive realtime data
client.on("message", (topic, message) => {
  const data = JSON.parse(
    message.toString()
  ) as SensorData

  sensorData.temperature = data.temperature
  sensorData.humidity = data.humidity
  sensorData.pressure = data.pressure

  console.log(
    "Realtime data:",
    sensorData
  )

  io.emit(
    "sensor-update",
    sensorData
  )

})

// Save data every 1 hour
setInterval(() => {
  saveLog(sensorData)
}, ONE_HOUR)

// Websocket
io.on("connection", (socket) => {

  console.log(
    "Browser connected"
  )
  socket.emit(
    "sensor-update",
    sensorData
  )
})
// API Routes

// Realtime sensor data
app.get("/api/data", (req, res) => {
  res.json(
    sensorData
  )
})

// Last 5 readings
app.get("/api/logs", (req, res) => {
  res.json(
    readLogs()
  )
})

// Export JSON
app.get("/api/export/json", (req, res) => {
  const logs = readLogs()
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=lab-data.json"
  )

  res.json({
    exported: new Date().toISOString(),
    total: logs.length,
    data: logs
  })
})

// Export CSV
app.get("/api/export/csv", (req, res) => {
  const logs = readLogs()
  let csv =
    "Time,Temperature,Humidity,Pressure\n"
  logs.forEach((item) => {
    csv +=
      `${item.time},${item.temperature},${item.humidity},${item.pressure}\n`
  })

  res.setHeader(
    "Content-Type",
    "text/csv"
  )

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=lab-data.csv"
  )

  res.send(csv)
})

app.get("/", (req, res) => {
  res.render("index")
})

server.listen(3000, () => {
  console.log(
    "Server running http://localhost:3000"
  )
})