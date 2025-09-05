package com.example.mad_day3.Model

data class rainfallModel (
    val altitude_m: Double? = null,
    val location : String? = null,
    val pressure_hPa: Double? = null,
    val temperature_C : Double? = null,
    val timestamp: String? = null
){
    constructor() : this(null, null, null)
}