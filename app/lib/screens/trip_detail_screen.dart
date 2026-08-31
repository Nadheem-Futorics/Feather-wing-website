import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_state.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';

/// Read-only itinerary shown as a day-by-day timeline. Full editing lives in
/// the website's planner workspace, which this screen links to.
class TripDetailScreen extends StatefulWidget {
  final String tripId;
  final String tripName;
  const TripDetailScreen({super.key, required this.tripId, required this.tripName});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  late Future<TripBundle> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().api.tripBundle(widget.tripId);
  }

  void _reload() {
    setState(() {
      _future = context.read<AppState>().api.tripBundle(widget.tripId);
    });
  }

  IconData _categoryIcon(String category) {
    switch (category) {
      case 'food':
      case 'restaurant':
        return Icons.restaurant_rounded;
      case 'hotel':
      case 'lodging':
        return Icons.hotel_rounded;
      case 'flight':
      case 'transport':
        return Icons.directions_car_rounded;
      case 'shopping':
        return Icons.shopping_bag_rounded;
      case 'nature':
        return Icons.park_rounded;
      case 'culture':
      case 'museum':
        return Icons.museum_rounded;
      default:
        return Icons.attractions_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    return Directionality(
      textDirection: state.direction,
      child: AmbientBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            title: Text(widget.tripName),
          ),
          body: FutureBuilder(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return ListView(
                  padding: const EdgeInsets.all(20),
                  physics: const NeverScrollableScrollPhysics(),
                  children: const [
                    Shimmer(height: 90, radius: BorderRadius.all(Radius.circular(22))),
                    SizedBox(height: 18),
                    Shimmer(height: 64, radius: BorderRadius.all(Radius.circular(18))),
                    SizedBox(height: 12),
                    Shimmer(height: 64, radius: BorderRadius.all(Radius.circular(18))),
                    SizedBox(height: 12),
                    Shimmer(height: 64, radius: BorderRadius.all(Radius.circular(18))),
                  ],
                );
              }
              if (snapshot.hasError) {
                return ErrorView(
                    message: t.t('common.error'),
                    retryLabel: t.t('common.retry'),
                    onRetry: _reload);
              }
              final bundle = snapshot.data!;
              final trip = bundle.trip;
              return RefreshIndicator(
                color: Brand.gold,
                backgroundColor: Brand.navy,
                onRefresh: () async => _reload(),
                child: ListView(
                  physics:
                      const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  children: [
                    FadeSlideIn(
                      child: GlassCard(
                        padding: const EdgeInsets.all(18),
                        child: Wrap(
                          spacing: 18,
                          runSpacing: 10,
                          children: [
                            _Fact(icon: Icons.calendar_today_rounded, text: trip.startDate ?? '—'),
                            _Fact(
                                icon: Icons.people_rounded,
                                text: '${trip.travellers} ${t.t('trips.travellers')}'),
                            if (trip.budgetTotal != null)
                              _Fact(
                                  icon: Icons.account_balance_wallet_rounded,
                                  text:
                                      '${trip.budgetTotal!.toStringAsFixed(0)} ${trip.currency}'),
                            _Fact(icon: Icons.speed_rounded, text: trip.pace),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    for (final (di, day) in bundle.days.indexed) ...[
                      FadeSlideIn(
                        delay: Duration(milliseconds: 80 + 60 * (di % 10)),
                        child: _DaySection(
                          day: day,
                          t: t,
                          items: bundle.itemsForDay(day.id),
                          currency: trip.currency,
                          iconFor: _categoryIcon,
                          isLast: di == bundle.days.length - 1,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: () {
                        final url = Uri.parse('${state.baseUrl}/trips/${trip.id}');
                        launchUrl(url, mode: LaunchMode.externalApplication);
                      },
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: Text(t.t('trips.openWeb')),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _DaySection extends StatelessWidget {
  final TripDay day;
  final dynamic t;
  final List<ItineraryItem> items;
  final String currency;
  final IconData Function(String) iconFor;
  final bool isLast;

  const _DaySection({
    required this.day,
    required this.t,
    required this.items,
    required this.currency,
    required this.iconFor,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline rail
          SizedBox(
            width: 34,
            child: Column(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                          color: Brand.gold.withValues(alpha: 0.4),
                          blurRadius: 12,
                          offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '${day.dayIndex + 1}',
                      style: const TextStyle(
                          color: Brand.ink, fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                  ),
                ),
                if (!isLast || items.isNotEmpty)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Brand.gold.withValues(alpha: 0.6),
                            Brand.gold.withValues(alpha: isLast ? 0 : 0.25),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 4, bottom: 10),
                    child: Row(
                      children: [
                        Text('${t.t('trips.day')} ${day.dayIndex + 1}',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Brand.goldLight, fontWeight: FontWeight.w800)),
                        const SizedBox(width: 10),
                        if (day.date != null)
                          Text(day.date!,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: Brand.ivory.withValues(alpha: 0.55))),
                      ],
                    ),
                  ),
                  if (items.isEmpty)
                    Text(
                      t.t('trips.noItems'),
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: Brand.ivory.withValues(alpha: 0.4)),
                    )
                  else
                    for (final item in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 9),
                        child: GlassCard(
                          radius: BorderRadius.circular(16),
                          padding:
                              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(
                            children: [
                              Icon(iconFor(item.category),
                                  size: 20, color: Brand.goldLight),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14.5,
                                        decoration: item.completed
                                            ? TextDecoration.lineThrough
                                            : TextDecoration.none,
                                        color: Brand.ivory
                                            .withValues(alpha: item.completed ? 0.5 : 1),
                                      ),
                                    ),
                                    Builder(builder: (context) {
                                      final meta = [
                                        if (item.startTime != null)
                                          '${item.startTime}${item.endTime != null ? '–${item.endTime}' : ''}',
                                        if (item.slot != null && item.startTime == null)
                                          item.slot!,
                                        if (item.cost != null)
                                          '${item.cost!.toStringAsFixed(0)} ${item.currency ?? currency}',
                                      ].join(' · ');
                                      if (meta.isEmpty) return const SizedBox.shrink();
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 2),
                                        child: Text(
                                          meta,
                                          style: TextStyle(
                                              fontSize: 12,
                                              color:
                                                  Brand.ivory.withValues(alpha: 0.55)),
                                        ),
                                      );
                                    }),
                                  ],
                                ),
                              ),
                              if (item.priority == 'must')
                                const Icon(Icons.star_rounded,
                                    color: Brand.gold, size: 19),
                            ],
                          ),
                        ),
                      ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Fact({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Brand.goldLight),
        const SizedBox(width: 6),
        Text(text, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}
