import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme.dart';

/// Staggered entrance: fades + slides a child in once, after [delay].
class FadeSlideIn extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final Duration duration;
  final Offset offset;

  const FadeSlideIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 450),
    this.offset = const Offset(0, 0.08),
  });

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: widget.duration);
  late final Animation<double> _fade =
      CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
  late final Animation<Offset> _slide =
      Tween(begin: widget.offset, end: Offset.zero)
          .animate(CurvedAnimation(parent: _c, curve: Curves.easeOutCubic));

  @override
  void initState() {
    super.initState();
    Future.delayed(widget.delay, () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      FadeTransition(opacity: _fade, child: SlideTransition(position: _slide, child: widget.child));
}

/// Scales down slightly while pressed — tactile feedback for cards.
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  const Pressable({super.key, required this.child, this.onTap});

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _down = true),
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) => setState(() => _down = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _down ? 0.965 : 1,
        duration: const Duration(milliseconds: 110),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Frosted-glass card: blurred translucent surface with a soft border.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final BorderRadius radius;
  final Color? tint;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.radius = const BorderRadius.all(Radius.circular(22)),
    this.tint,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: (tint ?? Brand.card).withValues(alpha: 0.55),
            borderRadius: radius,
            border: Border.all(color: Colors.white.withValues(alpha: 0.09), width: 1),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.07),
                Colors.white.withValues(alpha: 0.015),
              ],
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Animated shimmer placeholder block for skeleton loading states.
class Shimmer extends StatefulWidget {
  final double? width;
  final double height;
  final BorderRadius radius;

  const Shimmer({
    super.key,
    this.width,
    required this.height,
    this.radius = const BorderRadius.all(Radius.circular(14)),
  });

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final t = _c.value * 2 - 1; // -1 → 1
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.radius,
            gradient: LinearGradient(
              begin: Alignment(-1 + t, 0),
              end: Alignment(t + 1, 0),
              colors: const [
                Color(0xFF101A3C),
                Color(0xFF1B2A55),
                Color(0xFF101A3C),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Page-position dots for carousels.
class DotsIndicator extends StatelessWidget {
  final int count;
  final double position; // fractional page

  const DotsIndicator({super.key, required this.count, required this.position});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final active = (position - i).abs().clamp(0.0, 1.0);
        final w = 22 - 14 * active; // 22 when active → 8 idle
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: w,
          height: 8,
          decoration: BoxDecoration(
            color: Color.lerp(Brand.gold, Colors.white24, active),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

/// Three bouncing dots — "assistant is typing".
class TypingDots extends StatefulWidget {
  const TypingDots({super.key});

  @override
  State<TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final phase = ((_c.value * 3 - i) % 3).clamp(0.0, 1.0);
            final lift = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.5),
              child: Transform.translate(
                offset: Offset(0, -4 * lift),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: Brand.goldLight.withValues(alpha: 0.5 + 0.5 * lift),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

/// Taps outside a text field close the keyboard.
///
/// Without this the on-screen keyboard covers the bottom navigation and any
/// action button below the focused field, leaving no way out of the screen.
class DismissKeyboard extends StatelessWidget {
  final Widget child;
  const DismissKeyboard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: child,
    );
  }
}

/// Extra bottom padding so scrollable content clears the on-screen keyboard.
double keyboardPadding(BuildContext context, {double base = 0}) =>
    base + MediaQuery.viewInsetsOf(context).bottom;

/// Full-screen ambient background: deep navy with soft radial glows.
class AmbientBackground extends StatelessWidget {
  final Widget child;
  const AmbientBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(color: Brand.ink),
      child: Stack(
        children: [
          Positioned(
            top: -140,
            right: -100,
            child: _glow(const Color(0xFF4B3194), 340, 0.55),
          ),
          Positioned(
            top: 260,
            left: -160,
            child: _glow(const Color(0xFF123B5C), 380, 0.45),
          ),
          Positioned(
            bottom: -120,
            right: -60,
            child: _glow(const Color(0xFF7A5A18), 320, 0.35),
          ),
          child,
        ],
      ),
    );
  }

  Widget _glow(Color color, double size, double opacity) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color.withValues(alpha: opacity), color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }
}
