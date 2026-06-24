package expo.modules.smslistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Emits an `onSmsReceived` event with `{ sender, body }` for every incoming SMS
 * while a JS listener is attached. Multipart messages are concatenated into one
 * body. Requires the RECEIVE_SMS permission (granted at runtime from JS).
 */
class SmsListenerModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("SmsListener")

    Events("onSmsReceived")

    OnStartObserving { registerReceiver() }
    OnStopObserving { unregisterReceiver() }
    OnDestroy { unregisterReceiver() }
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private fun registerReceiver() {
    if (receiver != null) return
    val r = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return
        val sender = messages[0].displayOriginatingAddress ?: ""
        val body = StringBuilder()
        for (m in messages) body.append(m.messageBody ?: "")
        sendEvent("onSmsReceived", mapOf("sender" to sender, "body" to body.toString()))
      }
    }
    val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      context.registerReceiver(r, filter)
    }
    receiver = r
  }

  private fun unregisterReceiver() {
    receiver?.let {
      runCatching { context.unregisterReceiver(it) }
    }
    receiver = null
  }
}
