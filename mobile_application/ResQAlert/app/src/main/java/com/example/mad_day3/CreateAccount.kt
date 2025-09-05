package com.example.mad_day3

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.example.mad_day3.Controller.CreateAcc
import kotlinx.coroutines.launch

class CreateAccount : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_create_account)
        val createAccBtn = findViewById<Button>(R.id.createAccountButton)
        val createAccObj by viewModels<CreateAcc>()
        createAccBtn.setOnClickListener {
            try{
                val address = findViewById<EditText>(R.id.addressEditText).text.toString()
                val city = findViewById<EditText>(R.id.cityEditText).text.toString()
                val contactNo = findViewById<EditText>(R.id.contactNoEditText).text.toString()
                val email = findViewById<EditText>(R.id.emailEditText).text.toString()
                val familyMembersStr = findViewById<EditText>(R.id.familyMembersEditText).text.toString()
                val name = findViewById<EditText>(R.id.nameEditText).text.toString()
                val password = findViewById<EditText>(R.id.passwordEditText).text.toString()
                val confirmPassword = findViewById<EditText>(R.id.confirmPasswordEditText).text.toString()
                if (address.isBlank() || city.isBlank() || contactNo.isBlank() || email.isBlank() ||
                    familyMembersStr.isBlank() || name.isBlank() || password.isBlank() || confirmPassword.isBlank()) {
                    // Show error or return early
                    Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                }else{
                    if(confirmPassword == password){
                        lifecycleScope.launch {
                            val result =  createAccObj.createUserAccount(
                                address,
                                city,
                                contactNo,
                                email,
                                findViewById<EditText>(R.id.familyMembersEditText).text.toString().toInt(),
                                name,
                                password
                            )
                        }
                        Toast.makeText(this, "Account created successfully", Toast.LENGTH_LONG).show()
                        val mainActivityIntent = Intent(this, MainActivity::class.java)
                        startActivity(mainActivityIntent)
                    }else{
                        Toast.makeText(this, "Password does not match", Toast.LENGTH_LONG).show()
                    }

                }

            }catch(e : Exception){
                Toast.makeText(this, "Error occured : ${e.message.toString()}", Toast.LENGTH_LONG).show()
            }
        }
    }
}