# 🚀 Guía Visual: Abrir FutbolPro en Xcode

## ¿Qué tienes ahora?

✅ **Todos los archivos Swift están listos**
✅ **Todos los archivos de configuración están preparados**
✅ **Documentación completa incluida**

## ¿Qué falta?

❌ Crear el proyecto `.xcodeproj` en Xcode (no se puede hacer automáticamente)

---

## 📺 Pasos Visuales (Con Capturas Mentales)

### PASO 1: Abrir Xcode

```bash
# Ejecuta esto en la terminal:
open -a Xcode
```

O haz doble click en el icono de Xcode en tu Mac.

---

### PASO 2: Crear Nuevo Proyecto

**En Xcode:**

1. Verás la ventana de bienvenida de Xcode
2. Click en **"Create New Project"** (botón grande azul)

**O desde el menú:**
- File → New → Project... (⇧⌘N)

---

### PASO 3: Seleccionar Plantilla

**Ventana de plantillas:**

```
┌─────────────────────────────────────────┐
│  Platforms:                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │iOS │ │macOS│ │watch│ │tv │           │
│  └────┘ └────┘ └────┘ └────┘           │
│                                         │
│  Application:                           │
│  ┌──────────┐ ┌──────────┐             │
│  │   App    │ │  Document │             │ ← Selecciona "App"
│  │  [ICON]  │ │  [ICON]  │             │
│  └──────────┘ └──────────┘             │
└─────────────────────────────────────────┘
```

1. Selecciona **iOS** en la parte superior
2. Selecciona **App** (el primero)
3. Click **Next**

---

### PASO 4: Configurar Proyecto

**Ventana de configuración:**

```
Product Name:              FutbolPro
Team:                      [Tu cuenta de desarrollador]
Organization Identifier:   com.tuempresa
Bundle Identifier:         com.tuempresa.FutbolPro
Interface:                 SwiftUI  ← IMPORTANTE
Language:                  Swift    ← IMPORTANTE
☑️ Include Tests

[Cancel]  [Previous]  [Next →]
```

**IMPORTANTE:**
- Interface DEBE ser **SwiftUI**
- Language DEBE ser **Swift**

Click **Next**

---

### PASO 5: Elegir Ubicación

**Ventana de guardado:**

```
Save As: FutbolPro

Where:   /Users/macbook/mis-proyectos/FutbolProXcode/

☐ Create Git repository on my Mac
☐ Add to:

[Cancel]  [Create]
```

**IMPORTANTE:** Guarda en:
```
/Users/macbook/mis-proyectos/FutbolProXcode/
```

Click **Create**

---

### PASO 6: Agregar Watch App

**En el proyecto ya creado:**

1. Menú: **File → New → Target...**

2. En la ventana de plantillas:
   - Selecciona **watchOS** en la barra lateral
   - Selecciona **Watch App**
   - Click **Next**

3. Configuración:
```
Product Name:       FutbolPro Watch App
Bundle Identifier:  com.tuempresa.FutbolPro.watchkitapp
```

4. Click **Finish**

5. Aparecerá un diálogo: **"Activate 'FutbolPro Watch App' scheme?"**
   - Click **Activate**

---

### PASO 7: Agregar HealthKit Capability (iOS)

**En el Project Navigator (barra lateral izquierda):**

1. Click en el proyecto **FutbolPro** (icono azul arriba de todo)

2. Verás una lista de targets en el centro:
   - FutbolPro (iOS)
   - FutbolPro Watch App
   - FutbolProTests
   - FutbolProUITests

3. Selecciona **FutbolPro** (el primero, iOS)

4. Click en la pestaña **"Signing & Capabilities"** (arriba)

5. Click en **"+ Capability"** (botón con + en la parte superior)

6. Busca **"HealthKit"** en el cuadro de búsqueda

7. Doble click en **HealthKit** para agregarlo

8. Repite: Click **"+ Capability"** otra vez

9. Busca **"Background Modes"**

10. Doble click en **Background Modes**

11. Marca la casilla: **☑️ Background fetch**

---

### PASO 8: Agregar HealthKit Capability (Watch)

**Mismo proceso, pero para el Watch:**

1. En la lista de targets, selecciona **FutbolPro Watch App**

2. Click en la pestaña **"Signing & Capabilities"**

3. Click en **"+ Capability"**

4. Busca y agrega **"HealthKit"**

---

### PASO 9: Copiar Archivos

**Ahora viene la parte importante:**

#### A) Crear Grupo Shared

1. En el **Project Navigator** (barra izquierda), click derecho en **FutbolPro**

2. Selecciona **New Group**

3. Nómbralo: **Shared**

4. Arrastra estos archivos desde Finder a este grupo:
   ```
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Shared/Match.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Shared/MatchViewModel.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Shared/HealthKitManager.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Shared/WatchConnectivityManager.swift
   ```

5. **CRÍTICO:** Cuando aparezca el diálogo de importación, asegúrate de marcar:
   ```
   Options:
   ☑️ Copy items if needed
   ☐ Create groups
   ☐ Create folder references

   Add to targets:
   ☑️ FutbolPro
   ☑️ FutbolPro Watch App  ← AMBOS deben estar marcados
   ```

#### B) Reemplazar/Agregar Archivos iOS

1. En el grupo **FutbolPro** (iOS), arrastra estos archivos:
   ```
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/iOS/FutbolProApp.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/iOS/ContentView.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/iOS/MatchSetupView.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/iOS/MatchDashboardView.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/iOS/MatchHistoryView.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/iOS/Extensions.swift
   ```

2. Si pregunta si reemplazar `FutbolProApp.swift` y `ContentView.swift`, di **Replace**

3. En el diálogo, marca SOLO:
   ```
   Add to targets:
   ☑️ FutbolPro
   ☐ FutbolPro Watch App  ← DESMARCADO
   ```

#### C) Agregar Archivos Watch

1. En el grupo **FutbolPro Watch App**, arrastra estos archivos:
   ```
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Watch/WatchApp.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Watch/WatchMatchView.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Watch/WatchMatchViewModel.swift
   /Users/macbook/mis-proyectos/FutbolProXcode/FutbolPro/Watch/WatchConnectivityManager+Watch.swift
   ```

2. En el diálogo, marca SOLO:
   ```
   Add to targets:
   ☐ FutbolPro  ← DESMARCADO
   ☑️ FutbolPro Watch App
   ```

---

### PASO 10: Configurar Info.plist (iOS)

1. En el **Project Navigator**, busca **Info.plist** (dentro de FutbolPro)

2. Click derecho → **Open As → Source Code**

3. Busca la línea con `</dict>` al final

4. **ANTES** de esa línea, pega esto:

```xml
	<key>NSHealthShareUsageDescription</key>
	<string>FutbolPro necesita acceso a tu frecuencia cardíaca y calorías para monitorear tu rendimiento durante los partidos.</string>
	<key>NSHealthUpdateUsageDescription</key>
	<string>FutbolPro necesita permiso para registrar tus datos de actividad durante los partidos.</string>
	<key>UIBackgroundModes</key>
	<array>
		<string>processing</string>
	</array>
```

5. Guarda (⌘S)

---

### PASO 11: Configurar Info.plist (Watch)

1. Busca el **Info.plist** del Watch (dentro de FutbolPro Watch App)

2. Click derecho → **Open As → Source Code**

3. Antes de `</dict>`, pega esto:

```xml
	<key>NSHealthShareUsageDescription</key>
	<string>FutbolPro necesita acceso a tu frecuencia cardíaca y calorías para monitorear tu rendimiento durante los partidos.</string>
```

4. Guarda (⌘S)

---

### PASO 12: Compilar

**¡Momento de la verdad!**

1. **Limpiar primero:**
   - Menú: **Product → Clean Build Folder** (⇧⌘K)
   - Espera unos segundos

2. **Compilar iOS:**
   - Arriba a la izquierda, selecciona el esquema: **FutbolPro** (no el Watch)
   - Selecciona simulador: **iPhone 15 Pro**
   - Click en el botón ▶️ (Play) o presiona ⌘R

3. Si compila sin errores: **¡ÉXITO! 🎉**

4. **Compilar Watch:**
   - Selecciona esquema: **FutbolPro Watch App**
   - Selecciona simulador: **Apple Watch Series 9 (45mm)**
   - Click ▶️

---

## 🎉 ¡Felicidades!

Si llegaste hasta aquí sin errores, ¡FutbolPro está funcionando!

### Qué esperar:

**En iPhone:**
- Pantalla de configuración con campos para nombres de equipos
- Botón verde "Iniciar Partido"

**En Watch:**
- 3 pestañas deslizables (Timer, Score, Health)

---

## 🚨 Errores Comunes

### "Cannot find 'neonGreen' in scope"
**Causa:** Extensions.swift no está en el target correcto
**Solución:**
1. Click en Extensions.swift
2. Panel derecho → File Inspector
3. En "Target Membership", marca ☑️ FutbolPro

### "No such module 'HealthKit'"
**Causa:** Falta agregar la capability
**Solución:** Repite PASO 7 y PASO 8

### Muchos errores rojos
**Causa:** Target Membership incorrecto en archivos Shared
**Solución:**
1. Click en cada archivo de Shared/
2. Panel derecho → Target Membership
3. Marca ☑️ FutbolPro y ☑️ FutbolPro Watch App

---

## 📞 Siguiente Nivel

Una vez que compile, lee:
- `README.md` para documentación completa
- `ARCHITECTURE.md` para entender el código

---

**¡Disfruta desarrollando con FutbolPro!** ⚽️🏆
