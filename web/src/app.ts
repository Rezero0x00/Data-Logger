import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import mqtt from "mqtt"
import path from "path"

const app = express()
const server = createServer(app) 
const io = new Server(server)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))

let sensorData = {
  temperature: 0,
  humidity: 0,
  pressure: 0,
}

const client = mqtt.connect("mqtt://192.168.1.2:1883")
client.on("connect", () => {
  console.log("Connected to MQTT")
  client.subscribe("sensor/env")
})

client.on("message", (topic, message) => {
  const data = JSON.parse(message.toString())

  sensorData.temperature = data.temperature
  sensorData.humidity = data.humidity
  sensorData.pressure = data.pressure

  console.log("Data masuk:", sensorData)

  io.emit("sensor-update", sensorData)
})

io.on("connection", (socket) => {
  console.log("Browser connected")

  socket.emit("sensor-update", sensorData)
})

app.get('/api/data', (req, res) => {
  res.json(sensorData)
})

app.get('/', (req, res) => {
  res.render('index')
})

server.listen(3000, () => {
  console.log('Server running http://localhost:3000')
})
