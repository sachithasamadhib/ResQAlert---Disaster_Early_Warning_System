#if ARDUINO >= 100
#include "Arduino.h"
#else
#include "WProgram.h"
#endif

#include <limits.h>
#include <math.h>
#include "Adafruit_BMP085_U.h"

static bmp085_calib_data _bmp085_coeffs;
static uint8_t _bmp085Mode;

/***************************************************************************
 PRIVATE FUNCTIONS
 ***************************************************************************/

static void writeCommand(TwoWire *wire, byte reg, byte value) {
  wire->beginTransmission((uint8_t)BMP085_ADDRESS);
  wire->write((uint8_t)reg);
  wire->write((uint8_t)value);
  wire->endTransmission();
}

static void read8(TwoWire *wire, byte reg, uint8_t *value) {
  wire->beginTransmission((uint8_t)BMP085_ADDRESS);
  wire->write((uint8_t)reg);
  wire->endTransmission();
  wire->requestFrom((uint8_t)BMP085_ADDRESS, (byte)1);
  *value = wire->read();
}

static void read16(TwoWire *wire, byte reg, uint16_t *value) {
  wire->beginTransmission((uint8_t)BMP085_ADDRESS);
  wire->write((uint8_t)reg);
  wire->endTransmission();
  wire->requestFrom((uint8_t)BMP085_ADDRESS, (byte)2);
  *value = (wire->read() << 8) | wire->read();
}

static void readS16(TwoWire *wire, byte reg, int16_t *value) {
  uint16_t i;
  read16(wire, reg, &i);
  *value = (int16_t)i;
}

static void readCoefficients(TwoWire *wire) {
  readS16(wire, BMP085_REGISTER_CAL_AC1, &_bmp085_coeffs.ac1);
  readS16(wire, BMP085_REGISTER_CAL_AC2, &_bmp085_coeffs.ac2);
  readS16(wire, BMP085_REGISTER_CAL_AC3, &_bmp085_coeffs.ac3);
  read16(wire, BMP085_REGISTER_CAL_AC4, &_bmp085_coeffs.ac4);
  read16(wire, BMP085_REGISTER_CAL_AC5, &_bmp085_coeffs.ac5);
  read16(wire, BMP085_REGISTER_CAL_AC6, &_bmp085_coeffs.ac6);
  readS16(wire, BMP085_REGISTER_CAL_B1, &_bmp085_coeffs.b1);
  readS16(wire, BMP085_REGISTER_CAL_B2, &_bmp085_coeffs.b2);
  readS16(wire, BMP085_REGISTER_CAL_MB, &_bmp085_coeffs.mb);
  readS16(wire, BMP085_REGISTER_CAL_MC, &_bmp085_coeffs.mc);
  readS16(wire, BMP085_REGISTER_CAL_MD, &_bmp085_coeffs.md);
}

static void readRawTemperature(TwoWire *wire, int32_t *temperature) {
  uint16_t t;
  writeCommand(wire, BMP085_REGISTER_CONTROL, BMP085_REGISTER_READTEMPCMD);
  delay(5);
  read16(wire, BMP085_REGISTER_TEMPDATA, &t);
  *temperature = t;
}

static void readRawPressure(TwoWire *wire, int32_t *pressure) {
  uint8_t p8;
  uint16_t p16;
  int32_t p32;

  writeCommand(wire, BMP085_REGISTER_CONTROL,
               BMP085_REGISTER_READPRESSURECMD + (_bmp085Mode << 6));
  switch (_bmp085Mode) {
    case BMP085_MODE_ULTRALOWPOWER: delay(5); break;
    case BMP085_MODE_STANDARD:      delay(8); break;
    case BMP085_MODE_HIGHRES:       delay(14); break;
    case BMP085_MODE_ULTRAHIGHRES:
    default:                        delay(26); break;
  }

  read16(wire, BMP085_REGISTER_PRESSUREDATA, &p16);
  p32 = (uint32_t)p16 << 8;
  read8(wire, BMP085_REGISTER_PRESSUREDATA + 2, &p8);
  p32 += p8;
  p32 >>= (8 - _bmp085Mode);
  *pressure = p32;
}

int32_t Adafruit_BMP085_Unified::computeB5(int32_t ut) {
  int32_t X1 = (ut - (int32_t)_bmp085_coeffs.ac6) * ((int32_t)_bmp085_coeffs.ac5) >> 15;
  int32_t X2 = ((int32_t)_bmp085_coeffs.mc << 11) / (X1 + (int32_t)_bmp085_coeffs.md);
  return X1 + X2;
}

/***************************************************************************
 CONSTRUCTOR
 ***************************************************************************/

Adafruit_BMP085_Unified::Adafruit_BMP085_Unified(int32_t sensorID) {
  _sensorID = sensorID;
  _wire = &Wire; // default
}

/***************************************************************************
 PUBLIC FUNCTIONS
 ***************************************************************************/

bool Adafruit_BMP085_Unified::begin(bmp085_mode_t mode, TwoWire *wireBus) {
  _wire = wireBus;
  _wire->begin();

  if ((mode > BMP085_MODE_ULTRAHIGHRES) || (mode < 0)) {
    mode = BMP085_MODE_ULTRAHIGHRES;
  }

  uint8_t id;
  read8(_wire, BMP085_REGISTER_CHIPID, &id);
  if (id != 0x55) {
    return false;
  }

  _bmp085Mode = mode;
  readCoefficients(_wire);
  return true;
}

void Adafruit_BMP085_Unified::getPressure(float *pressure) {
  int32_t ut = 0, up = 0, compp = 0;
  int32_t x1, x2, b5, b6, x3, b3, p;
  uint32_t b4, b7;

  readRawTemperature(_wire, &ut);
  readRawPressure(_wire, &up);

  b5 = computeB5(ut);

  b6 = b5 - 4000;
  x1 = (_bmp085_coeffs.b2 * ((b6 * b6) >> 12)) >> 11;
  x2 = (_bmp085_coeffs.ac2 * b6) >> 11;
  x3 = x1 + x2;
  b3 = (((((int32_t)_bmp085_coeffs.ac1) * 4 + x3) << _bmp085Mode) + 2) >> 2;
  x1 = (_bmp085_coeffs.ac3 * b6) >> 13;
  x2 = (_bmp085_coeffs.b1 * ((b6 * b6) >> 12)) >> 16;
  x3 = ((x1 + x2) + 2) >> 2;
  b4 = (_bmp085_coeffs.ac4 * (uint32_t)(x3 + 32768)) >> 15;
  b7 = ((uint32_t)(up - b3) * (50000 >> _bmp085Mode));

  if (b7 < 0x80000000) {
    p = (b7 << 1) / b4;
  } else {
    p = (b7 / b4) << 1;
  }

  x1 = (p >> 8) * (p >> 8);
  x1 = (x1 * 3038) >> 16;
  x2 = (-7357 * p) >> 16;
  compp = p + ((x1 + x2 + 3791) >> 4);

  *pressure = compp;
}

void Adafruit_BMP085_Unified::getTemperature(float *temp) {
  int32_t UT, B5;
  float t;
  readRawTemperature(_wire, &UT);
  B5 = computeB5(UT);
  t = (B5 + 8) >> 4;
  t /= 10;
  *temp = t;
}

float Adafruit_BMP085_Unified::pressureToAltitude(float seaLevel, float atmospheric) {
  return 44330.0 * (1.0 - pow(atmospheric / seaLevel, 0.1903));
}

float Adafruit_BMP085_Unified::pressureToAltitude(float seaLevel, float atmospheric, float temp) {
  return pressureToAltitude(seaLevel, atmospheric);
}

float Adafruit_BMP085_Unified::seaLevelForAltitude(float altitude, float atmospheric) {
  return atmospheric / pow(1.0 - (altitude / 44330.0), 5.255);
}

float Adafruit_BMP085_Unified::seaLevelForAltitude(float altitude, float atmospheric, float temp) {
  return seaLevelForAltitude(altitude, atmospheric);
}

void Adafruit_BMP085_Unified::getSensor(sensor_t *sensor) {
  memset(sensor, 0, sizeof(sensor_t));
  strncpy(sensor->name, "BMP085", sizeof(sensor->name) - 1);
  sensor->name[sizeof(sensor->name) - 1] = 0;
  sensor->version = 1;
  sensor->sensor_id = _sensorID;
  sensor->type = SENSOR_TYPE_PRESSURE;
  sensor->min_delay = 0;
  sensor->max_value = 1100.0F;
  sensor->min_value = 300.0F;
  sensor->resolution = 0.01F;
}

bool Adafruit_BMP085_Unified::getEvent(sensors_event_t *event) {
  float pressure_kPa;
  memset(event, 0, sizeof(sensors_event_t));
  event->version = sizeof(sensors_event_t);
  event->sensor_id = _sensorID;
  event->type = SENSOR_TYPE_PRESSURE;
  event->timestamp = 0;
  getPressure(&pressure_kPa);
  event->pressure = pressure_kPa / 100.0F;
  return true;
}
