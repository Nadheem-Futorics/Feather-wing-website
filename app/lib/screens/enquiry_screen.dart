import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/app_state.dart';
import '../theme.dart';
import '../widgets/fx.dart';

/// Contact form → website CRM lead inbox (POST /api/enquiry).
/// The endpoint rejects sub-3-second submissions as bots, so the form tracks
/// how long the user actually spent filling it in.
class EnquiryScreen extends StatefulWidget {
  final String? prefillService;
  const EnquiryScreen({super.key, this.prefillService});

  @override
  State<EnquiryScreen> createState() => _EnquiryScreenState();
}

class _EnquiryScreenState extends State<EnquiryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _mobile = TextEditingController();
  late final TextEditingController _service;
  final _message = TextEditingController();
  late final DateTime _openedAt;
  bool _sending = false;
  bool _sent = false;

  @override
  void initState() {
    super.initState();
    _openedAt = DateTime.now();
    _service = TextEditingController(text: widget.prefillService ?? '');
    final profile = context.read<AppState>().profile;
    if (profile != null) {
      if (profile.displayName.isNotEmpty && profile.displayName != 'Traveller') {
        _name.text = profile.displayName;
      }
      if (profile.email != null) _email.text = profile.email!;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _mobile.dispose();
    _service.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _sending = true);
    final state = context.read<AppState>();
    try {
      await state.api.sendEnquiry(
        name: _name.text.trim(),
        email: _email.text.trim(),
        mobile: _mobile.text.trim(),
        service: _service.text.trim(),
        message: _message.text.trim(),
        elapsedMs: DateTime.now().difference(_openedAt).inMilliseconds,
      );
      if (!mounted) return;
      setState(() => _sent = true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(state.l10n.t('common.error'))));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final t = state.l10n;
    return Directionality(
      textDirection: state.direction,
      child: AmbientBackground(
        child: DismissKeyboard(
          child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: Text(t.t('enquiry.title')),
        ),
        body: _sent
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.mark_email_read_rounded, size: 64, color: Brand.gold),
                      const SizedBox(height: 20),
                      Text(t.t('enquiry.sent'), textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleLarge),
                    ],
                  ),
                ),
              )
            : Form(
                key: _formKey,
                child: ListView(
                  padding: EdgeInsets.fromLTRB(20, 20, 20, keyboardPadding(context, base: 40)),
                  children: [
                    Text(t.t('enquiry.subtitle'), style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _name,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(labelText: t.t('enquiry.name')),
                      validator: (v) => (v == null || v.trim().isEmpty) ? t.t('enquiry.required') : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(labelText: t.t('enquiry.email')),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return t.t('enquiry.required');
                        if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())) {
                          return t.t('enquiry.invalidEmail');
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _mobile,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(labelText: t.t('enquiry.mobile'), hintText: '+966…'),
                      validator: (v) => (v == null || v.trim().length < 6) ? t.t('enquiry.required') : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _service,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(labelText: t.t('enquiry.service')),
                      validator: (v) => (v == null || v.trim().isEmpty) ? t.t('enquiry.required') : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _message,
                      maxLines: 4,
                      decoration: InputDecoration(
                        labelText: t.t('enquiry.message'),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: _sending ? null : _submit,
                      icon: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Brand.ink))
                          : const Icon(Icons.send_rounded),
                      label: Text(t.t('enquiry.send')),
                    ),
                  ],
                ),
              ),
        ),
        ),
      ),
    );
  }
}
