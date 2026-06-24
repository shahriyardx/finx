Pod::Spec.new do |s|
  s.name           = 'SmsListenerModule'
  s.version        = '1.0.0'
  s.summary        = 'Incoming SMS listener (Android only; iOS is a no-op stub)'
  s.description    = 'Emits onSmsReceived events for incoming SMS on Android.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
