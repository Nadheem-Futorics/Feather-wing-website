import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/app_state.dart';
import 'screens/root_shell.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState();
  state.init();
  runApp(
    ChangeNotifierProvider.value(
      value: state,
      child: const FeatherWingApp(),
    ),
  );
}

class FeatherWingApp extends StatelessWidget {
  const FeatherWingApp({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return MaterialApp(
      title: 'Feather Wing Tours',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(state.lang),
      home: Directionality(
        textDirection: state.direction,
        child: const RootShell(),
      ),
    );
  }
}
