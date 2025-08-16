/*!
 * @file Adafruit_BMP085_U.h
 */

#ifndef __BMP085_H__
#define __BMP085_H__

#if (ARDUINO >= 100)
#include "Arduino.h"
#else
#include "WProgram.h"
#endif

#include <Adafruit_Sensor.h>

#ifdef __AVR_ATtiny85__
#include "TinyWireM.h"
#define Wire TinyWireM
#else
#include <Wire.h>
#endif

#define BMP085_ADDRESS (0x77)

// BMP085 Register Map
enum {
  BMP085_REGISTER_CAL_AC1 = 0xAA,
  BMP085_REGISTER_CAL_AC2 = 0xAC,
  BMP085_REGISTER_CAL_AC3 = 0xAE,
  BMP085_REGISTER_CAL_AC4 = 0xB0,
  BMP085_REGISTER_CAL_AC5 = 0xB2,
  BMP085_REGISTER_CAL_AC6 = 0xB4,
  BMP085_REGISTER_CAL_B1 = 0xB6,
  BMP085_REGISTER_CAL_B2 = 0xB8,
  BMP085_REGISTER_CAL_MB = 0xBA,
  BMP085_REGISTER_CAL_MC = 0xBC,
  BMP085_REGISTER_CAL_MD = 0xBE,
  BMP085_REGISTER_CHIPID = 0xD0,
  BMP085_REGISTER_VERSION = 0xD1,
  BMP085_REGISTER_SOFTRESET = 0xE0,
  BMP085_REGISTER_CONTROL = 0xF4,
  BMP085_REGISTER_TEMPDATA = 0xF6,
  BMP085_REGISTER_PRESSUREDATA = 0xF6,
  BMP085_REGISTER_READTEMPCMD = 0x2E,
  BMP085_REGISTER_READPRESSURECMD = 0x34
};

typedef enum {
  BMP085_MODE_ULTRALOWPOWER = 0,
  BMP085_MODE_STANDARD = 1,
  BMP085_MODE_HIGHRES = 2,
  BMP085_MODE_ULTRAHIGHRES = 3
} bmp085_mode_t;

typedef struct {
  int16_t ac1;
  int16_t ac2;
  int16_t ac3;
  uint16_t ac4;
  uint16_t ac5;
  uint16_t ac6;
  int16_t b1;
  int16_t b2;
  int16_t mb;
  int16_t mc;
  int16_t md;
} bmp085_calib_data;

class Adafruit_BMP085_Unified : public Adafruit_Sensor {
public:
  Adafruit_BMP085_Unified(int32_t sensorID = -1);

  // NEW: Support custom I2C wire bus
  bool begin(bmp085_mode_t mode = BMP085_MODE_ULTRAHIGHRES, TwoWire *wireBus = &Wire);

  void getTemperature(float *temp);
  void getPressure(float *pressure);
  float pressureToAltitude(float seaLevel, float atmospheric);
  float pressureToAltitude(float seaLevel, float atmospheric, float temp);
  float seaLevelForAltitude(float altitude, float atmospheric);
  float seaLevelForAltitude(float altitude, float atmospheric, float temp);
  bool getEvent(sensors_event_t *);
  void getSensor(sensor_t *);

private:
  int32_t computeB5(int32_t ut);
  int32_t _sensorID;

  // NEW: store which I2C bus is used
  TwoWire *_wire;
};

#endif
