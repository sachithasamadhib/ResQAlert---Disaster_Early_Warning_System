package com.example.mad_day3.Controller

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.mad_day3.R

private const val CHANNEL_ID = "app_notifications"
private const val CHANNEL_NAME = "App Notifications"
private const val CHANNEL_DESC = "Notifications from the app"

class NotificationHelper(private val context: Context) {
    init {
        createNotificationChannel()
    }
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Use HIGH importance for heads-up notifications
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                // Enable lights, vibration, and sound for heads-up notifications
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(100, 200, 300, 400, 500, 400, 300, 200, 100)
                // Use default notification sound
                setSound(
                    Settings.System.DEFAULT_NOTIFICATION_URI, AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build())
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun showNotification(
        notificationId: Int,
        title: String,
        message: String,
        intent: Intent? = null
    ) {
        // Check if we have permission to show notifications
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                Log.d("Notification", "Notification permission not granted")
                return
            }
        }

        // Create pending intent
        val pendingIntent = if (intent != null) {
            PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        // Build notification with heads-up properties
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH) // High priority for heads-up
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            // Add these for heads-up notification
            .setFullScreenIntent(pendingIntent, true) // This is key for heads-up on some devices
            .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound, vibration, etc.
            .setVibrate(longArrayOf(100, 200, 300, 400, 500, 400, 300, 200, 100)) // Custom vibration

        // Show notification
        with(NotificationManagerCompat.from(context)) {
            try {
                notify(notificationId, builder.build())
                Log.d("Notification", "Heads-up notification shown successfully")
            } catch (e: SecurityException) {
                Log.e("Notification", "SecurityException: ${e.message}")
            }
        }
    }
}

//class NotificationHelper(private val context: Context) {
//
//    init {
//        createNotificationChannel()
//    }
//
//    private fun createNotificationChannel() {
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
//            val importance = NotificationManager.IMPORTANCE_DEFAULT
//            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
//                description = CHANNEL_DESC
//            }
//            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
//            notificationManager.createNotificationChannel(channel)
//        }
//    }
//
//    fun showNotification(
//        notificationId: Int,
//        title: String,
//        message: String,
//        intent: Intent? = null
//    ) {
//        // Check if we have permission to show notifications
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
//            if (ContextCompat.checkSelfPermission(
//                    context,
//                    Manifest.permission.POST_NOTIFICATIONS
//                ) != PackageManager.PERMISSION_GRANTED
//            ) {
//                Log.d("Notification", "Notification permission not granted")
//                return
//            }
//        }
//
//        // Create pending intent
//        val pendingIntent = if (intent != null) {
//            PendingIntent.getActivity(
//                context,
//                0,
//                intent,
//                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
//            )
//        } else {
//            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
//            PendingIntent.getActivity(
//                context,
//                0,
//                launchIntent,
//                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
//            )
//        }
//
//        // Build notification
//        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
//            .setSmallIcon(R.drawable.ic_notification)
//            .setContentTitle(title)
//            .setContentText(message)
//            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
//            .setContentIntent(pendingIntent)
//            .setAutoCancel(true)
//            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
//
//        // Show notification
//        with(NotificationManagerCompat.from(context)) {
//            try {
//                notify(notificationId, builder.build())
//                Log.d("Notification", "Notification shown successfully")
//            } catch (e: SecurityException) {
//                Log.e("Notification", "SecurityException: ${e.message}")
//            }
//        }
//    }
//}