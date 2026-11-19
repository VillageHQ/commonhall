package ai.commonhall.voiceservice

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

// A foreground service for the length of a voice room: Android keeps the app's audio (and, for a member on stage,
// the microphone) running with the screen locked, and shows the room in the notification shade and on the lock
// screen with Mute and Leave. It plays and records nothing itself; LiveKit's WebRTC does the audio.
class VoiceRoomService : Service() {
  companion object {
    const val ACTION_SHOW = "ai.commonhall.voiceservice.SHOW"
    const val ACTION_MUTE = "ai.commonhall.voiceservice.MUTE"
    const val ACTION_LEAVE = "ai.commonhall.voiceservice.LEAVE"
    const val EXTRA_TITLE = "title"
    const val EXTRA_CAN_TALK = "canTalk"
    const val EXTRA_IS_MUTED = "isMuted"
    private const val CHANNEL_ID = "voice-room"
    private const val NOTIFICATION_ID = 4107

    var onAction: ((String) -> Unit)? = null
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_MUTE -> {
        onAction?.invoke("mute")
        return START_NOT_STICKY
      }
      ACTION_LEAVE -> {
        onAction?.invoke("leave")
        return START_NOT_STICKY
      }
    }
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Voice room"
    val canTalk = intent?.getBooleanExtra(EXTRA_CAN_TALK, false) ?: false
    val isMuted = intent?.getBooleanExtra(EXTRA_IS_MUTED, true) ?: true
    val notification = buildNotification(title, canTalk, isMuted)
    // The microphone type only while on stage and allowed: Android 14 stops a service that claims it without the permission.
    val hasMicrophone = canTalk && ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val types = if (hasMicrophone) {
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        } else {
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        }
        startForeground(NOTIFICATION_ID, notification, types)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      stopSelf()
    }
    return START_NOT_STICKY
  }

  private fun buildNotification(title: String, canTalk: Boolean, isMuted: Boolean): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Voice rooms", NotificationManager.IMPORTANCE_LOW))
    }
    val immutable = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let { PendingIntent.getActivity(this, 0, it, immutable) }
    val mute = PendingIntent.getService(this, 1, Intent(this, VoiceRoomService::class.java).setAction(ACTION_MUTE), immutable)
    val leave = PendingIntent.getService(this, 2, Intent(this, VoiceRoomService::class.java).setAction(ACTION_LEAVE), immutable)
    val status = if (!canTalk) "Listening" else if (isMuted) "On stage, muted" else "On stage, talking"
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setContentTitle(title)
      .setContentText(status)
      .setOngoing(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setContentIntent(open)
    if (canTalk) builder.addAction(0, if (isMuted) "Unmute" else "Mute", mute)
    builder.addAction(0, "Leave", leave)
    return builder.build()
  }
}
