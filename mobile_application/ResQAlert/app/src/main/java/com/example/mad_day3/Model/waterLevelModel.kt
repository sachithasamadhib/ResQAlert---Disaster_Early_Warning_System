package com.example.mad_day3.Model

import com.example.mad_day3.Model.rainfallModel

data class waterLevelModel (
    val WaterLevelPercentage: Double? = null,
    val location: String? = null,
    val time: String? = null
){
    constructor() : this(null, null, null)
}