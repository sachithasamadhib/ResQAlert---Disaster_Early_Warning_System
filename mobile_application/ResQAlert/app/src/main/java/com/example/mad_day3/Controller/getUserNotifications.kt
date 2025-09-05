package com.example.mad_day3.Controller

import android.app.Dialog
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.mad_day3.Model.notificationModel
import com.example.mad_day3.R
import com.google.firebase.Firebase
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.firestore
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class getUserNotifications {
    val db = Firebase.firestore
    private var notificationListener: ListenerRegistration? = null
    private val shownNotificationIds = mutableSetOf<String>()
    private fun setupRecycleNotifications(view : View, notifications : List<notificationModel>, context: Context,userID : String?){
        val notificationRecycle = view.findViewById<RecyclerView>(R.id.notificationHolderSet)
        notificationRecycle.layoutManager = LinearLayoutManager(context)
        notificationRecycle.adapter = notificationsAdapter(notifications, context,userID,view)
    }
//    fun getNotifications(view : View, userID : String?, context : Context){
//        try {
//            // Show loading dialog
//            val loadingDialog = Dialog(context)
//            loadingDialog.setContentView(R.layout.custom_dialog)
//            loadingDialog.window?.setLayout(
//                LinearLayout.LayoutParams.WRAP_CONTENT,
//                LinearLayout.LayoutParams.WRAP_CONTENT
//            )
//            loadingDialog.setCancelable(false)
//            loadingDialog.show()
//            //get data
//            db.collection("notifications")
//                .whereEqualTo("userID",userID)
//                .whereEqualTo("isRead",false)
//                .get()
//                .addOnSuccessListener { result ->
//                    if(result.isEmpty){
//                        //TODO:TEST
//                        Log.d("DEBUG","EMPTY DATA NOTIFICATION")
//                        view.findViewById<TextView>(R.id.notificationLabel).text = "No Notifications"
//                        loadingDialog.dismiss()
//                    }else{
//                        val notificationSet = mutableListOf<notificationModel>()
//                        for(document in result){
//                            //TODO:TEST
//                            Log.e("DEBUG","GETTING DATA")
//                            val messageTest : String = document.getString("message").toString()
//                            val typeTest : String = document.getString("type").toString()
//                            Log.e("DEBUG OUT : ", messageTest)
//                            Log.e("DEBUG OUT : ", typeTest)
//                            // Replace document.getString("time") with this:
//                            val timestamp = document.getString("time")
////                            val timeString = if (timestamp != null) {
////                                // Convert Firestore Timestamp to formatted string
////                                val sdf = SimpleDateFormat(
////                                    "dd MMMM yyyy 'at' HH:mm:ss 'UTC'XXX",
////                                    Locale.ENGLISH
////                                )
////                                sdf.timeZone = TimeZone.getTimeZone("Asia/Kolkata") // For UTC+5:30
////                                //sdf.format(timestamp.toDate())
////                            } else {
////                                "" // Fallback value
////                            }
//                            Log.e("DEBUG OUT : ", timestamp.toString())
//                            notificationSet.add(notificationModel(
//                                document.id,
//                                document.getString("message"),
//                                document.getBoolean("isRead"),
//                                timestamp.toString(),
//                                document.getString("type"),
//                                document.getString("userID")
//                            ))
//                        }
//                        loadingDialog.dismiss()
//                        if(notificationSet.isNotEmpty()){
//                            setupRecycleNotifications(view,notificationSet,context,userID)
//                            view.findViewById<RecyclerView>(R.id.notificationHolderSet).visibility = View.VISIBLE
//                        }
//                        loadingDialog.dismiss()
//                    }
//                }
//        }catch (e : Exception){
//            //TODO: TEST
//            Log.e("ERROR","ERROR GETTING NOTIFICATIONS(CONTROLLER) : ${e.toString()}")
//        }
//    }
fun getNotifications(view: View, userID: String?, context: Context) {
    try {
        val notificationHelper = NotificationHelper(context)
        val loadingDialog = Dialog(context).apply {
            setContentView(R.layout.custom_dialog)
            window?.setLayout(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setCancelable(false)
            show()
        }
        // Create the query
        val query = db.collection("notifications")
            .whereEqualTo("userID", userID)
            .whereEqualTo("isRead", false)

        // Replace get() with addSnapshotListener
        notificationListener = query.addSnapshotListener { snapshot, exception ->
            if (exception != null) {
                Log.e("ERROR", "Listen failed: ${exception.message}")
                loadingDialog.dismiss()
                return@addSnapshotListener
            }

            if (snapshot != null && !snapshot.isEmpty) {
                val notificationSet = mutableListOf<notificationModel>()
                for (document in snapshot.documents) {
                    val messageText = document.getString("message").toString()
                    notificationSet.add(notificationModel(
                        document.id,
                        document.getString("message"),
                        document.getBoolean("isRead"),
                        document.getString("time").toString(),
                        document.getString("type"),
                        document.getString("userID")
                    ))
                    // Only show notification if we haven't shown it before
                    if (!shownNotificationIds.contains(document.id)) {
                        notificationHelper.showNotification(
                            document.id.hashCode(),
                            "New Notification",
                            messageText
                        )
                        shownNotificationIds.add(document.id)
                    }
                }
                setupRecycleNotifications(view, notificationSet, context, userID)
                view.findViewById<RecyclerView>(R.id.notificationHolderSet).visibility = View.VISIBLE
            } else {
                view.findViewById<TextView>(R.id.notificationLabel).text = "No Notifications"
            }
            loadingDialog.dismiss()
        }
    } catch (e: Exception) {
        Log.e("ERROR", "Error setting up listener: ${e.toString()}")
    }
}

}