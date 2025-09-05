package com.example.mad_day3.Model

data class landslideGroundMotions(
    val accelX: Double = 0.0,
    val accelY: Double = 0.0,
    val accelZ: Double = 0.0,
    val gyroX: Double = 0.0,
    val gyroY: Double = 0.0,
    val gyroZ: Double = 0.0,
    val location: String = "",
    val timestamp: String = ""
)