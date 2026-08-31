import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../core/l10n.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/fx.dart';
import 'enquiry_screen.dart';

const _categories = ['saudi', 'international', 'islamic', 'desert', 'group', 'corporate'];

const _categoryLabels = {
  'en': {
    'saudi': 'Saudi',
    'international': 'International',
    'islamic': 'Islamic',
    'desert': 'Desert',
    'group': 'Group',
    'corporate': 'Corporate',
  },
  'ar': {
    'saudi': 'السعودية',
    'international': 'دولية',
    'islamic': 'إسلامية',
    'desert': 'صحراوية',
    'group': 'جماعية',
    'corporate': 'شركات',
  },
};

const _categoryHues = {
  'saudi': 'sand',
  'international': 'aqua',
  'islamic': 'navy',
  'desert': 'gold',
  'group': 'green',
  'corporate': 'violet',
};

class PackagesScreen extends StatefulWidget {
  const PackagesScreen({super.key});

  @override
  State<PackagesScreen> createState() => _PackagesScreenState();
}

class _PackagesScreenState extends State<PackagesScreen> {
  late Future<List<TourPackage>> _future;
  String? _category;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<TourPackage>> _load() => context.read<AppState>().api.packages(category: _category);

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  void _setCategory(String? c) {
    setState(() {
      _category = c;
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    final labels = _categoryLabels[state.lang] ?? _categoryLabels['en']!;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(t.t('packages.title')),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 54,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              children: [
                _CategoryChip(
                  label: t.t('packages.all'),
                  selected: _category == null,
                  onTap: () => _setCategory(null),
                ),
                for (final c in _categories)
                  _CategoryChip(
                    label: labels[c] ?? c,
                    selected: _category == c,
                    onTap: () => _setCategory(c),
                  ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 130),
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: 5,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (_, __) => const Shimmer(
                        height: 96, radius: BorderRadius.all(Radius.circular(22))),
                  );
                }
                if (snapshot.hasError) {
                  return ErrorView(
                      message: t.t('common.error'),
                      retryLabel: t.t('common.retry'),
                      onRetry: _reload);
                }
                final packages = snapshot.data!;
                if (packages.isEmpty) {
                  return EmptyView(
                      icon: Icons.card_travel_outlined, message: t.t('packages.empty'));
                }
                return RefreshIndicator(
                  color: Brand.gold,
                  backgroundColor: Brand.navy,
                  onRefresh: () async => _reload(),
                  child: ListView.separated(
                    physics:
                        const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 130),
                    itemCount: packages.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (context, i) => FadeSlideIn(
                      delay: Duration(milliseconds: 60 * (i % 8)),
                      child: _PackageCard(
                        pkg: packages[i],
                        lang: state.lang,
                        onTap: () => _showDetail(context, packages[i], state.lang, t),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showDetail(BuildContext context, TourPackage pkg, String lang, L10n t) {
    final hue = _categoryHues[pkg.category] ?? 'violet';
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.72,
          maxChildSize: 0.95,
          builder: (context, controller) => Container(
            decoration: BoxDecoration(
              color: Brand.navy,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: ListView(
              controller: controller,
              padding: EdgeInsets.zero,
              children: [
                // Cover
                Container(
                  height: 150,
                  decoration: BoxDecoration(
                    gradient: hueGradient(hue),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (sceneAsset(sceneForPackage(text: '${pkg.title.en} ${pkg.place.en}', category: pkg.category)) != null)
                        Image.asset(
                          sceneAsset(sceneForPackage(text: '${pkg.title.en} ${pkg.place.en}', category: pkg.category))!,
                          fit: BoxFit.cover,
                        ),
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Brand.navy.withValues(alpha: 0.85),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Center(
                        child: Container(
                          margin: const EdgeInsets.only(top: 10),
                          width: 44,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.white38,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(pkg.title.of(lang),
                          style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          _FactPill(icon: Icons.place_rounded, text: pkg.place.of(lang)),
                          if (pkg.duration.of(lang).isNotEmpty)
                            _FactPill(
                                icon: Icons.schedule_rounded, text: pkg.duration.of(lang)),
                          if (pkg.priceDisplay.isNotEmpty)
                            _FactPill(
                                icon: Icons.payments_rounded,
                                text: pkg.priceDisplay,
                                gold: true),
                        ],
                      ),
                      if (pkg.inclusions.isNotEmpty) ...[
                        const SizedBox(height: 22),
                        Text(t.t('packages.inclusions'),
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 10),
                        ...pkg.inclusions.map((x) => _CheckRow(text: x, included: true)),
                      ],
                      if (pkg.exclusions.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        Text(t.t('packages.exclusions'),
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 10),
                        ...pkg.exclusions.map((x) => _CheckRow(text: x, included: false)),
                      ],
                      const SizedBox(height: 26),
                      Pressable(
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  EnquiryScreen(prefillService: pkg.title.of(lang)),
                            ),
                          );
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          decoration: BoxDecoration(
                            gradient:
                                const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: [
                              BoxShadow(
                                color: Brand.gold.withValues(alpha: 0.35),
                                blurRadius: 18,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.mail_rounded, color: Brand.ink, size: 19),
                              const SizedBox(width: 9),
                              Text(
                                t.t('packages.enquire'),
                                style: const TextStyle(
                                    color: Brand.ink,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
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

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 9),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
          decoration: BoxDecoration(
            gradient: selected
                ? const LinearGradient(colors: [Brand.gold, Brand.goldLight])
                : null,
            color: selected ? null : Brand.card.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: selected ? Colors.transparent : Colors.white.withValues(alpha: 0.1),
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: Brand.gold.withValues(alpha: 0.35),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Brand.ink : Brand.ivory.withValues(alpha: 0.85),
              fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
              fontSize: 13.5,
            ),
          ),
        ),
      ),
    );
  }
}

class _PackageCard extends StatelessWidget {
  final TourPackage pkg;
  final String lang;
  final VoidCallback onTap;
  const _PackageCard({required this.pkg, required this.lang, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final hue = _categoryHues[pkg.category] ?? 'violet';
    return Pressable(
      onTap: onTap,
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                gradient: hueGradient(hue),
                borderRadius: BorderRadius.circular(17),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: sceneAsset(sceneForPackage(text: '${pkg.title.en} ${pkg.place.en}', category: pkg.category)) != null
                  ? Image.asset(sceneAsset(sceneForPackage(text: '${pkg.title.en} ${pkg.place.en}', category: pkg.category))!, fit: BoxFit.cover)
                  : const Icon(Icons.card_travel_rounded, color: Colors.white, size: 27),
            ),
            const SizedBox(width: 15),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(pkg.title.of(lang),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    [pkg.place.of(lang), pkg.duration.of(lang)]
                        .where((s) => s.isNotEmpty)
                        .join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: Brand.ivory.withValues(alpha: 0.65)),
                  ),
                  if (pkg.priceDisplay.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    Text(
                      pkg.priceDisplay,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(color: Brand.goldLight, fontWeight: FontWeight.w800),
                    ),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: Brand.gold.withValues(alpha: 0.13),
                shape: BoxShape.circle,
                border: Border.all(color: Brand.gold.withValues(alpha: 0.4)),
              ),
              child:
                  const Icon(Icons.arrow_forward_rounded, size: 15, color: Brand.goldLight),
            ),
          ],
        ),
      ),
    );
  }
}

class _FactPill extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool gold;
  const _FactPill({required this.icon, required this.text, this.gold = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
      decoration: BoxDecoration(
        color: gold ? Brand.gold.withValues(alpha: 0.14) : Brand.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: gold ? Brand.gold.withValues(alpha: 0.5) : Colors.white.withValues(alpha: 0.09),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Brand.goldLight),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              fontSize: 12.5,
              color: gold ? Brand.goldLight : Brand.ivory,
              fontWeight: gold ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  final String text;
  final bool included;
  const _CheckRow({required this.text, required this.included});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            included ? Icons.check_circle_rounded : Icons.remove_circle_outline_rounded,
            size: 18,
            color: included ? const Color(0xFF4CC38A) : Brand.ivory.withValues(alpha: 0.4),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                height: 1.4,
                color: Brand.ivory.withValues(alpha: included ? 0.95 : 0.6),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
