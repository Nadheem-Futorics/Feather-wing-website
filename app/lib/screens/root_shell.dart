import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../theme.dart';
import '../widgets/fx.dart';
import 'destinations_screen.dart';
import 'home_screen.dart';
import 'more_screen.dart';
import 'packages_screen.dart';
import 'trips_screen.dart';

/// App shell: ambient gradient background, content pages, and a floating
/// frosted-glass bottom navigation bar with an animated indicator.
class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;

  void goTo(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    // Keying on dataEpoch rebuilds every screen when the server URL changes,
    // so they refetch from the new source rather than showing stale data.
    final epoch = state.dataEpoch;
    final pages = [
      KeyedSubtree(key: ValueKey('home-$epoch'), child: HomeScreen(onNavigate: goTo)),
      KeyedSubtree(key: ValueKey('dest-$epoch'), child: const DestinationsScreen()),
      KeyedSubtree(key: ValueKey('pkg-$epoch'), child: const PackagesScreen()),
      KeyedSubtree(key: ValueKey('trips-$epoch'), child: const TripsScreen()),
      const MoreScreen(),
    ];
    final items = [
      (Icons.home_rounded, t.t('nav.home')),
      (Icons.photo_library_rounded, t.t('nav.destinations')),
      (Icons.card_travel_rounded, t.t('nav.packages')),
      (Icons.map_rounded, t.t('nav.planner')),
      (Icons.menu_rounded, t.t('nav.more')),
    ];
    return AmbientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: SafeArea(
          minimum: const EdgeInsets.fromLTRB(14, 0, 14, 10),
          child: GlassCard(
            radius: BorderRadius.circular(28),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            child: Row(
              children: List.generate(items.length, (i) {
                final selected = i == _index;
                final (icon, label) = items[i];
                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => goTo(i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOutCubic,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: selected
                            ? Brand.gold.withValues(alpha: 0.16)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? Brand.gold.withValues(alpha: 0.45)
                              : Colors.transparent,
                          width: 1,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            icon,
                            size: 22,
                            color: selected
                                ? Brand.goldLight
                                : Brand.ivory.withValues(alpha: 0.55),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                              color: selected
                                  ? Brand.goldLight
                                  : Brand.ivory.withValues(alpha: 0.55),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
