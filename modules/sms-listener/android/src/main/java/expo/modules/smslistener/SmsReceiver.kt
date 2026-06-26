package expo.modules.smslistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.facebook.react.HeadlessJsTaskService

/**
 * Manifest-declared receiver so the OS delivers incoming SMS even when the app
 * has been swiped away. Hands the message to a headless JS task that does the
 * actual bank-SMS import. Runtime SMS listening (while the app is open) is
 * handled separately by [SmsListenerModule].
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return

    val sender = messages[0].displayOriginatingAddress ?: ""
    val body = StringBuilder()
    for (m in messages) body.append(m.messageBody ?: "")

    val service = Intent(ctx, SmsHeadlessTaskService::class.java).apply {
      putExtra("sender", sender)
      putExtra("body", body.toString())
    }
    ctx.startService(service)
    HeadlessJsTaskService.acquireWakeLockNow(ctx)
  }
}
