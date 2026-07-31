import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';

class DestinationsScreen extends StatefulWidget {
  const DestinationsScreen({super.key});

  @override
  State<DestinationsScreen> createState() => _DestinationsScreenState();
}

class _DestinationsScreenState extends State<DestinationsScreen> {
  late Future<List<DestinationCard>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().api.destinations();
  }

  void _reload() {
    setState(() {
      _future = context.read<AppState>().api.destinations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(t.t('destinations.title')),
      ),
      body: FutureBuilder(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return GridView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 240,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 0.8,
              ),
              itemCount: 6,
              itemBuilder: (_, __) =>
                  const Shimmer(height: 200, radius: BorderRadius.all(Radius.circular(20))),
            );
          }
          if (snapshot.hasError) {
            return ErrorView(
                message: t.t('common.error'), retryLabel: t.t('common.retry'), onRetry: _reload);
          }
          final cards = snapshot.data!;
          if (cards.isEmpty) {
            return EmptyView(icon: Icons.photo_library_outlined, message: t.t('destinations.empty'));
          }
          return RefreshIndicator(
            color: Brand.gold,
            backgroundColor: Brand.navy,
            onRefresh: () async => _reload(),
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 130),
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 240,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 0.8,
              ),
              itemCount: cards.length,
              itemBuilder: (context, i) => FadeSlideIn(
                delay: Duration(milliseconds: 60 * (i % 8)),
                child: _DestinationTile(card: cards[i], lang: state.lang, baseUrl: state.baseUrl),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _DestinationTile extends StatelessWidget {
  final DestinationCard card;
  final String lang;
  final String baseUrl;

  const _DestinationTile({required this.card, required this.lang, required this.baseUrl});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                card.imageUrl(baseUrl),
                fit: BoxFit.cover,
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : const Shimmer(height: 220),
                errorBuilder: (_, __, ___) => Container(
                  decoration: BoxDecoration(gradient: hueGradient('navy')),
                  child: const Icon(Icons.photo_rounded, color: Colors.white38, size: 40),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(13, 34, 13, 13),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black87],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        card.title.of(lang),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15.5),
                      ),
                      if (!card.subtitle.isEmpty)
                        Text(
                          card.subtitle.of(lang),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.75), fontSize: 12),
                        ),
                    ],
                  ),
                ),
              ),
              // Gold corner accent
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.35),
                    shape: BoxShape.circle,
                    border: Border.all(color: Brand.gold.withValues(alpha: 0.6), width: 1),
                  ),
                  child: const Icon(Icons.explore_rounded, size: 13, color: Brand.goldLight),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
