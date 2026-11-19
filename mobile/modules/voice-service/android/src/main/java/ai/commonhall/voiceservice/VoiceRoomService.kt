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
import androidx.annotation.RequiresApi
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

    // The running service, so a change (invited up, muted) updates it in place: Android refuses to start a
    // foreground service from the background, but a running one may change its notification and types.
    @Volatile
    var running: VoiceRoomService? = null
  }

  private var isForeground = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    running = this
  }

  override fun onDestroy() {
    running = null
    isForeground = false
    super.onDestroy()
  }

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
    show(
      intent?.getStringExtra(EXTRA_TITLE) ?: "Voice room",
      intent?.getBooleanExtra(EXTRA_CAN_TALK, false) ?: false,
      intent?.getBooleanExtra(EXTRA_IS_MUTED, true) ?: true,
    )
    return START_NOT_STICKY
  }

  // Shows the room, or updates it. The microphone type only while on stage and allowed (Android 14 refuses it
  // without the permission, and from the background); if refused, the room keeps playing as media.
  fun show(title: String, canTalk: Boolean, isMuted: Boolean) {
    val notification = buildNotification(title, canTalk, isMuted)
    val hasMicrophone = canTalk && ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification)
      isForeground = true
      return
    }
    val playback = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
    val types = if (hasMicrophone) playback or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE else playback
    if (tryStartForeground(notification, types) || (types != playback && tryStartForeground(notification, playback))) {
      isForeground = true
      return
    }
    if (isForeground) {
      // Already running: keep going and just refresh what the notification says.
      getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
    } else {
      stopSelf()
    }
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private fun tryStartForeground(notification: Notification, types: Int): Boolean =
    try {
      startForeground(NOTIFICATION_ID, notification, types)
      true
    } catch (error: Exception) {
      false
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
      .setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setContentIntent(open)
    if (canTalk) builder.addAction(0, if (isMuted) "Unmute" else "Mute", mute)
    builder.addAction(0, "Leave", leave)
    return builder.build()
  }
}
