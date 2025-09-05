package com.example.mad_day3.Model

data class userModel (
    val address: String,
    val city: String,
    val contactNo: String,
    val email: String,
    val familyMembers: Int,
    val notificationPrefs: NotificationPrefs,
    val password: String,
    val themePref: String,
    val userName: String
)