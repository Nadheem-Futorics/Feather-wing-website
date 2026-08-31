import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'trip_detail_screen.dart';
import 'trip_new_screen.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  late Future<(List<Trip>, Profile?)> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().api.trips();
  }

  void _reload() {
    setState(() {
      _future = context.read<AppState>().api.trips();
    });
  }

  Future<void> _newTrip() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const TripNewScreen()),
    );
    if (created == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(t.t('trips.title')),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 84),
        child: Pressable(
          onTap: _newTrip,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Brand.gold.withValues(alpha: 0.45),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.add_rounded, color: Brand.ink, size: 20),
                const SizedBox(width: 6),
                Text(t.t('trips.new'),
                    style: const TextStyle(
                        color: Brand.ink, fontWeight: FontWeight.w800, fontSize: 14.5)),
              ],
            ),
          ),
        ),
      ),
      body: FutureBuilder(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 130),
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 4,
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (_, __) =>
                  const Shimmer(height: 110, radius: BorderRadius.all(Radius.circular(22))),
            );
          }
          if (snapshot.hasError) {
            return ErrorView(
                message: t.t('common.error'), retryLabel: t.t('common.retry'), onRetry: _reload);
          }
          final (trips, _) = snapshot.data!;
          if (trips.isEmpty) {
            return EmptyView(icon: Icons.map_outlined, message: t.t('trips.empty'));
          }
          return RefreshIndicator(
            color: Brand.gold,
            backgroundColor: Brand.navy,
            onRefresh: () async => _reload(),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 160),
              itemCount: trips.length,
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (context, i) {
                final trip = trips[i];
                final hue = ['gold', 'violet', 'aqua', 'green', 'rose'][i % 5];
                return FadeSlideIn(
                  delay: Duration(milliseconds: 60 * (i % 8)),
                  child: Pressable(
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) =>
                                TripDetailScreen(tripId: trip.id, tripName: trip.name)),
                      );
                      _reload();
                    },
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(22),
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: DecoratedBox(
                              decoration: BoxDecoration(gradient: hueGradient(hue)),
                            ),
                          ),
                          Positioned.fill(
                            child: Image.asset(
                              'assets/scenes/${[
                                'canyon',
                                'maldives',
                                'istanbul',
                                'mountains',
                                'coast-city'
                              ][i % 5]}.jpg',
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                            ),
                          ),
                          Positioned.fill(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: AlignmentDirectional.centerStart,
                                  end: AlignmentDirectional.centerEnd,
                                  colors: [
                                    Brand.ink.withValues(alpha: 0.72),
                                    Brand.ink.withValues(alpha: 0.25),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(18),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(trip.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: Theme.of(context).textTheme.titleLarge),
                                      const SizedBox(height: 7),
                                      Wrap(
                                        spacing: 12,
                                        runSpacing: 4,
                                        children: [
                                          if (trip.startDate != null)
                                            _meta(Icons.calendar_today_rounded,
                                                trip.startDate!),
                                          _meta(Icons.people_rounded,
                                              '${trip.travellers} ${t.t('trips.travellers')}'),
                                          _meta(Icons.flag_rounded, trip.status),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                        color: Brand.gold.withValues(alpha: 0.5)),
                                  ),
                                  child: const Icon(Icons.arrow_forward_rounded,
                                      size: 16, color: Brand.goldLight),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _meta(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: Brand.goldLight),
        const SizedBox(width: 4),
        Text(text,
            style: TextStyle(fontSize: 12, color: Brand.ivory.withValues(alpha: 0.85))),
      ],
    );
  }
}
