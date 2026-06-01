// sda 21 scl 22

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

const char* ssid = "BPSDM";
const char* password = "letsjumpfive";
const char* mqtt_server = "192.168.1.2";

WiFiClient espClient;
PubSubClient client(espClient);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

bool aht_ok = false;
bool bmp_ok = false;

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting MQTT...");

    String clientId = "ESP32_" + String(random(1000));

    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, state=");
      Serial.println(client.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(500);

  Serial.println("Init sensor...");

  aht_ok = aht.begin();
  Serial.println(aht_ok ? "AHT20 OK" : "AHT20 FAIL");

  delay(1000);

  bmp_ok = bmp.begin(0x77);
  Serial.println(bmp_ok ? "BMP280 OK" : "BMP280 FAIL");

  Serial.println("Connecting WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());

  delay(1000);

  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (!aht_ok || !bmp_ok) return;

  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);

  float temperature = temp.temperature;
  float hum = humidity.relative_humidity;
  float pressure = bmp.readPressure() / 100.0F;

  String payload = "{";
  payload += "\"temperature\":" + String(temperature) + ",";
  payload += "\"humidity\":" + String(hum) + ",";
  payload += "\"pressure\":" + String(pressure);
  payload += "}";

  client.publish("sensor/env", payload.c_str());

  Serial.println(payload);

  delay(5000);
}