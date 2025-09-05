package com.example.mad_day3.Controller

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import com.example.mad_day3.Model.notificationModel
import com.example.mad_day3.R
import com.google.firebase.Firebase
import com.google.firebase.Timestamp
import com.google.firebase.firestore.firestore
import java.time.Instant
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

class notificationsAdapter(private val notificationItems: List<notificationModel>,val context: Context,val userID : String?, val view : View) :
    RecyclerView.Adapter<notificationsAdapter.NotificationCardViewHolder>() {
    val db = Firebase.firestore
    class NotificationCardViewHolder(notificationView: View) : RecyclerView.ViewHolder(notificationView){
        val notificationTypeUI = notificationView.findViewById<TextView>(R.id.notificationType)
        val messageNotificationUI = notificationView.findViewById<TextView>(R.id.messageNotification)
        val timeNotificationUI = notificationView.findViewById<TextView>(R.id.timeNotification)
        val dateNotificationUI = notificationView.findViewById<TextView>(R.id.dateNotification)
        val dismissBtn = notificationView.findViewById<Button>(R.id.notificationDismiss)
    }
    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): NotificationCardViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.notificationcard, parent, false)
        return NotificationCardViewHolder(view)
    }
    override fun onBindViewHolder(
        holder: NotificationCardViewHolder,
        position: Int
    ) {
        val notifications = notificationItems[position]
        holder.notificationTypeUI.text = notifications.type
        holder.messageNotificationUI.text = notifications.message

//        val regex = "UTC([+-])(\\d{1,2}):(\\d{2})".toRegex()
//        val normalized = notifications.time
//
//        val parser = DateTimeFormatter.ofPattern("dd MMMM yyyy 'at' HH:mm:ss 'UTC'XXX", Locale.ENGLISH)
//        val zonedDateTime = ZonedDateTime.parse(normalized, parser)
//
//        val dateFormatter = DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.ENGLISH)
//        val timeFormatter = DateTimeFormatter.ofPattern("hh:mm:ss a", Locale.ENGLISH)

//        holder.timeNotificationUI.text = timeFormatter.format(zonedDateTime)
//        holder.dateNotificationUI.text = dateFormatter.format(zonedDateTime)
        holder.timeNotificationUI.text = notifications.time
        holder.dismissBtn.setOnClickListener {
            try {
                db.collection("notifications")
                    .document(notifications.notificationID.toString())
                    .update("isRead",true)
                    .addOnSuccessListener {
                        Toast.makeText(this.context,"DISMISSED : ${notifications.notificationID}",Toast.LENGTH_SHORT).show()
                        val notificationControllerObj = getUserNotifications()
                        notificationControllerObj.getNotifications(view,userID,context)
                    }
                    .addOnFailureListener {
                        Toast.makeText(this.context,"ERROR : ${it.toString()}",Toast.LENGTH_SHORT).show()
                    }
            }catch (e : Exception){
                Toast.makeText(this.context,"ERROR : ${e.toString()}",Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun getItemCount(): Int {
       return notificationItems.size
    }
}