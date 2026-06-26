package expo.modules.smslistener

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the JS "SmsImportTask" (registered in index.js) with the incoming SMS.
 * allowedInForeground = true so a single code path imports whether the app is
 * killed, backgrounded, or open.
 */
class SmsHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      "SmsImportTask",
      Arguments.fromBundle(extras),
      30000,
      true,
    )
  }
}
