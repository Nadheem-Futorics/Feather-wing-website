import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../core/l10n.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'concierge_screen.dart';
import 'enquiry_screen.dart';

class HomeScreen extends StatefulWidget {
  final void Function(int index) onNavigate;
  const HomeScreen({super.key, required this.onNavigate});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<(List<FeaturedTrip>, List<Offer>, List<DestinationCard>)> _future;
  final _pageCtrl = PageController(viewportFraction: 0.86);
  double _page = 0;

  @override
  void initState() {
    super.initState();
    _future = _load();
    _pageCtrl.addListener(() => setState(() => _page = _pageCtrl.page ?? 0));
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  Future<(List<FeaturedTrip>, List<Offer>, List<DestinationCard>)> _load() async {
    final api = context.read<AppState>().api;
    final results = await Future.wait([api.featuredTrips(), api.offers(), api.destinations()]);
    return (
      results[0] as List<FeaturedTrip>,
      results[1] as List<Offer>,
      results[2] as List<DestinationCard>,
    );
  }

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  void _openEnquiry() =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EnquiryScreen()));

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: FutureBuilder(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const _HomeSkeleton();
            }
            if (snapshot.hasError) {
              return ErrorView(
                  message: t.t('common.error'), retryLabel: t.t('common.retry'), onRetry: _reload);
            }
            final (trips, offers, destinations) = snapshot.data!;
            return RefreshIndicator(
              color: Brand.gold,
              backgroundColor: Brand.navy,
              onRefresh: () async => _reload(),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  SliverToBoxAdapter(child: _TopBar(t: t)),
                  SliverToBoxAdapter(
                    child: FadeSlideIn(child: _HeroCard(t: t, onEnquire: _openEnquiry)),
                  ),
                  if (trips.isNotEmpty) ...[
                    SliverToBoxAdapter(
                      child: FadeSlideIn(
                        delay: const Duration(milliseconds: 80),
                        child: SectionHeader(title: t.t('home.featured')),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: FadeSlideIn(
                        delay: const Duration(milliseconds: 140),
                        child: SizedBox(
                          height: 300,
                          child: PageView.builder(
                            controller: _pageCtrl,
                            padEnds: false,
                            itemCount: trips.length,
                            itemBuilder: (context, i) => _FeaturedCard(
                              trip: trips[i],
                              lang: state.lang,
                              t: t,
                              parallax: (_page - i).clamp(-1.0, 1.0),
                              onTap: _openEnquiry,
                            ),
                          ),
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: Center(
                            child: DotsIndicator(count: trips.length, position: _page)),
                      ),
                    ),
                  ],
                  if (offers.isNotEmpty) ...[
                    SliverToBoxAdapter(
                      child: FadeSlideIn(
                        delay: const Duration(milliseconds: 200),
                        child: SectionHeader(title: t.t('home.offers')),
                      ),
                    ),
                    SliverList.builder(
                      itemCount: offers.length,
                      itemBuilder: (context, i) => Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                        child: FadeSlideIn(
                          delay: Duration(milliseconds: 240 + i * 70),
                          child:
                              _OfferCard(offer: offers[i], lang: state.lang, onEnquire: _openEnquiry),
                        ),
                      ),
                    ),
                  ],
                  if (destinations.isNotEmpty) ...[
                    SliverToBoxAdapter(
                      child: FadeSlideIn(
                        delay: const Duration(milliseconds: 300),
                        child: SectionHeader(
                          title: t.t('home.destinations'),
                          actionLabel: t.t('home.seeAll'),
                          onAction: () => widget.onNavigate(1),
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: FadeSlideIn(
                        delay: const Duration(milliseconds: 340),
                        child: SizedBox(
                          height: 170,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: destinations.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 12),
                            itemBuilder: (context, i) => _DestinationThumb(
                              card: destinations[i],
                              lang: state.lang,
                              baseUrl: state.baseUrl,
                              onTap: () => widget.onNavigate(1),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SliverToBoxAdapter(child: SizedBox(height: 130)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final L10n t;
  const _TopBar({required this.t});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 12, 18),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: Brand.gold.withValues(alpha: 0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(Icons.flight_takeoff_rounded, color: Brand.ink, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(t.t('app.title'), style: Theme.of(context).textTheme.headlineSmall),
          ),
          Pressable(
            onTap: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const ConciergeScreen())),
            child: GlassCard(
              radius: BorderRadius.circular(16),
              padding: const EdgeInsets.all(10),
              child: const Icon(Icons.support_agent_rounded, color: Brand.goldLight, size: 22),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final L10n t;
  final VoidCallback onEnquire;
  const _HeroCard({required this.t, required this.onEnquire});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 6),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: Stack(
          children: [
            Positioned.fill(
              child: Image.asset(
                'assets/scenes/hegra.jpg',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFF1A1240).withValues(alpha: 0.9),
                      Brand.purple.withValues(alpha: 0.72),
                      const Color(0xFF2A1E63).withValues(alpha: 0.88),
                    ],
                  ),
                ),
              ),
            ),
            // Decorative rings
            Positioned(
              right: -50,
              top: -50,
              child: _ring(170, Brand.goldLight.withValues(alpha: 0.14)),
            ),
            Positioned(
              right: 10,
              bottom: -70,
              child: _ring(140, Colors.white.withValues(alpha: 0.07)),
            ),
            Positioned(
              right: 18,
              top: 18,
              child: Icon(Icons.travel_explore_rounded,
                  size: 64, color: Colors.white.withValues(alpha: 0.16)),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                    ),
                    child: Text(
                      '✦ ${t.t('app.title')}',
                      style: const TextStyle(
                          fontSize: 11.5, color: Brand.goldLight, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(t.t('home.heroTitle'),
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(height: 1.15)),
                  const SizedBox(height: 8),
                  Text(
                    t.t('home.heroSubtitle'),
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: Brand.ivory.withValues(alpha: 0.82), height: 1.45),
                  ),
                  const SizedBox(height: 18),
                  Pressable(
                    onTap: onEnquire,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Brand.gold.withValues(alpha: 0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.auto_awesome_rounded, size: 18, color: Brand.ink),
                          const SizedBox(width: 8),
                          Text(
                            t.t('home.enquireCta'),
                            style: const TextStyle(
                                color: Brand.ink, fontWeight: FontWeight.w800, fontSize: 15),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ring(double size, Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 1.4),
      ),
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  final FeaturedTrip trip;
  final String lang;
  final L10n t;
  final double parallax;
  final VoidCallback onTap;

  const _FeaturedCard({
    required this.trip,
    required this.lang,
    required this.t,
    required this.parallax,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scale = 1 - 0.06 * parallax.abs();
    return Transform.scale(
      scale: scale,
      child: Pressable(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsetsDirectional.only(start: 20, end: 2, bottom: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.45),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(
              fit: StackFit.expand,
              children: [
                DecoratedBox(decoration: BoxDecoration(gradient: hueGradient(trip.hue))),
                // Scene photo with a parallax pan; branded gradient stays as
                // the fallback when a scene has no bundled photo.
                if (sceneAsset(trip.scene) != null)
                  Image.asset(
                    sceneAsset(trip.scene)!,
                    fit: BoxFit.cover,
                    alignment: Alignment(parallax * 0.55, 0),
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  )
                else
                  Positioned(
                    right: 14 - 26 * parallax,
                    top: 26,
                    child: Icon(
                      sceneIcon(trip.scene),
                      size: 110,
                      color: Colors.white.withValues(alpha: 0.22),
                    ),
                  ),
                // Bottom scrim
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: const [0.35, 1],
                        colors: [
                          Colors.transparent,
                          Brand.ink.withValues(alpha: 0.88),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (trip.seats > 0)
                            GoldBadge(text: '${trip.seats} ${t.t('home.seatsLeft')}'),
                          const Spacer(),
                          GlassCard(
                            radius: BorderRadius.circular(12),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            child: Text(
                              trip.duration.of(lang),
                              style: const TextStyle(fontSize: 11.5, color: Brand.ivory),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Text(
                        trip.title.of(lang),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(height: 1.15, shadows: [
                          const Shadow(color: Colors.black54, blurRadius: 8),
                        ]),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.place_rounded, size: 15, color: Brand.goldLight),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              trip.place.of(lang),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                          if (trip.price.isNotEmpty)
                            Text(
                              trip.price,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Brand.goldLight, fontWeight: FontWeight.w800),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  final Offer offer;
  final String lang;
  final VoidCallback onEnquire;
  const _OfferCard({required this.offer, required this.lang, required this.onEnquire});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onEnquire,
      child: GlassCard(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: hueGradient('gold'),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Brand.gold.withValues(alpha: 0.3),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: sceneAsset(offer.scene) != null
                  ? Image.asset(sceneAsset(offer.scene)!, fit: BoxFit.cover)
                  : Icon(sceneIcon(offer.scene), color: Colors.white, size: 30),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(offer.title.of(lang),
                            style: Theme.of(context).textTheme.titleLarge),
                      ),
                      if (!offer.badge.isEmpty) GoldBadge(text: offer.badge.of(lang)),
                    ],
                  ),
                  if (!offer.subtitle.isEmpty) ...[
                    const SizedBox(height: 4),
                    Text(offer.subtitle.of(lang), style: Theme.of(context).textTheme.bodyMedium),
                  ],
                  if (!offer.description.isEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      offer.description.of(lang),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: Brand.ivory.withValues(alpha: 0.7), height: 1.4),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if (offer.priceFrom.isNotEmpty)
                        Text(
                          offer.priceFrom,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(color: Brand.goldLight, fontWeight: FontWeight.w800),
                        ),
                      const Spacer(),
                      Text(
                        offer.cta.isEmpty ? '→' : offer.cta.of(lang),
                        style: const TextStyle(
                            color: Brand.goldLight, fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward_rounded, size: 15, color: Brand.goldLight),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DestinationThumb extends StatelessWidget {
  final DestinationCard card;
  final String lang;
  final String baseUrl;
  final VoidCallback onTap;

  const _DestinationThumb({
    required this.card,
    required this.lang,
    required this.baseUrl,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          width: 138,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                card.imageUrl(baseUrl),
                fit: BoxFit.cover,
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : const Shimmer(height: 170),
                errorBuilder: (_, __, ___) => Container(
                  decoration: BoxDecoration(gradient: hueGradient('navy')),
                  child: const Icon(Icons.photo_rounded, color: Colors.white38),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(11, 26, 11, 10),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black87],
                    ),
                  ),
                  child: Text(
                    card.title.of(lang),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shimmer skeleton mirroring the home layout.
class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      children: const [
        Row(
          children: [
            Shimmer(width: 42, height: 42, radius: BorderRadius.all(Radius.circular(14))),
            SizedBox(width: 12),
            Shimmer(width: 180, height: 24),
          ],
        ),
        SizedBox(height: 20),
        Shimmer(height: 210, radius: BorderRadius.all(Radius.circular(26))),
        SizedBox(height: 28),
        Shimmer(width: 140, height: 20),
        SizedBox(height: 14),
        Shimmer(height: 280, radius: BorderRadius.all(Radius.circular(24))),
        SizedBox(height: 28),
        Shimmer(width: 140, height: 20),
        SizedBox(height: 14),
        Shimmer(height: 120, radius: BorderRadius.all(Radius.circular(22))),
      ],
    );
  }
}
