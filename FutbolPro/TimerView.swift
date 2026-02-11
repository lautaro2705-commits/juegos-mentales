import SwiftUI

struct TimerView: View {
    @EnvironmentObject var matchManager: MatchManager
    @State private var showingConfig = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Main Timer Display
                timerDisplay

                // Control Buttons
                controlButtons

                // Period Info
                periodInfo

                // Quick Actions
                quickActions
            }
            .padding(.horizontal, 4)
        }
        .sheet(isPresented: $showingConfig) {
            TimerConfigView(matchManager: matchManager)
        }
    }

    // MARK: - Timer Display
    private var timerDisplay: some View {
        VStack(spacing: 4) {
            Text(matchManager.displayTime)
                .font(.system(size: 48, weight: .bold, design: .monospaced))
                .foregroundColor(timerColor)

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 4)

                    Rectangle()
                        .fill(timerColor)
                        .frame(width: geometry.size.width * progressPercentage, height: 4)
                }
                .cornerRadius(2)
            }
            .frame(height: 4)
            .padding(.horizontal)
        }
    }

    private var timerColor: Color {
        if matchManager.matchData.isExtraTime {
            return .orange
        } else if matchManager.isRunning {
            return .green
        } else {
            return .white
        }
    }

    private var progressPercentage: CGFloat {
        let maxTime = matchManager.matchData.isExtraTime
            ? matchManager.matchData.extraTimeDuration
            : matchManager.matchData.periodDuration

        guard maxTime > 0 else { return 0 }
        return CGFloat(matchManager.matchData.elapsedTime / maxTime)
    }

    // MARK: - Control Buttons
    private var controlButtons: some View {
        HStack(spacing: 12) {
            // Start/Pause Button
            Button(action: {
                if matchManager.isRunning {
                    matchManager.pauseTimer()
                } else {
                    matchManager.startTimer()
                }
            }) {
                Image(systemName: matchManager.isRunning ? "pause.fill" : "play.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                    .frame(width: 50, height: 50)
                    .background(matchManager.isRunning ? Color.orange : Color.green)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            // Reset Button
            Button(action: {
                matchManager.resetTimer()
            }) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 20))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.red.opacity(0.8))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            // Config Button
            Button(action: {
                showingConfig = true
            }) {
                Image(systemName: "gear")
                    .font(.system(size: 20))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.blue.opacity(0.8))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Period Info
    private var periodInfo: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(matchManager.matchData.isExtraTime ? "Tiempo Extra" : "Periodo")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)

                Text(matchManager.matchData.isExtraTime ? "ET" : "\(matchManager.matchData.currentPeriod) de \(matchManager.matchData.totalPeriods)")
                    .font(.system(size: 14, weight: .semibold))
            }

            Spacer()

            // Status Badge
            statusBadge
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color.gray.opacity(0.2))
        .cornerRadius(8)
    }

    private var statusBadge: some View {
        Text(statusText)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor)
            .cornerRadius(4)
    }

    private var statusText: String {
        switch matchManager.matchData.matchStatus {
        case .notStarted: return "LISTO"
        case .inProgress: return "EN JUEGO"
        case .paused: return "PAUSA"
        case .halfTime: return "DESCANSO"
        case .finished: return "FIN"
        }
    }

    private var statusColor: Color {
        switch matchManager.matchData.matchStatus {
        case .notStarted: return .gray
        case .inProgress: return .green
        case .paused: return .orange
        case .halfTime: return .blue
        case .finished: return .red
        }
    }

    // MARK: - Quick Actions
    private var quickActions: some View {
        HStack(spacing: 8) {
            Button(action: {
                matchManager.nextPeriod()
            }) {
                Label("Siguiente", systemImage: "forward.fill")
                    .font(.system(size: 11))
            }
            .buttonStyle(.bordered)
            .disabled(matchManager.matchData.matchStatus == .finished)

            Button(action: {
                matchManager.endMatch()
            }) {
                Label("Finalizar", systemImage: "flag.checkered")
                    .font(.system(size: 11))
            }
            .buttonStyle(.bordered)
            .tint(.red)
        }
    }
}

// MARK: - Timer Configuration View
struct TimerConfigView: View {
    @ObservedObject var matchManager: MatchManager
    @Environment(\.dismiss) var dismiss

    @State private var selectedPreset: TimerPreset = .standard
    @State private var customMinutes: Int = 45
    @State private var customPeriods: Int = 2
    @State private var extraTimeMinutes: Int = 15

    enum TimerPreset: String, CaseIterable {
        case standard = "Estándar (45')"
        case fiveASide = "Fútbol 5 (20')"
        case youth = "Juvenil (25')"
        case custom = "Personalizado"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Configuración")
                    .font(.headline)

                // Preset Picker
                ForEach(TimerPreset.allCases, id: \.self) { preset in
                    Button(action: {
                        selectedPreset = preset
                        applyPreset(preset)
                    }) {
                        HStack {
                            Text(preset.rawValue)
                                .font(.system(size: 13))
                            Spacer()
                            if selectedPreset == preset {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.green)
                            }
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(selectedPreset == preset ? Color.green.opacity(0.2) : Color.gray.opacity(0.2))
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }

                // Custom Options (shown when custom is selected)
                if selectedPreset == .custom {
                    VStack(spacing: 8) {
                        Stepper("Minutos: \(customMinutes)", value: $customMinutes, in: 5...90)
                            .font(.system(size: 12))

                        Stepper("Periodos: \(customPeriods)", value: $customPeriods, in: 1...4)
                            .font(.system(size: 12))

                        Stepper("Tiempo extra: \(extraTimeMinutes)'", value: $extraTimeMinutes, in: 0...30)
                            .font(.system(size: 12))
                    }
                    .padding(8)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(8)
                }

                // Apply Button
                Button(action: {
                    applyConfiguration()
                    dismiss()
                }) {
                    Text("Aplicar")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding()
        }
    }

    private func applyPreset(_ preset: TimerPreset) {
        switch preset {
        case .standard:
            customMinutes = 45
            customPeriods = 2
            extraTimeMinutes = 15
        case .fiveASide:
            customMinutes = 20
            customPeriods = 2
            extraTimeMinutes = 5
        case .youth:
            customMinutes = 25
            customPeriods = 2
            extraTimeMinutes = 5
        case .custom:
            break
        }
    }

    private func applyConfiguration() {
        let config = TimerConfig(
            periodDuration: TimeInterval(customMinutes * 60),
            extraTimeDuration: TimeInterval(extraTimeMinutes * 60),
            totalPeriods: customPeriods
        )
        matchManager.configureTimer(config)
    }
}

#Preview {
    TimerView()
        .environmentObject(MatchManager())
}
