import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_state.dart';
import '../theme.dart';
import '../widgets/fx.dart';
import 'concierge_screen.dart';
import 'enquiry_screen.dart';

/// Two-option language pill.
///
/// Replaces SegmentedButton, whose fixed internal padding clipped the Arabic
/// label ("عربي") onto a second line at this size.
class _LangToggle extends StatelessWidget {
  final String lang;
  final ValueChanged<String> onChanged;
  const _LangToggle({required this.lang, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Brand.ink.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Brand.cardBorder),
      ),
      padding: const EdgeInsets.all(3),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _option(context, 'en', 'EN'),
          _option(context, 'ar', 'عربي'),
        ],
      ),
    );
  }

  Widget _option(BuildContext context, String value, String label) {
    final selected = lang == value;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        constraints: const BoxConstraints(minWidth: 62),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          gradient: selected ? const LinearGradient(colors: [Brand.gold, Brand.goldLight]) : null,
          borderRadius: BorderRadius.circular(21),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          maxLines: 1,
          softWrap: false,
          overflow: TextOverflow.visible,
          style: TextStyle(
            fontSize: 14,
            height: 1.2,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
            color: selected ? Brand.ink : Brand.ivory.withValues(alpha: 0.75),
          ),
        ),
      ),
    );
  }
}

/// Profile, language, and server settings + shortcuts.
class MoreScreen extends StatefulWidget {
  const MoreScreen({super.key});

  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  bool _saving = false;
  bool _seededProfile = false;
  bool _seededUrl = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  /// The guest profile is fetched asynchronously after startup, so the first
  /// build usually has none. Seed the fields when it actually arrives (once),
  /// otherwise a saved display name never reappears after a restart.
  void _seed(AppState state) {
    if (!_seededUrl) {
      _seededUrl = true;
      _urlCtrl.text = state.baseUrl;
    }
    final profile = state.profile;
    if (_seededProfile || profile == null) return;
    _seededProfile = true;
    // "Traveller" is the server's placeholder for a profile the user never named.
    _nameCtrl.text = profile.displayName == 'Traveller' ? '' : profile.displayName;
    _emailCtrl.text = profile.email ?? '';
  }

  Future<void> _saveProfile() async {
    final state = context.read<AppState>();
    setState(() => _saving = true);
    try {
      await state.saveProfile(
        displayName: _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.l10n.t('more.saved'))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(state.l10n.t('common.error'))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    _seed(state);
    return DismissKeyboard(
      child: Scaffold(
      backgroundColor: Colors.transparent,
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(t.t('more.title')),
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(20, 8, 20, keyboardPadding(context, base: 130)),
        children: [
          // Language
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.translate_rounded, color: Brand.goldLight),
                  const SizedBox(width: 12),
                  Expanded(child: Text(t.t('more.language'), style: Theme.of(context).textTheme.titleMedium)),
                  _LangToggle(
                    lang: state.lang,
                    onChanged: state.setLang,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Shortcuts
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.support_agent_rounded, color: Brand.goldLight),
                  title: Text(t.t('more.concierge')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => const ConciergeScreen())),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.mail_rounded, color: Brand.goldLight),
                  title: Text(t.t('more.enquiry')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => const EnquiryScreen())),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.language_rounded, color: Brand.goldLight),
                  title: Text(t.t('more.website')),
                  trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                  onTap: () =>
                      launchUrl(Uri.parse(state.baseUrl), mode: LaunchMode.externalApplication),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Profile
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t.t('more.profile'), style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _nameCtrl,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(labelText: t.t('more.displayName')),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _saveProfile(),
                    decoration: InputDecoration(labelText: t.t('more.email')),
                  ),
                  const SizedBox(height: 14),
                  FilledButton(
                    onPressed: _saving ? null : _saveProfile,
                    child: Text(t.t('more.save')),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Server
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t.t('more.server'), style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _urlCtrl,
                    keyboardType: TextInputType.url,
                    decoration: InputDecoration(
                      labelText: t.t('more.serverUrl'),
                      hintText: t.t('more.serverHint'),
                    ),
                    onSubmitted: state.setBaseUrl,
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: OutlinedButton(
                      onPressed: () => state.setBaseUrl(_urlCtrl.text),
                      child: Text(t.t('more.save')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }
}
