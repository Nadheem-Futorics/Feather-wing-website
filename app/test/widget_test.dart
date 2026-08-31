import 'package:flutter_test/flutter_test.dart';

import 'package:feather_wing_tours/models/models.dart';

void main() {
  group('Bi (bilingual text)', () {
    test('parses {en, ar} maps and falls back across languages', () {
      final bi = Bi.fromJson({'en': 'AlUla', 'ar': 'العلا'});
      expect(bi.of('en'), 'AlUla');
      expect(bi.of('ar'), 'العلا');

      final onlyEn = Bi.fromJson({'en': 'Riyadh', 'ar': ''});
      expect(onlyEn.of('ar'), 'Riyadh'); // falls back to the other language
    });
  });

  group('DTO parsing', () {
    test('FeaturedTrip parses the website payload shape', () {
      final trip = FeaturedTrip.fromJson({
        'id': 't1',
        'scene': 'canyon',
        'hue': 'sand',
        'title': {'en': 'AlUla Adventure', 'ar': 'مغامرة العلا'},
        'place': {'en': 'AlUla', 'ar': 'العلا'},
        'dates': {'en': 'Oct 2026', 'ar': 'أكتوبر ٢٠٢٦'},
        'duration': {'en': '4 days', 'ar': '٤ أيام'},
        'price': 'SAR 2,950',
        'seats': 12,
        'category': 'saudi',
      });
      expect(trip.title.of('en'), 'AlUla Adventure');
      expect(trip.seats, 12);
    });

    test('TripBundle groups items by day', () {
      final bundle = TripBundle.fromJson({
        'trip': {
          'id': 'trip1',
          'name': 'Test trip',
          'adults': 2,
          'children': 1,
          'partyType': 'family',
          'currency': 'SAR',
          'pace': 'balanced',
          'status': 'planning',
        },
        'role': 'owner',
        'days': [
          {'id': 'd1', 'dayIndex': 0},
          {'id': 'd2', 'dayIndex': 1},
        ],
        'items': [
          {'id': 'i1', 'dayId': 'd1', 'name': 'Old Town walk', 'category': 'culture', 'sortOrder': 1},
          {'id': 'i2', 'dayId': 'd1', 'name': 'Breakfast', 'category': 'food', 'sortOrder': 0},
        ],
        'members': [
          {'id': 'm1'},
        ],
      });
      expect(bundle.trip.travellers, 3);
      expect(bundle.days.length, 2);
      final day1 = bundle.itemsForDay('d1');
      expect(day1.map((i) => i.name).toList(), ['Breakfast', 'Old Town walk']); // sorted
      expect(bundle.itemsForDay('d2'), isEmpty);
    });
  });
}
