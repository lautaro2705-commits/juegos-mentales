import SwiftUI

struct HealthView: View {
    @EnvironmentObject var healthManager: HealthManager
    @EnvironmentObject var matchManager: MatchManager

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Heart Rate Display
                heartRateDisplay

                // Stats Grid
                statsGrid

                // Control Button
                controlButton

                // Authorization Status
                if healthManager.authorizationStatus != .sharingAuthorized {
                    authorizationWarning
                }
            }
            .padding(.horizontal, 4)
        }
        .onAppear {
            Task {
                await healthManager.requestAuthorization()
            }
            // Connect health updates to match manager
            healthManager.onHeartRateUpdate = { bpm in
                matchManager.addHeartRateSample(bpm)
            }
        }
    }

    // MARK: - Heart Rate Display
    private var heartRateDisplay: some View {
        VStack(spacing: 4) {
            // Heart Icon with Animation
            ZStack {
                Circle()
                    .fill(zoneColor.opacity(0.2))
                    .frame(width: 80, height: 80)

                Image(systemName: "heart.fill")
                    .font(.system(size: 36))
                    .foregroundColor(zoneColor)
                    .scaleEffect(healthManager.isMonitoring ? 1.1 : 1.0)
                    .animation(
                        healthManager.isMonitoring
                            ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                            : .default,
                        value: healthManager.isMonitoring
                    )
            }

            // BPM Value
            HStack(alignment: .lastTextBaseline, spacing: 4) {
                Text(healthManager.currentHeartRate > 0 ? "\(Int(healthManager.currentHeartRate))" : "--")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("BPM")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
            }

            // Zone Indicator
            Text(healthManager.getHeartRateZone().rawValue)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(zoneColor)
                .cornerRadius(12)
        }
    }

    private var zoneColor: Color {
        switch healthManager.getHeartRateZone() {
        case .rest: return .gray
        case .warmUp: return .blue
        case .fatBurn: return .green
        case .cardio: return .orange
        case .peak: return .red
        }
    }

    // MARK: - Stats Grid
    private var statsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 8) {
            statCard(title: "Promedio", value: healthManager.averageHeartRate, icon: "heart.text.square")
            statCard(title: "Máximo", value: healthManager.maxHeartRate, icon: "arrow.up.heart")
            statCard(title: "Mínimo", value: healthManager.minHeartRate, icon: "arrow.down.heart")
            statCard(title: "Muestras", value: Double(matchManager.matchData.heartRateSamples.count), icon: "list.bullet.rectangle", isCount: true)
        }
    }

    private func statCard(title: String, value: Double, icon: String, isCount: Bool = false) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.green)

            Text(isCount ? "\(Int(value))" : (value > 0 ? "\(Int(value))" : "--"))
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)

            Text(title)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.gray.opacity(0.2))
        .cornerRadius(8)
    }

    // MARK: - Control Button
    private var controlButton: some View {
        Button(action: {
            Task {
                if healthManager.isMonitoring {
                    await healthManager.stopMonitoring()
                } else {
                    await healthManager.startMonitoring()
                }
            }
        }) {
            HStack {
                Image(systemName: healthManager.isMonitoring ? "stop.fill" : "play.fill")
                Text(healthManager.isMonitoring ? "Detener" : "Iniciar Monitoreo")
                    .font(.system(size: 13, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(healthManager.isMonitoring ? Color.red : Color.green)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
        .disabled(healthManager.authorizationStatus != .sharingAuthorized)
    }

    // MARK: - Authorization Warning
    private var authorizationWarning: some View {
        VStack(spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 20))
                .foregroundColor(.yellow)

            Text("Se requiere acceso a Salud")
                .font(.system(size: 11, weight: .medium))
                .multilineTextAlignment(.center)

            Button(action: {
                Task {
                    await healthManager.requestAuthorization()
                }
            }) {
                Text("Autorizar")
                    .font(.system(size: 12, weight: .semibold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(6)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Color.yellow.opacity(0.1))
        .cornerRadius(10)
    }
}

// MARK: - Heart Rate Zone Legend
struct HeartRateZoneLegend: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Zonas")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.secondary)

            ForEach([HeartRateZone.rest, .warmUp, .fatBurn, .cardio, .peak], id: \.self) { zone in
                HStack(spacing: 6) {
                    Circle()
                        .fill(colorForZone(zone))
                        .frame(width: 8, height: 8)
                    Text(zone.rawValue)
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(rangeForZone(zone))
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(8)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(8)
    }

    private func colorForZone(_ zone: HeartRateZone) -> Color {
        switch zone {
        case .rest: return .gray
        case .warmUp: return .blue
        case .fatBurn: return .green
        case .cardio: return .orange
        case .peak: return .red
        }
    }

    private func rangeForZone(_ zone: HeartRateZone) -> String {
        switch zone {
        case .rest: return "<100"
        case .warmUp: return "100-129"
        case .fatBurn: return "130-159"
        case .cardio: return "160-179"
        case .peak: return "180+"
        }
    }
}

#Preview {
    HealthView()
        .environmentObject(HealthManager())
        .environmentObject(MatchManager())
}
