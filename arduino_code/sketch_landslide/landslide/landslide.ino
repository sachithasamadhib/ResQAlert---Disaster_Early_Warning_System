#include <WiFi.h>
#include <FirebaseESP32.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP085_U.h>
#include <MPU6050_light.h>
#include <SPI.h>
#include <SD.h>
#include <time.h>
#include "secrets.h"

#ifndef WIFI_SSID
#error "WIFI_SSID not defined. Create secrets.h from secrets_template.h."
#endif
#ifndef FIREBASE_HOST
#error "FIREBASE_HOST not defined. Add to secrets.h"
#endif
#ifndef FIREBASE_AUTH
#error "FIREBASE_AUTH not defined. Add to secrets.h"
#endif

// Sensor pins
#define TILT_SENSOR_PIN 13
#define SOIL_AO_PIN 34
#define SOIL_DO_PIN 35
#define RAIN_AO_PIN 39
#define RAIN_DO_PIN 36

// SPI pins for SD card (using HSPI)
#define SD_CS_PIN 32
#define SD_SCK_PIN 14
#define SD_MISO_PIN 12
#define SD_MOSI_PIN 27

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// MPU6050 object (Wire on SDA=18, SCL=19)
MPU6050 mpu(Wire);

// BMP180 object (Wire1 on SDA=21, SCL=22)
Adafruit_BMP085_Unified bmp = Adafruit_BMP085_Unified(10085);

// SPI for SD card
SPIClass SPI_SD(HSPI);

// Timing intervals (ms)
const unsigned long tiltInterval = 5000;
const unsigned long bmpInterval = 2000;
const unsigned long mpuInterval = 2000;
const unsigned long soilInterval = 4000;
const unsigned long rainInterval = 4000;

// Last sent timestamps
unsigned long lastTiltSent = 0;
unsigned long lastBMPSent = 0;
unsigned long lastMPUSent = 0;
unsigned long lastSoilSent = 0;
unsigned long lastRainSent = 0;

time_t lastUploadTime = 0;  // Track last successful upload time

// File names
const char* LOG_FILE = "/sensor_log.txt";
const char* LAST_UPLOAD_FILE = "/last_upload_time.txt";

void logToSD(String message) {
  File file = SD.open(LOG_FILE, FILE_APPEND);
  if (file) {
    file.println(message);
    file.close();
  } else {
    Serial.println("Failed to open log file for writing");
  }
}

void saveLastUploadTime(time_t t) {
  File file = SD.open(LAST_UPLOAD_FILE, FILE_WRITE);
  if (file) {
    file.print(t);
    file.close();
  }
}

time_t readLastUploadTime() {
  if (!SD.exists(LAST_UPLOAD_FILE)) return 0;
  File file = SD.open(LAST_UPLOAD_FILE, FILE_READ);
  if (!file) return 0;
  String s = file.readStringUntil('\n');
  file.close();
  return s.toInt();
}

void uploadLogFileSinceLastUpload() {
  if (!SD.exists(LOG_FILE)) {
    Serial.println("No log file to upload.");
    return;
  }

  File file = SD.open(LOG_FILE, FILE_READ);
  if (!file) {
    Serial.println("Failed to open log file for reading");
    return;
  }

  Serial.println("Uploading buffered data from SD...");

  while (file.available()) {
    String line = file.readStringUntil('\n');
    if (line.length() == 0) continue;

    String timeStr = line.substring(0, 19);
    struct tm tm;
    strptime(timeStr.c_str(), "%Y-%m-%d %H:%M:%S", &tm);
    time_t lineTime = mktime(&tm);

    if (lineTime <= lastUploadTime) {
      continue;
    }

    if (line.indexOf("Tilt:") > 0) {
      int val = line.substring(line.indexOf("Tilt:") + 5).toInt();
      FirebaseJson json;
      json.set("value", val);
      json.set("timestamp", timeStr);
      json.set("location", "Rathnapura");

      String path = "/Sensors/TiltReadings/" + String(lineTime);
      if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("Uploaded Tilt log: " + line);
        lastUploadTime = lineTime;
        saveLastUploadTime(lastUploadTime);
      } else {
        Serial.println("Failed to upload Tilt log: " + fbdo.errorReason());
        break;
      }
    }
    else if (line.indexOf("BMP180:") > 0) {
      int pStart = line.indexOf("Pressure=");
      int tStart = line.indexOf("Temp=");
      int aStart = line.indexOf("Altitude=");
      float pressure = line.substring(pStart + 9, line.indexOf(" ", pStart + 9)).toFloat();
      float temp = line.substring(tStart + 5, line.indexOf(" ", tStart + 5)).toFloat();
      float altitude = line.substring(aStart + 9).toFloat();

      FirebaseJson json;
      json.set("pressure_hPa", pressure);
      json.set("temperature_C", temp);
      json.set("altitude_m", altitude);
      json.set("timestamp", timeStr);
      json.set("location", "Gampaha");

      String path = "/Sensors/BMP180Readings/" + String(lineTime);
      if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("Uploaded BMP180 log: " + line);
        lastUploadTime = lineTime;
        saveLastUploadTime(lastUploadTime);
      } else {
        Serial.println("Failed to upload BMP180 log: " + fbdo.errorReason());
        break;
      }
    }
    else if (line.indexOf("MPU6050:") > 0) {
      FirebaseJson json;
      json.set("data", line);
      json.set("timestamp", timeStr);
      json.set("location", "Rathnapura");

      String path = "/Sensors/MPU6050Readings/" + String(lineTime);
      if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("Uploaded MPU6050 log: " + line);
        lastUploadTime = lineTime;
        saveLastUploadTime(lastUploadTime);
      } else {
        Serial.println("Failed to upload MPU6050 log: " + fbdo.errorReason());
        break;
      }
    }
    else if (line.indexOf("Soil Moisture:") > 0) {
      int dStart = line.indexOf("Digital=");
      int aStart = line.indexOf("Analog=");
      int digital = line.substring(dStart + 8, line.indexOf(" ", dStart + 8)).toInt();
      int analog = line.substring(aStart + 7).toInt();

      FirebaseJson json;
      json.set("digital", digital);
      json.set("analog", analog);
      json.set("timestamp", timeStr);
      json.set("location", "Rathnapura");

      String path = "/Sensors/SoilMoistureReadings/" + String(lineTime);
      if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("Uploaded Soil log: " + line);
        lastUploadTime = lineTime;
        saveLastUploadTime(lastUploadTime);
      } else {
        Serial.println("Failed to upload Soil log: " + fbdo.errorReason());
        break;
      }
    }
    else if (line.indexOf("Rain Sensor:") > 0) {
      int dStart = line.indexOf("Digital=");
      int aStart = line.indexOf("Analog=");
      int digital = line.substring(dStart + 8, line.indexOf(" ", dStart + 8)).toInt();
      int analog = line.substring(aStart + 7).toInt();

      FirebaseJson json;
      json.set("digital", digital);
      json.set("analog", analog);
      json.set("timestamp", timeStr);
      json.set("location", "Rathnapura");

      String path = "/Sensors/RainReadings/" + String(lineTime);
      if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("Uploaded Rain log: " + line);
        lastUploadTime = lineTime;
        saveLastUploadTime(lastUploadTime);
      } else {
        Serial.println("Failed to upload Rain log: " + fbdo.errorReason());
        break;
      }
    }
  }

  file.close();
  Serial.println("Finished uploading buffered data.");
}

void setup() {
  Serial.begin(115200);

  pinMode(TILT_SENSOR_PIN, INPUT);
  pinMode(SOIL_DO_PIN, INPUT);
  pinMode(RAIN_DO_PIN, INPUT);

  SPI_SD.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
  if (!SD.begin(SD_CS_PIN, SPI_SD)) {
    Serial.println("SD Card Mount Failed");
    while (1);
  }
  Serial.println("SD Card initialized.");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected!");

  Wire.begin(18, 19);   // MPU6050
  Wire1.begin(21, 22);  // BMP180

  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Waiting for NTP time sync");
  while (time(nullptr) < 100000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" time set!");

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  if (mpu.begin() != 0) {
    Serial.println("MPU6050 initialization failed!");
    while (1);
  }
  Serial.println("MPU6050 initialized.");
  mpu.calcOffsets();

  if (!bmp.begin(BMP085_MODE_ULTRAHIGHRES, &Wire1)) {
    Serial.println("BMP180 not found, check wiring!");
    while (1);
  }
  Serial.println("BMP180 initialized.");

  lastUploadTime = readLastUploadTime();
  Serial.printf("Last upload time read from SD: %lu\n", lastUploadTime);

  uploadLogFileSinceLastUpload();
}

void loop() {
  unsigned long nowMillis = millis();
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  char timeStamp[30];
  strftime(timeStamp, sizeof(timeStamp), "%Y-%m-%d %H:%M:%S", timeinfo);

  bool wifiConnected = (WiFi.status() == WL_CONNECTED);

  // Tilt Sensor
  if (nowMillis - lastTiltSent >= tiltInterval) {
    lastTiltSent = nowMillis;
    int tiltState = digitalRead(TILT_SENSOR_PIN);

    FirebaseJson tiltJson;
    tiltJson.set("value", tiltState);
    tiltJson.set("timestamp", timeStamp);
    tiltJson.set("location", "Rathnapura");

    String tiltPath = "/Sensors/TiltReadings/" + String(nowMillis);

    if (wifiConnected && Firebase.setJSON(fbdo, tiltPath, tiltJson)) {
      Serial.println("Tilt data sent!");
      logToSD(String(timeStamp) + " Tilt: " + String(tiltState));
      lastUploadTime = now;
      saveLastUploadTime(lastUploadTime);
    } else {
      Serial.println("Tilt send failed or no WiFi, logging locally");
      logToSD(String(timeStamp) + " Tilt: " + String(tiltState));
    }
  }

  // BMP180 Sensor
  if (nowMillis - lastBMPSent >= bmpInterval) {
    lastBMPSent = nowMillis;

    sensors_event_t event;
    bmp.getEvent(&event);

    if (event.pressure) {
      float temperature;
      bmp.getTemperature(&temperature);

      // Calculate altitude (meters)
      float altitude = bmp.pressureToAltitude(SENSORS_PRESSURE_SEALEVELHPA, event.pressure);

      FirebaseJson bmpJson;
      bmpJson.set("pressure_hPa", event.pressure);
      bmpJson.set("temperature_C", temperature);
      bmpJson.set("altitude_m", altitude);
      bmpJson.set("timestamp", timeStamp);
      bmpJson.set("location", "Gampaha");

      String bmpPath = "/Sensors/BMP180Readings/" + String(nowMillis);

      if (wifiConnected && Firebase.setJSON(fbdo, bmpPath, bmpJson)) {
        Serial.println("BMP180 data sent!");
        logToSD(String(timeStamp) + " BMP180: Pressure=" + String(event.pressure) + " Temp=" + String(temperature) + " Altitude=" + String(altitude));
        lastUploadTime = now;
        saveLastUploadTime(lastUploadTime);
      } else {
        Serial.println("BMP180 send failed or no WiFi, logging locally");
        logToSD(String(timeStamp) + " BMP180: Pressure=" + String(event.pressure) + " Temp=" + String(temperature) + " Altitude=" + String(altitude));
      }
    } else {
      Serial.println("BMP180 reading failed.");
      logToSD(String(timeStamp) + " BMP180 reading failed.");
    }
  }

  // MPU6050 Sensor
  if (nowMillis - lastMPUSent >= mpuInterval) {
    lastMPUSent = nowMillis;

    mpu.update();

    FirebaseJson mpuJson;
    mpuJson.set("accelX", mpu.getAccX());
    mpuJson.set("accelY", mpu.getAccY());
    mpuJson.set("accelZ", mpu.getAccZ());
    mpuJson.set("gyroX", mpu.getGyroX());
    mpuJson.set("gyroY", mpu.getGyroY());
    mpuJson.set("gyroZ", mpu.getGyroZ());
    mpuJson.set("timestamp", timeStamp);
    mpuJson.set("location", "Rathnapura");

    String mpuPath = "/Sensors/MPU6050Readings/" + String(nowMillis);

    if (wifiConnected && Firebase.setJSON(fbdo, mpuPath, mpuJson)) {
      Serial.println("MPU6050 data sent!");
      logToSD(String(timeStamp) + " MPU6050: AccelX=" + String(mpu.getAccX()) + " AccelY=" + String(mpu.getAccY()) + " AccelZ=" + String(mpu.getAccZ()));
      lastUploadTime = now;
      saveLastUploadTime(lastUploadTime);
    } else {
      Serial.println("MPU6050 send failed or no WiFi, logging locally");
      logToSD(String(timeStamp) + " MPU6050: AccelX=" + String(mpu.getAccX()) + " AccelY=" + String(mpu.getAccY()) + " AccelZ=" + String(mpu.getAccZ()));
    }
  }

  // Soil Moisture Sensor
  if (nowMillis - lastSoilSent >= soilInterval) {
    lastSoilSent = nowMillis;

    int soilDigital = digitalRead(SOIL_DO_PIN);
    int soilAnalog = analogRead(SOIL_AO_PIN);

    FirebaseJson soilJson;
    soilJson.set("digital", soilDigital);
    soilJson.set("analog", soilAnalog);
    soilJson.set("timestamp", timeStamp);
    soilJson.set("location", "Rathnapura");

    String soilPath = "/Sensors/SoilMoistureReadings/" + String(nowMillis);

    if (wifiConnected && Firebase.setJSON(fbdo, soilPath, soilJson)) {
      Serial.println("Soil data sent!");
      logToSD(String(timeStamp) + " Soil Moisture: Digital=" + String(soilDigital) + " Analog=" + String(soilAnalog));
      lastUploadTime = now;
      saveLastUploadTime(lastUploadTime);
    } else {
      Serial.println("Soil send failed or no WiFi, logging locally");
      logToSD(String(timeStamp) + " Soil Moisture: Digital=" + String(soilDigital) + " Analog=" + String(soilAnalog));
    }
  }

  // Rain Sensor
  if (nowMillis - lastRainSent >= rainInterval) {
    lastRainSent = nowMillis;

    int rainDigital = digitalRead(RAIN_DO_PIN);
    int rainAnalog = analogRead(RAIN_AO_PIN);

    FirebaseJson rainJson;
    rainJson.set("digital", rainDigital);
    rainJson.set("analog", rainAnalog);
    rainJson.set("timestamp", timeStamp);
    rainJson.set("location", "Rathnapura");

    String rainPath = "/Sensors/RainReadings/" + String(nowMillis);

    if (wifiConnected && Firebase.setJSON(fbdo, rainPath, rainJson)) {
      Serial.println("Rain data sent!");
      logToSD(String(timeStamp) + " Rain Sensor: Digital=" + String(rainDigital) + " Analog=" + String(rainAnalog));
      lastUploadTime = now;
      saveLastUploadTime(lastUploadTime);
    } else {
      Serial.println("Rain send failed or no WiFi, logging locally");
      logToSD(String(timeStamp) + " Rain Sensor: Digital=" + String(rainDigital) + " Analog=" + String(rainAnalog));
    }
  }

  // If WiFi just reconnected, upload buffered logs
  static bool wifiWasConnected = false;
  if (!wifiWasConnected && wifiConnected) {
    Serial.println("WiFi reconnected! Uploading buffered data...");
    uploadLogFileSinceLastUpload();
  }
  wifiWasConnected = wifiConnected;

  delay(10);
}
