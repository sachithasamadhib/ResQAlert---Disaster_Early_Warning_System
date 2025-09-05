package com.example.mad_day3.Model

data class WaterLevelSensorData(
    val analog: Int,
    val digital: Int,
    val location: String,
    val timestamp: String
){constructor() : this(0, 0, "", "")}