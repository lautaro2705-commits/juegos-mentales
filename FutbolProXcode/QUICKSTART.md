# FutbolPro - Guía de Inicio Rápido

## 🚀 Configuración en 5 Minutos

### 1. Crear Proyecto en Xcode

```bash
# Abre Xcode
# File → New → Project
# Selecciona: iOS App (SwiftUI)
# Product Name: FutbolPro
# Organization Identifier: com.tuempresa.FutbolPro
# Interface: SwiftUI
# Language: Swift
```

### 2. Agregar Watch App Target

```bash
# File → New → Target
# watchOS → Watch App
# Product Name: FutbolPro Watch App
# Finish
```

### 3. Configurar Capabilities

#### iOS Target (FutbolPro):
1. Selecciona el target principal
2. Pestaña **Signing & Capabilities**
3. Click **+ Capability**
4. Agrega:
   - HealthKit
   - Background Modes (marca "Background fetch")

#### Watch Target (FutbolPro Watch App):
1. Selecciona el target del Watch
2. Pestaña **Signing & Capabilities**
3. Click **+ Capability**
4. Agrega:
   - HealthKit

### 4. Organizar Archivos

#### Estructura de Carpetas:
```
FutbolPro/
├── Shared/          ← iOS + Watch targets
├── iOS/             ← Solo iOS target
└── Watch/           ← Solo Watch target
```

#### Copiar Archivos:

**Shared/** (Marca AMBOS targets en Target Membership):
- `Match.swift`
- `MatchViewModel.swift`
- `HealthKitManager.swift`
- `WatchConnectivityManager.swift`

**iOS/** (Marca SOLO iOS target):
- `FutbolProApp.swift`
- `ContentView.swift`
- `MatchSetupView.swift`
- `MatchDashboardView.swift`
- `MatchHistoryView.swift`
- `Extensions.swift`
- `Info.plist`

**Watch/** (Marca SOLO Watch target):
- `WatchApp.swift`
- `WatchMatchView.swift`
- `WatchMatchViewModel.swift`
- `WatchConnectivityManager+Watch.swift`
- `Info.plist`

### 5. Configurar Info.plist

Copia el archivo `Info.plist` proporcionado o agrega manualmente:

```xml
<key>NSHealthShareUsageDescription</key>
<string>FutbolPro necesita acceso a tu frecuencia cardíaca y calorías para monitorear tu rendimiento durante los partidos.</string>
```

### 6. Configurar Entitlements

#### Para iOS:
1. File → New → File → Property List
2. Nombre: `FutbolPro.entitlements`
3. Target Membership: FutbolPro (iOS)
4. Contenido:
```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.access</key>
<array/>
```

5. En Build Settings del target iOS:
   - Busca "Code Signing Entitlements"
   - Establece: `FutbolPro.entitlements`

#### Para Watch:
1. File → New → File → Property List
2. Nombre: `FutbolPro Watch App.entitlements`
3. Target Membership: FutbolPro Watch App
4. Mismo contenido que arriba

5. En Build Settings del target Watch:
   - Busca "Code Signing Entitlements"
   - Establece: `FutbolPro Watch App.entitlements`

### 7. Build Settings

Verifica:
- **iOS Deployment Target**: 16.0+
- **watchOS Deployment Target**: 9.0+
- **Swift Language Version**: Swift 5

### 8. Compilar y Ejecutar

```bash
# Limpia el proyecto primero
Product → Clean Build Folder (⇧⌘K)

# Para iPhone
Esquema: FutbolPro → iPhone 15 Pro (o tu simulador)
Product → Run (⌘R)

# Para Watch
Esquema: FutbolPro Watch App → Apple Watch Series 9 (45mm)
Product → Run (⌘R)
```

## ⚠️ Solución Rápida de Errores

### Error: "HealthKit entitlement is missing"
**Solución**: Verifica que el archivo `.entitlements` esté configurado en Build Settings → Code Signing Entitlements

### Error: "Cannot find 'neonGreen' in scope"
**Solución**: Asegúrate que `Extensions.swift` esté en el target correcto (iOS)

### Error: "WatchConnectivityManager not found"
**Solución**: Verifica que `WatchConnectivityManager.swift` tenga marcados AMBOS targets en Target Membership

### Error: Watch App no se sincroniza
**Solución**:
1. Asegúrate que ambas apps estén ejecutándose
2. El Watch debe estar desbloqueado
3. HealthKit solo funciona en dispositivos reales, no en simulador

### Error de compilación en Watch
**Solución**:
1. Verifica que los archivos en `Watch/` SOLO tengan el target Watch
2. Limpia Derived Data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

## 📱 Primer Uso

1. **Acepta permisos de HealthKit** cuando se soliciten
2. **En iPhone**: Configura nombres de equipos y presiona "Iniciar Partido"
3. **En Watch**: Desliza entre pestañas (Timer, Score, Health)
4. **Añade goles** desde cualquier dispositivo (se sincroniza automáticamente)
5. **Finaliza el partido** para guardarlo en el historial

## 🎯 Checklist de Verificación

Antes de compilar, asegúrate:

- [ ] Watch App Target creado
- [ ] HealthKit capability agregado en iOS y Watch
- [ ] Info.plist con NSHealthShareUsageDescription
- [ ] Archivos Shared tienen ambos targets marcados
- [ ] Archivos iOS solo tienen target iOS
- [ ] Archivos Watch solo tienen target Watch
- [ ] Entitlements configurados correctamente
- [ ] Deployment targets correctos (iOS 16+, watchOS 9+)

## 🧪 Pruebas Recomendadas

### En Simulador (Funcionalidad Básica):
- ✓ Configuración de partido
- ✓ Cronómetro funciona
- ✓ Marcador se actualiza
- ✓ Historial guarda datos
- ✗ HealthKit (NO disponible en simulador)

### En Dispositivo Real (Completo):
- ✓ Todo lo anterior
- ✓ Lectura de frecuencia cardíaca
- ✓ Seguimiento de calorías
- ✓ Sincronización iPhone-Watch

## 📚 Próximos Pasos

1. Personaliza los colores en `Extensions.swift`
2. Ajusta los periodos de tiempo en `Match.swift`
3. Modifica la UI en los archivos View
4. Agrega más estadísticas en `HealthKitManager.swift`

---

**¿Problemas?** Revisa el archivo `README.md` completo para documentación detallada.
