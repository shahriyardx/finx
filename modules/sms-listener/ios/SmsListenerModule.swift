import ExpoModulesCore

// iOS has no public API to read incoming SMS, so this is a no-op stub that only
// exists so the module resolves on Apple platforms. It never emits events.
public class SmsListenerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmsListener")
    Events("onSmsReceived")
  }
}
