// SDA 21, SCL 22

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

#define LED_PIN 2

const char* ssid = "BPSDM";
const char* password = "letsjumpfive";
const char* mqtt_server = "192.168.1.4";

WiFiClient espClient;
PubSubClient client(espClient);

Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

bool aht_ok = false;
bool bmp_ok = false;

void reconnect() {
  while (!client.connected()) {

    Serial.println("Connecting MQTT...");

    String clientId = "ESP32_" + String(random(1000));

    if (client.connect(clientId.c_str())) {
      Serial.println("MQTT Connected");
    } else {
      Serial.print("Failed, state=");
      Serial.println(client.state());
      delay(3000);
    }
  }
}

void setup() {

  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  delay(2000);

  Wire.begin(21, 22);
  Wire.setClock(100000);

  Serial.println("Initializing sensors...");

  aht_ok = aht.begin();
  Serial.println(aht_ok ? "AHT20 OK" : "AHT20 FAIL");

  bmp_ok = bmp.begin(0x77);
  Serial.println(bmp_ok ? "BMP280 OK" : "BMP280 FAIL");

  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, 1883);
}

void loop() {

  if (!client.connected()) {
    reconnect();
  }

  client.loop();

  if (!aht_ok || !bmp_ok) {
    delay(1000);
    return;
  }

// Sensor

  sensors_event_t humidity, temp;

  aht.getEvent(&humidity, &temp);

  float temperature = temp.temperature;
  float hum = humidity.relative_humidity;
  float pressure = bmp.readPressure() / 100.0F;

  int alarm = 0;

  if (    temperature > 37.5 ||
    hum > 85.0 ||
    pressure < 980.0 ||
    pressure > 1100.0
  ) {

    alarm = 1;
    digitalWrite(LED_PIN, HIGH);

  } else {

    alarm = 0;
    digitalWrite(LED_PIN, LOW);
  }

// Mqtt
  String payload = "{";
  payload += "\"temperature\":" + String(temperature, 2) + ",";
  payload += "\"humidity\":" + String(hum, 2) + ",";
  payload += "\"pressure\":" + String(pressure, 2) + ",";
  payload += "\"alarm\":" + String(alarm);
  payload += "}";

  client.publish("sensor/env", payload.c_str());

  Serial.print(temperature, 2);
  Serial.print(",");
  Serial.print(hum, 2);
  Serial.print(",");
  Serial.print(pressure, 2);
  Serial.print(",");
  Serial.println(alarm);

  int tempInt = (int)(temperature * 100);
  int humInt = (int)(hum * 100);
  int pressInt = (int)(pressure * 100);

  delay(500);
}