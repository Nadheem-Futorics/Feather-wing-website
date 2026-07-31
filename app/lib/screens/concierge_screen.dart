import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../theme.dart';
import '../widgets/fx.dart';

class _Msg {
  final String role; // 'user' | 'assistant'
  String content;
  _Msg(this.role, this.content);
}

/// Streaming chat against the website's public concierge endpoint
/// (POST /api/concierge, NDJSON events).
class ConciergeScreen extends StatefulWidget {
  const ConciergeScreen({super.key});

  @override
  State<ConciergeScreen> createState() => _ConciergeScreenState();
}

class _ConciergeScreenState extends State<ConciergeScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_Msg> _messages = [];
  bool _streaming = false;
  String _notice = '';

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _streaming) return;
    final state = context.read<AppState>();
    setState(() {
      _messages.add(_Msg('user', text));
      _messages.add(_Msg('assistant', ''));
      _streaming = true;
      _input.clear();
    });
    _scrollToEnd();

    // Keep the last 10 exchanges (schema caps at 20 messages).
    final history = _messages
        .where((m) => m.content.isNotEmpty || m.role == 'user')
        .toList()
        .reversed
        .take(19)
        .toList()
        .reversed
        .map((m) => {'role': m.role, 'content': m.content})
        .where((m) => (m['content'] as String).isNotEmpty)
        .toList();

    try {
      await for (final ev in state.api.conciergeChat(messages: history, lang: state.lang)) {
        if (!mounted) return;
        setState(() {
          switch (ev.type) {
            case 'text':
              _messages.last.content += ev.text;
            case 'notice':
              _notice = ev.text;
            case 'error':
              _messages.last.content =
                  _messages.last.content.isEmpty ? ev.text : _messages.last.content;
          }
        });
        _scrollToEnd();
      }
    } catch (_) {
      if (mounted && _messages.isNotEmpty && _messages.last.content.isEmpty) {
        setState(() => _messages.last.content = state.l10n.t('common.error'));
      }
    } finally {
      if (mounted) setState(() => _streaming = false);
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
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.support_agent_rounded, color: Brand.ink, size: 18),
              ),
              const SizedBox(width: 10),
              Text(t.t('concierge.title')),
            ],
          ),
        ),
        body: Column(
          children: [
            if (_notice.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                color: Brand.purple.withValues(alpha: 0.35),
                child: Text(_notice, style: Theme.of(context).textTheme.bodySmall),
              ),
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.all(20),
                itemCount: _messages.length + 1,
                itemBuilder: (context, i) {
                  if (i == 0) return _Bubble(role: 'assistant', text: t.t('concierge.welcome'));
                  final m = _messages[i - 1];
                  final showTyping = _streaming && i == _messages.length && m.role == 'assistant' && m.content.isEmpty;
                  if (showTyping) return const _Bubble(role: 'assistant', text: '', typing: true);
                  return _Bubble(role: m.role, text: m.content);
                },
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: GlassCard(
                  radius: BorderRadius.circular(24),
                  padding: const EdgeInsetsDirectional.only(start: 18, end: 8, top: 4, bottom: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          onSubmitted: (_) => _send(),
                          textInputAction: TextInputAction.send,
                          decoration: InputDecoration(
                            hintText: t.t('concierge.hint'),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Pressable(
                        onTap: _streaming ? null : _send,
                        child: Container(
                          padding: const EdgeInsets.all(11),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Brand.gold, Brand.goldLight]),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Brand.gold.withValues(alpha: 0.4),
                                blurRadius: 12,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: _streaming
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Brand.ink))
                              : const Icon(Icons.send_rounded, color: Brand.ink, size: 18),
                        ),
                      ),
                    ],
                  ),
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

class _Bubble extends StatelessWidget {
  final String role;
  final String text;
  final bool typing;
  const _Bubble({required this.role, required this.text, this.typing = false});

  @override
  Widget build(BuildContext context) {
    final isUser = role == 'user';
    return Align(
      alignment: isUser ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          gradient: isUser
              ? const LinearGradient(colors: [Brand.purple, Color(0xFF5C42B8)])
              : null,
          color: isUser ? null : Brand.card.withValues(alpha: 0.85),
          borderRadius: BorderRadiusDirectional.only(
            topStart: const Radius.circular(20),
            topEnd: const Radius.circular(20),
            bottomStart: Radius.circular(isUser ? 20 : 5),
            bottomEnd: Radius.circular(isUser ? 5 : 20),
          ),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: typing
            ? const Padding(
                padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: TypingDots(),
              )
            : SelectableText.rich(
                TextSpan(children: _markdownLite(text.isEmpty ? '…' : text)),
                style: const TextStyle(height: 1.45),
              ),
      ),
    );
  }

  /// Renders the lightweight markdown the concierge emits: `**bold**` becomes
  /// bold text; leftover unpaired `**` markers are stripped.
  static List<TextSpan> _markdownLite(String input) {
    final spans = <TextSpan>[];
    final pattern = RegExp(r'\*\*(.+?)\*\*', dotAll: true);
    var last = 0;
    for (final m in pattern.allMatches(input)) {
      if (m.start > last) spans.add(TextSpan(text: input.substring(last, m.start)));
      spans.add(TextSpan(
        text: m.group(1),
        style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.goldLight),
      ));
      last = m.end;
    }
    if (last < input.length) spans.add(TextSpan(text: input.substring(last)));
    // Strip stray unpaired markers so they never show as literal asterisks.
    return spans
        .map((s) => s.style == null
            ? TextSpan(text: s.text?.replaceAll('**', ''), style: s.style)
            : s)
        .toList();
  }
}
