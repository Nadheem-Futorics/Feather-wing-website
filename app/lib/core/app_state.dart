import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import 'api_client.dart';
import 'config.dart';
import 'l10n.dart';

/// App-wide state: language, server URL, and the guest profile.
class AppState extends ChangeNotifier {
  final ApiClient api;
  SharedPreferences? _prefs;

  String _lang = 'en';
  Profile? profile;

  /// Bumped whenever the data source changes (server URL). Screens are keyed
  /// on it so they rebuild and refetch instead of showing the old server's
  /// data until the user manually pulls to refresh.
  int dataEpoch = 0;

  AppState() : api = ApiClient(baseUrl: AppConfig.defaultBaseUrl);

  String get lang => _lang;
  L10n get l10n => L10n(_lang);
  Locale get locale => Locale(_lang);
  TextDirection get direction => _lang == 'ar' ? TextDirection.rtl : TextDirection.ltr;
  String get baseUrl => api.baseUrl;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _lang = _prefs?.getString('fwt.lang') ?? 'en';
    final savedUrl = _prefs?.getString('fwt.baseUrl');
    if (savedUrl != null && savedUrl.isNotEmpty) api.baseUrl = savedUrl;
    await api.init();
    notifyListeners();
    // Fetch the guest profile in the background; failures are non-fatal
    // (e.g. server not reachable yet).
    try {
      profile = await api.profile();
      notifyListeners();
    } catch (_) {}
  }

  void setLang(String value) {
    if (value == _lang) return;
    _lang = value;
    _prefs?.setString('fwt.lang', value);
    notifyListeners();
  }

  void setBaseUrl(String value) {
    var v = value.trim();
    if (v.endsWith('/')) v = v.substring(0, v.length - 1);
    if (v.isEmpty || v == api.baseUrl) return;
    api.baseUrl = v;
    _prefs?.setString('fwt.baseUrl', v);
    dataEpoch++;
    notifyListeners();
    // The new server issues its own guest session.
    api.profile().then((p) {
      profile = p;
      notifyListeners();
    }).catchError((_) {});
  }

  Future<void> saveProfile({String? displayName, String? email}) async {
    await api.updateProfile(displayName: displayName, email: email);
    profile = await api.profile();
    notifyListeners();
  }
}
