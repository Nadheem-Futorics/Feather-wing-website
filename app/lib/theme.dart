import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Brand palette — mirrors the website's globals.css.
abstract class Brand {
  static const ink = Color(0xFF030611); // near-black midnight navy
  static const navy = Color(0xFF09122D); // deep navy
  static const purple = Color(0xFF4B3194); // royal purple
  static const violet = Color(0xFF7355D8); // soft violet
  static const gold = Color(0xFFE5A52E); // warm gold
  static const goldLight = Color(0xFFF7CB6C); // light gold
  static const ivory = Color(0xFFF5F1E8); // soft ivory
  static const card = Color(0xFF0E1938); // elevated navy surface
  static const cardBorder = Color(0x33F7CB6C);
}

/// Gradient pairs for the illustrated "scene"/"hue" cards used by featured
/// trips and offers on the website (the site renders SVG scenes; the app
/// renders branded gradients with an icon).
LinearGradient hueGradient(String hue) {
  Color a, b;
  switch (hue) {
    case 'gold':
      a = const Color(0xFF7A5A18);
      b = const Color(0xFFE5A52E);
    case 'sand':
      a = const Color(0xFF6B5230);
      b = const Color(0xFFC9A26A);
    case 'aqua':
      a = const Color(0xFF0B4F5E);
      b = const Color(0xFF3AA7B8);
    case 'green':
      a = const Color(0xFF14532D);
      b = const Color(0xFF3E9B63);
    case 'violet':
      a = Brand.purple;
      b = Brand.violet;
    case 'rose':
      a = const Color(0xFF6E2440);
      b = const Color(0xFFC85C82);
    case 'navy':
    default:
      a = Brand.navy;
      b = const Color(0xFF23407C);
  }
  return LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [a, b]);
}

/// Bundled photo for a website "scene" id (assets/scenes/*.jpg, sourced from
/// Wikimedia Commons — see CREDITS.txt). Returns null for unknown scenes so
/// callers can fall back to the branded gradient.
const _sceneAssets = {
  'canyon', 'elephant-rock', 'hegra', 'dunes', 'serene-city', 'istanbul',
  'maldives', 'mountains', 'skyline', 'sea', 'island', 'heritage',
  'coast-city', 'globe', 'london', 'paris', 'dubai', 'switzerland',
  'newyork', 'japan',
};

String? sceneAsset(String scene) =>
    _sceneAssets.contains(scene) ? 'assets/scenes/$scene.jpg' : null;

/// Best scene for a package: match destination keywords in the title/place
/// first, then fall back to the category default.
String sceneForPackage({required String text, String? category}) {
  final s = text.toLowerCase();
  const keywords = <String, String>{
    'alula': 'hegra',
    'hegra': 'hegra',
    'ula': 'canyon',
    'empty quarter': 'dunes',
    'rub': 'dunes',
    'khali': 'dunes',
    'umrah': 'serene-city',
    'makkah': 'serene-city',
    'mecca': 'serene-city',
    'madinah': 'serene-city',
    'istanbul': 'istanbul',
    'türkiye': 'istanbul',
    'turkey': 'istanbul',
    'maldives': 'maldives',
    'asir': 'mountains',
    'abha': 'mountains',
    'riyadh': 'skyline',
    'red sea': 'sea',
    'jeddah': 'coast-city',
    'diriyah': 'heritage',
    'london': 'london',
    'paris': 'paris',
    'dubai': 'dubai',
    'switzerland': 'switzerland',
    'alps': 'switzerland',
    'new york': 'newyork',
    'japan': 'japan',
    'fuji': 'japan',
  };
  for (final e in keywords.entries) {
    if (s.contains(e.key)) return e.value;
  }
  return categoryScene(category);
}

/// Scene image for a package category (packages have no scene field).
String categoryScene(String? category) {
  switch (category) {
    case 'saudi':
      return 'hegra';
    case 'international':
      return 'paris';
    case 'islamic':
      return 'serene-city';
    case 'desert':
      return 'dunes';
    case 'group':
      return 'mountains';
    case 'corporate':
      return 'skyline';
    default:
      return 'globe';
  }
}

IconData sceneIcon(String scene) {
  switch (scene) {
    case 'dunes':
    case 'canyon':
    case 'elephant-rock':
    case 'hegra':
      return Icons.landscape_rounded;
    case 'maldives':
    case 'island':
    case 'sea':
    case 'coast-city':
      return Icons.beach_access_rounded;
    case 'mountains':
    case 'switzerland':
      return Icons.terrain_rounded;
    case 'istanbul':
    case 'heritage':
      return Icons.mosque_rounded;
    case 'skyline':
    case 'dubai':
    case 'newyork':
      return Icons.location_city_rounded;
    case 'london':
    case 'paris':
      return Icons.account_balance_rounded;
    case 'japan':
      return Icons.temple_buddhist_rounded;
    case 'globe':
      return Icons.public_rounded;
    case 'serene-city':
    default:
      return Icons.travel_explore_rounded;
  }
}

ThemeData buildTheme(String lang) {
  final isAr = lang == 'ar';
  final headingFont = isAr ? GoogleFonts.reemKufi : GoogleFonts.reemKufi;
  final bodyBase = isAr ? GoogleFonts.tajawalTextTheme() : GoogleFonts.tajawalTextTheme();

  final scheme = ColorScheme.dark(
    primary: Brand.gold,
    onPrimary: Brand.ink,
    secondary: Brand.violet,
    onSecondary: Colors.white,
    surface: Brand.navy,
    onSurface: Brand.ivory,
    surfaceContainerHighest: Brand.card,
    error: const Color(0xFFEF6A6A),
  );

  // Reem Kufi's Arabic glyphs sit low in the line box; without extra leading
  // their descenders clip against the next element.
  final headingLeading = isAr ? 1.45 : 1.2;

  final textTheme = bodyBase.apply(bodyColor: Brand.ivory, displayColor: Brand.ivory).copyWith(
        headlineLarge:
            headingFont(fontSize: 32, fontWeight: FontWeight.w700, color: Brand.ivory, height: headingLeading),
        headlineMedium:
            headingFont(fontSize: 26, fontWeight: FontWeight.w700, color: Brand.ivory, height: headingLeading),
        headlineSmall:
            headingFont(fontSize: 22, fontWeight: FontWeight.w600, color: Brand.ivory, height: headingLeading),
        titleLarge:
            headingFont(fontSize: 20, fontWeight: FontWeight.w600, color: Brand.ivory, height: headingLeading),
        titleMedium:
            headingFont(fontSize: 17, fontWeight: FontWeight.w600, color: Brand.ivory, height: headingLeading),
      );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Brand.ink,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: Brand.ink,
      foregroundColor: Brand.ivory,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: textTheme.headlineSmall,
    ),
    cardTheme: const CardThemeData(
      color: Brand.card,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        side: BorderSide(color: Brand.cardBorder, width: 0.6),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Brand.navy,
      indicatorColor: Brand.gold.withValues(alpha: 0.18),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected) ? Brand.goldLight : Brand.ivory.withValues(alpha: 0.7),
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => textTheme.labelMedium!.copyWith(
          color: states.contains(WidgetState.selected) ? Brand.goldLight : Brand.ivory.withValues(alpha: 0.7),
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.gold,
        foregroundColor: Brand.ink,
        textStyle: textTheme.titleMedium?.copyWith(color: Brand.ink),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Brand.goldLight,
        side: const BorderSide(color: Brand.gold),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Brand.card,
      hintStyle: TextStyle(color: Brand.ivory.withValues(alpha: 0.4)),
      labelStyle: TextStyle(color: Brand.ivory.withValues(alpha: 0.8)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.cardBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.gold, width: 1.4),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Brand.card,
      selectedColor: Brand.gold.withValues(alpha: 0.25),
      labelStyle: TextStyle(color: Brand.ivory.withValues(alpha: 0.9)),
      side: const BorderSide(color: Brand.cardBorder),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    dividerTheme: DividerThemeData(color: Brand.ivory.withValues(alpha: 0.08)),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: Brand.card,
      contentTextStyle: textTheme.bodyMedium,
      behavior: SnackBarBehavior.floating,
    ),
  );
}
