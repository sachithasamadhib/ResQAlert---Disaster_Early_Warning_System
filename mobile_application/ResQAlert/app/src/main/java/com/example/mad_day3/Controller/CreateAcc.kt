package com.example.mad_day3.Controller

import android.R
import android.content.ContentValues.TAG
import android.util.Log
import androidx.lifecycle.ViewModel
import com.example.mad_day3.Model.NotificationPrefs
import com.example.mad_day3.Model.userModel
import com.google.firebase.Firebase
import com.google.firebase.firestore.firestore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CreateAcc : ViewModel(){
    val db = Firebase.firestore
     suspend fun createUserAccount(address : String, city : String, contactNo : String, email : String, familyMembers : Int, name : String, password : String) : Boolean =
         withContext(Dispatchers.IO){
            try {
                val userNewAccDetails = userModel(
                    address = address,
                    city = city,
                    contactNo = contactNo,
                    email = email,
                    familyMembers = familyMembers,
                    notificationPrefs = NotificationPrefs(
                        floodAlerts = true,
                        landslideAlerts = true
                    ),
                    password = password,
                    themePref = "system",
                    userName = name
                )
                db.collection("userAccounts")
                    .add(userNewAccDetails)
                    .addOnSuccessListener { documentReference ->
                        Log.d(TAG, "DocumentSnapshot written with ID: ${documentReference.id}")
                    }
                    .addOnFailureListener { e ->
                        Log.w(TAG, "Error adding document", e)
                    }
                return@withContext true
            }catch(e : Exception){
                throw Exception("Error creating user account : ${e.toString()}")
            }
        }
}