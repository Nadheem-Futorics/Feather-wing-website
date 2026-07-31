import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/app_state.dart';
import '../theme.dart';
import '../widgets/fx.dart';

/// Compact trip-creation form (the website has a 4-step wizard; the app keeps
/// it to the essentials — name, destination, dates, party).
class TripNewScreen extends StatefulWidget {
  const TripNewScreen({super.key});

  @override
  State<TripNewScreen> createState() => _TripNewScreenState();
}

class _TripNewScreenState extends State<TripNewScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _destination = TextEditingController();
  DateTime? _start;
  DateTime? _end;
  int _adults = 2;
  int _children = 0;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _destination.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool start) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: start ? (_start ?? now) : (_end ?? _start ?? now),
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365 * 2)),
    );
    if (picked == null) return;
    setState(() {
      if (start) {
        _start = picked;
        if (_end != null && _end!.isBefore(picked)) _end = picked;
      } else {
        _end = picked;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final state = context.read<AppState>();
    final fmt = DateFormat('yyyy-MM-dd');
    try {
      await state.api.createTrip({
        'name': _name.text.trim(),
        'destinations': [
          {'name': _destination.text.trim()},
        ],
        if (_start != null) 'startDate': fmt.format(_start!),
        if (_end != null) 'endDate': fmt.format(_end!),
        'adults': _adults,
        'children': _children,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(state.l10n.t('trips.created'))));
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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
    final fmt = DateFormat('yyyy-MM-dd');
    return Directionality(
      textDirection: state.direction,
      child: AmbientBackground(
        child: DismissKeyboard(
          child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: Text(t.t('trips.new')),
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: EdgeInsets.fromLTRB(20, 20, 20, keyboardPadding(context, base: 40)),
            children: [
              TextFormField(
                controller: _name,
                decoration: InputDecoration(labelText: t.t('trips.name'), hintText: t.t('trips.nameHint')),
                validator: (v) => (v == null || v.trim().length < 2) ? t.t('enquiry.required') : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _destination,
                decoration:
                    InputDecoration(labelText: t.t('trips.destination'), hintText: t.t('trips.destinationHint')),
                validator: (v) => (v == null || v.trim().length < 2) ? t.t('enquiry.required') : null,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(true),
                      icon: const Icon(Icons.calendar_today_rounded, size: 16),
                      label: Text(_start == null ? t.t('trips.startDate') : fmt.format(_start!)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(false),
                      icon: const Icon(Icons.calendar_month_rounded, size: 16),
                      label: Text(_end == null ? t.t('trips.endDate') : fmt.format(_end!)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _Counter(
                label: t.t('trips.adults'),
                value: _adults,
                min: 1,
                onChanged: (v) => setState(() => _adults = v),
              ),
              const SizedBox(height: 10),
              _Counter(
                label: t.t('trips.children'),
                value: _children,
                min: 0,
                onChanged: (v) => setState(() => _children = v),
              ),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Brand.ink))
                    : const Icon(Icons.check_rounded),
                label: Text(t.t('trips.create')),
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

class _Counter extends StatelessWidget {
  final String label;
  final int value;
  final int min;
  final ValueChanged<int> onChanged;

  const _Counter({required this.label, required this.value, required this.min, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Brand.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Brand.cardBorder, width: 0.6),
      ),
      child: Row(
        children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.titleMedium)),
          IconButton(
            onPressed: value > min ? () => onChanged(value - 1) : null,
            icon: const Icon(Icons.remove_circle_outline_rounded, color: Brand.goldLight),
          ),
          SizedBox(width: 28, child: Center(child: Text('$value', style: Theme.of(context).textTheme.titleMedium))),
          IconButton(
            onPressed: () => onChanged(value + 1),
            icon: const Icon(Icons.add_circle_outline_rounded, color: Brand.goldLight),
          ),
        ],
      ),
    );
  }
}
