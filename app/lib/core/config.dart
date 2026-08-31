import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// Server configuration.
///
/// The app talks to the Feather Wing Tours website API (`/api/tp/*`,
/// `/api/enquiry`, `/api/concierge`). The base URL can be:
///  1. overridden at build time: `flutter run --dart-define=FWT_BASE_URL=https://your.app`
///  2. changed at runtime from the Settings screen (persisted).
class AppConfig {
  static const String _defineBaseUrl = String.fromEnvironment('FWT_BASE_URL');

  /// The live Feather Wing Tours website (Railway deployment).
  static const String productionUrl =
      'https://feather-wing-tours-production.up.railway.app';

  /// Default server: the production website. Override for local development
  /// with --dart-define=FWT_BASE_URL=http://10.0.2.2:3000 (Android emulator →
  /// host machine) or from the Settings screen at runtime.
  static String get defaultBaseUrl {
    if (_defineBaseUrl.isNotEmpty) return _defineBaseUrl;
    return productionUrl;
  }

  /// Convenience for the Settings screen: local dev URL for this platform.
  static String get localDevUrl {
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }
}
