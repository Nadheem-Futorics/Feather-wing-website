import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  ApiException(this.status, this.code, this.message);

  @override
  String toString() => 'ApiException($status $code): $message';
}

/// HTTP client for the website API.
///
/// The site authenticates guests with a signed session cookie (`fwt_session`)
/// that the server creates automatically on the first `/api/tp/*` request.
/// Mobile HTTP clients have no cookie jar, so this client captures
/// `Set-Cookie` headers and replays them, persisting across launches — the
/// device keeps one long-lived guest identity, same as a browser.
class ApiClient {
  String baseUrl;
  final Map<String, String> _cookies = {};
  SharedPreferences? _prefs;
  Future<void>? _initFuture;

  ApiClient({required this.baseUrl});

  static const _cookiePrefsKey = 'fwt.cookies';

  /// Loads the persisted cookie store exactly once. Every request awaits this,
  /// so a cold-start request can never race ahead of the saved session cookie
  /// (which would make the server mint a fresh guest identity and clobber the
  /// stored one).
  Future<void> init() => _initFuture ??= _doInit();

  Future<void> _doInit() async {
    _prefs = await SharedPreferences.getInstance();
    final raw = _prefs?.getString(_cookiePrefsKey);
    if (raw != null) {
      try {
        (jsonDecode(raw) as Map<String, dynamic>).forEach((k, v) {
          if (v is String) _cookies[k] = v;
        });
      } catch (_) {/* corrupt store — start fresh */}
    }
  }

  Map<String, String> _headers({bool json = true}) => {
        if (json) 'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_cookies.isNotEmpty)
          'Cookie': _cookies.entries.map((e) => '${e.key}=${e.value}').join('; '),
      };

  void _captureCookies(http.BaseResponse res) {
    // http joins multiple Set-Cookie headers with ", " — split carefully:
    // a new cookie starts after ", " followed by `name=`. Expires dates also
    // contain commas, so only split where a token=value follows.
    final setCookie = res.headers['set-cookie'];
    if (setCookie == null) return;
    final parts = setCookie.split(RegExp(r',(?=\s*[A-Za-z0-9_\-]+=)'));
    var changed = false;
    for (final part in parts) {
      final first = part.split(';').first.trim();
      final eq = first.indexOf('=');
      if (eq <= 0) continue;
      final name = first.substring(0, eq).trim();
      final value = first.substring(eq + 1).trim();
      if (name.isEmpty) continue;
      _cookies[name] = value;
      changed = true;
    }
    if (changed) {
      _prefs?.setString(_cookiePrefsKey, jsonEncode(_cookies));
    }
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  /// Performs a request and unwraps the `{ok, data}` envelope.
  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
  }) async {
    await init();
    final req = http.Request(method, _uri(path, query));
    req.headers.addAll(_headers());
    if (body != null) req.body = jsonEncode(body);
    final streamed = await req.send().timeout(const Duration(seconds: 30));
    final res = await http.Response.fromStream(streamed);
    _captureCookies(res);

    Map<String, dynamic> decoded;
    try {
      decoded = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(res.statusCode, 'bad_response', 'Unexpected server response.');
    }
    if (res.statusCode >= 400 || decoded['ok'] == false) {
      throw ApiException(
        res.statusCode,
        (decoded['error'] ?? 'error').toString(),
        (decoded['message'] ?? 'Request failed.').toString(),
      );
    }
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    return decoded; // endpoints outside the envelope (e.g. /api/enquiry)
  }

  // ── Public content ──

  Future<List<FeaturedTrip>> featuredTrips() async {
    final data = await _request('GET', '/api/tp/featured-trips');
    return (data['trips'] as List? ?? const [])
        .map((e) => FeaturedTrip.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<Offer>> offers() async {
    final data = await _request('GET', '/api/tp/offers');
    return (data['offers'] as List? ?? const [])
        .map((e) => Offer.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<DestinationCard>> destinations() async {
    final data = await _request('GET', '/api/tp/destinations');
    return (data['destinations'] as List? ?? const [])
        .map((e) => DestinationCard.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<TourPackage>> packages({String? category}) async {
    final data = await _request('GET', '/api/tp/packages',
        query: category == null ? null : {'category': category});
    return (data['packages'] as List? ?? const [])
        .map((e) => TourPackage.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  // ── Profile / session ──

  Future<Profile> profile() async {
    final data = await _request('GET', '/api/tp/profile');
    return Profile.fromJson((data['profile'] as Map).cast<String, dynamic>());
  }

  Future<void> updateProfile({String? displayName, String? email}) async {
    await _request('PATCH', '/api/tp/profile', body: {
      if (displayName != null) 'displayName': displayName,
      if (email != null) 'email': email,
    });
  }

  // ── Trip planner ──

  Future<(List<Trip>, Profile?)> trips() async {
    final data = await _request('GET', '/api/tp/trips');
    final list = (data['trips'] as List? ?? const [])
        .map((e) => Trip.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    Profile? me;
    if (data['profile'] is Map) {
      me = Profile.fromJson((data['profile'] as Map).cast<String, dynamic>());
    }
    return (list, me);
  }

  Future<Trip> createTrip(Map<String, dynamic> input) async {
    final data = await _request('POST', '/api/tp/trips', body: input);
    return Trip.fromJson((data['trip'] as Map).cast<String, dynamic>());
  }

  Future<TripBundle> tripBundle(String tripId) async {
    final data = await _request('GET', '/api/tp/trips/$tripId');
    return TripBundle.fromJson(data);
  }

  // ── Enquiry (homepage contact form → CRM lead inbox) ──

  Future<void> sendEnquiry({
    required String name,
    required String email,
    required String mobile,
    required String service,
    String? message,
    required int elapsedMs,
  }) async {
    await init();
    final res = await http
        .post(
          _uri('/api/enquiry'),
          headers: _headers(),
          body: jsonEncode({
            'name': name,
            'email': email,
            'mobile': mobile,
            'service': service,
            if (message != null && message.isNotEmpty) 'message': message,
            'website': '', // honeypot must stay empty
            'elapsedMs': elapsedMs,
          }),
        )
        .timeout(const Duration(seconds: 30));
    _captureCookies(res);
    final decoded = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400 || decoded['ok'] != true) {
      throw ApiException(res.statusCode, (decoded['error'] ?? 'error').toString(),
          'Could not send your enquiry. Please try again.');
    }
  }

  // ── Concierge chat (streaming NDJSON) ──

  Stream<ConciergeEvent> conciergeChat({
    required List<Map<String, String>> messages,
    required String lang,
  }) async* {
    await init();
    final req = http.Request('POST', _uri('/api/concierge'));
    req.headers.addAll(_headers());
    req.body = jsonEncode({'messages': messages, 'lang': lang});
    final res = await req.send().timeout(const Duration(seconds: 60));
    _captureCookies(res);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, 'concierge', 'The concierge is unavailable right now.');
    }
    var buffer = '';
    await for (final chunk in res.stream.transform(utf8.decoder)) {
      buffer += chunk;
      while (true) {
        final nl = buffer.indexOf('\n');
        if (nl < 0) break;
        final line = buffer.substring(0, nl).trim();
        buffer = buffer.substring(nl + 1);
        if (line.isEmpty) continue;
        try {
          yield ConciergeEvent.fromJson(jsonDecode(line) as Map<String, dynamic>);
        } catch (_) {/* skip malformed line */}
      }
    }
    if (buffer.trim().isNotEmpty) {
      try {
        yield ConciergeEvent.fromJson(jsonDecode(buffer.trim()) as Map<String, dynamic>);
      } catch (_) {}
    }
  }
}
