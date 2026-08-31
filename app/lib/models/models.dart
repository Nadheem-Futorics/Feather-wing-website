/// Data models mirroring the website's API DTOs (see site/src/server/repo/*).
/// All content fields are bilingual `{en, ar}` objects.
library;

/// Bilingual text value.
class Bi {
  final String en;
  final String ar;
  const Bi({this.en = '', this.ar = ''});

  factory Bi.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return Bi(en: (json['en'] ?? '') as String, ar: (json['ar'] ?? '') as String);
    }
    if (json is String) return Bi(en: json, ar: json);
    return const Bi();
  }

  /// Text for the given language code, falling back to the other.
  String of(String lang) {
    final primary = lang == 'ar' ? ar : en;
    if (primary.trim().isNotEmpty) return primary;
    return lang == 'ar' ? en : ar;
  }

  bool get isEmpty => en.trim().isEmpty && ar.trim().isEmpty;
}

String _s(dynamic v) => v is String ? v : (v?.toString() ?? '');
int _i(dynamic v) => v is int ? v : (v is num ? v.toInt() : 0);
double? _d(dynamic v) => v is num ? v.toDouble() : null;

class FeaturedTrip {
  final String id;
  final String scene;
  final String hue;
  final Bi title;
  final Bi place;
  final Bi dates;
  final Bi duration;
  final String price;
  final int seats;
  final String category;

  const FeaturedTrip({
    required this.id,
    required this.scene,
    required this.hue,
    required this.title,
    required this.place,
    required this.dates,
    required this.duration,
    required this.price,
    required this.seats,
    required this.category,
  });

  factory FeaturedTrip.fromJson(Map<String, dynamic> j) => FeaturedTrip(
        id: _s(j['id']),
        scene: _s(j['scene']),
        hue: _s(j['hue']),
        title: Bi.fromJson(j['title']),
        place: Bi.fromJson(j['place']),
        dates: Bi.fromJson(j['dates']),
        duration: Bi.fromJson(j['duration']),
        price: _s(j['price']),
        seats: _i(j['seats']),
        category: _s(j['category']),
      );
}

class Offer {
  final String id;
  final String scene;
  final Bi title;
  final Bi subtitle;
  final Bi description;
  final Bi badge;
  final String priceFrom;
  final Bi cta;
  final String validUntil;

  const Offer({
    required this.id,
    required this.scene,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.badge,
    required this.priceFrom,
    required this.cta,
    required this.validUntil,
  });

  factory Offer.fromJson(Map<String, dynamic> j) => Offer(
        id: _s(j['id']),
        scene: _s(j['scene']),
        title: Bi.fromJson(j['title']),
        subtitle: Bi.fromJson(j['subtitle']),
        description: Bi.fromJson(j['description']),
        badge: Bi.fromJson(j['badge']),
        priceFrom: _s(j['priceFrom']),
        cta: Bi.fromJson(j['cta']),
        validUntil: _s(j['validUntil']),
      );
}

class DestinationCard {
  final String id;
  final Bi title;
  final Bi subtitle;
  final bool hasImage;

  const DestinationCard({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.hasImage,
  });

  factory DestinationCard.fromJson(Map<String, dynamic> j) => DestinationCard(
        id: _s(j['id']),
        title: Bi.fromJson(j['title']),
        subtitle: Bi.fromJson(j['subtitle']),
        hasImage: j['hasImage'] == true,
      );

  /// Image endpoint on the website (public, streams the uploaded photo).
  String imageUrl(String baseUrl) => '$baseUrl/api/tp/destinations/image/$id';
}

class TourPackage {
  final String id;
  final Bi title;
  final Bi place;
  final String category;
  final Bi duration;
  final String priceDisplay;
  final double? lat;
  final double? lng;
  final List<String> inclusions;
  final List<String> exclusions;

  const TourPackage({
    required this.id,
    required this.title,
    required this.place,
    required this.category,
    required this.duration,
    required this.priceDisplay,
    required this.lat,
    required this.lng,
    required this.inclusions,
    required this.exclusions,
  });

  factory TourPackage.fromJson(Map<String, dynamic> j) => TourPackage(
        id: _s(j['id']),
        title: Bi.fromJson(j['title']),
        place: Bi.fromJson(j['place']),
        category: _s(j['category']),
        duration: Bi.fromJson(j['duration']),
        priceDisplay: _s(j['priceDisplay']),
        lat: _d(j['lat']),
        lng: _d(j['lng']),
        inclusions: (j['inclusions'] as List?)?.map(_s).toList() ?? const [],
        exclusions: (j['exclusions'] as List?)?.map(_s).toList() ?? const [],
      );
}

class Profile {
  final String id;
  final String displayName;
  final String? email;

  const Profile({required this.id, required this.displayName, this.email});

  factory Profile.fromJson(Map<String, dynamic> j) => Profile(
        id: _s(j['id']),
        displayName: _s(j['displayName']),
        email: j['email'] as String?,
      );
}

class Trip {
  final String id;
  final String name;
  final String? origin;
  final String? startDate;
  final String? endDate;
  final int adults;
  final int children;
  final String partyType;
  final String currency;
  final double? budgetTotal;
  final String pace;
  final String status;

  const Trip({
    required this.id,
    required this.name,
    this.origin,
    this.startDate,
    this.endDate,
    required this.adults,
    required this.children,
    required this.partyType,
    required this.currency,
    this.budgetTotal,
    required this.pace,
    required this.status,
  });

  factory Trip.fromJson(Map<String, dynamic> j) => Trip(
        id: _s(j['id']),
        name: _s(j['name']),
        origin: j['origin'] as String?,
        startDate: j['startDate'] as String?,
        endDate: j['endDate'] as String?,
        adults: _i(j['adults']),
        children: _i(j['children']),
        partyType: _s(j['partyType']),
        currency: _s(j['currency']),
        budgetTotal: _d(j['budgetTotal']),
        pace: _s(j['pace']),
        status: _s(j['status']),
      );

  int get travellers => adults + children;
}

class TripDay {
  final String id;
  final String? date;
  final int dayIndex;
  final String? title;
  final String? notes;

  const TripDay({required this.id, this.date, required this.dayIndex, this.title, this.notes});

  factory TripDay.fromJson(Map<String, dynamic> j) => TripDay(
        id: _s(j['id']),
        date: j['date'] as String?,
        dayIndex: _i(j['dayIndex']),
        title: j['title'] as String?,
        notes: j['notes'] as String?,
      );
}

class ItineraryItem {
  final String id;
  final String? dayId;
  final String name;
  final String category;
  final String? address;
  final String? startTime;
  final String? endTime;
  final int? durationMin;
  final double? cost;
  final String? currency;
  final String? notes;
  final bool completed;
  final String priority;
  final String? slot;
  final int sortOrder;

  const ItineraryItem({
    required this.id,
    this.dayId,
    required this.name,
    required this.category,
    this.address,
    this.startTime,
    this.endTime,
    this.durationMin,
    this.cost,
    this.currency,
    this.notes,
    required this.completed,
    required this.priority,
    this.slot,
    required this.sortOrder,
  });

  factory ItineraryItem.fromJson(Map<String, dynamic> j) => ItineraryItem(
        id: _s(j['id']),
        dayId: j['dayId'] as String?,
        name: _s(j['name']),
        category: _s(j['category']),
        address: j['address'] as String?,
        startTime: j['startTime'] as String?,
        endTime: j['endTime'] as String?,
        durationMin: j['durationMin'] is num ? (j['durationMin'] as num).toInt() : null,
        cost: _d(j['cost']),
        currency: j['currency'] as String?,
        notes: j['notes'] as String?,
        completed: j['completed'] == true,
        priority: _s(j['priority']),
        slot: j['slot'] as String?,
        sortOrder: _i(j['sortOrder']),
      );
}

/// Full trip workspace payload from GET /api/tp/trips/[tripId].
class TripBundle {
  final Trip trip;
  final String role;
  final List<TripDay> days;
  final List<ItineraryItem> items;
  final int memberCount;

  const TripBundle({
    required this.trip,
    required this.role,
    required this.days,
    required this.items,
    required this.memberCount,
  });

  factory TripBundle.fromJson(Map<String, dynamic> j) => TripBundle(
        trip: Trip.fromJson((j['trip'] as Map).cast<String, dynamic>()),
        role: _s(j['role']),
        days: (j['days'] as List? ?? const [])
            .map((e) => TripDay.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        items: (j['items'] as List? ?? const [])
            .map((e) => ItineraryItem.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        memberCount: (j['members'] as List?)?.length ?? 1,
      );

  List<ItineraryItem> itemsForDay(String dayId) =>
      items.where((i) => i.dayId == dayId).toList()..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
}

/// One streaming event from the concierge NDJSON endpoint.
class ConciergeEvent {
  final String type; // meta | text | error | done ...
  final String text;
  final String provider;

  const ConciergeEvent({required this.type, this.text = '', this.provider = ''});

  factory ConciergeEvent.fromJson(Map<String, dynamic> j) => ConciergeEvent(
        type: _s(j['type']),
        text: _s(j['text'] ?? j['delta'] ?? j['message']),
        provider: _s(j['provider']),
      );
}
