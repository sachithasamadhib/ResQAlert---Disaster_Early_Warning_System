package com.example.mad_day3.Model

import com.google.firebase.Timestamp

//data class landslideTilt(
//    val location: String,
//    val timestamp: String,
//    val value: Int
//)
data class landslideTilt(
    val location: String? = null,  // Make nullable with default value
    val timestamp: String? = null,  // Make nullable with default value
    val value: Int? = null          // Make nullable with default value
) {
    // Add a no-argument constructor required by Firebase
    constructor() : this(null, null, null)
}