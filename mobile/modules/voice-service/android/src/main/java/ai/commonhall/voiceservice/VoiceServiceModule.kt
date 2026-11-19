package ai.commonhall.voiceservice

import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

// JS: start (or update) and stop the voice room service, and hear its lock-screen buttons ("mute", "leave").
class VoiceServiceModule : Module() {
  private val mainThread = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("CommonhallVoiceService")

    Events("onAction")

    OnCreate {
      val weakModule = WeakReference(this@VoiceServiceModule)
      VoiceRoomService.onAction = { action -> weakModule.get()?.sendEvent("onAction", bundleOf("action" to action)) }
    }

    OnDestroy {
      VoiceRoomService.onAction = null
    }

    Function("start") { title: String, canTalk: Boolean, isMuted: Boolean ->
      // A running service is updated in place (allowed from the background); only the first start needs the app open.
      val running = VoiceRoomService.running
      if (running != null) {
        mainThread.post { running.show(title, canTalk, isMuted) }
        return@Function true
      }
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, VoiceRoomService::class.java)
        .setAction(VoiceRoomService.ACTION_SHOW)
        .putExtra(VoiceRoomService.EXTRA_TITLE, title)
        .putExtra(VoiceRoomService.EXTRA_CAN_TALK, canTalk)
        .putExtra(VoiceRoomService.EXTRA_IS_MUTED, isMuted)
      try {
        ContextCompat.startForegroundService(context, intent)
        true
      } catch (error: Exception) {
        // Android refuses a new foreground service from the background; the room still plays while the app is open.
        false
      }
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function false
      context.stopService(Intent(context, VoiceRoomService::class.java))
      true
    }
  }
}
