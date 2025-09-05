package com.example.mad_day3.Controller

import android.content.Context
import android.content.SharedPreferences

class getCityName {
    fun getCityName(context: Context): String? {
        val PREF_NAME = "prefs"
        val KEY_NAME = "city"

        val sharedPref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return sharedPref.getString(KEY_NAME, null)
    }
    fun getUserId(context: Context) : String?{
        val PREF_NAME = "prefs"
        val KEY_NAME = "userID"
        val sharedPref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return sharedPref.getString(KEY_NAME, null)
    }
}