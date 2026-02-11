import SwiftUI

struct ContentView: View {
    @StateObject private var matchManager = MatchManager()
    @StateObject private var healthManager = HealthManager()
    @State private var selectedTab: Tab = .scoreboard
    @State private var showFinishAlert = false

    enum Tab: String, CaseIterable {
        case scoreboard = "Marcador"
        case timer = "Tiempo"
        case health = "Salud"

        var icon: String {
            switch self {
            case .scoreboard: return "sportscourt"
            case .timer: return "timer"
            case .health: return "heart.fill"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Logo
                Image("logo_futbol")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 50, height: 50)
                    .padding(.top, 4)

                // TabView con las vistas
                TabView(selection: $selectedTab) {
                    // Scoreboard Tab
                    ScoreboardView()
                        .tag(Tab.scoreboard)
                        .environmentObject(matchManager)

                    // Timer Tab
                    TimerView()
                        .tag(Tab.timer)
                        .environmentObject(matchManager)

                    // Health Tab
                    HealthView()
                        .tag(Tab.health)
                        .environmentObject(healthManager)
                        .environmentObject(matchManager)
                }
                .tabViewStyle(.page)
                .frame(height: 140)

                // Botón Finalizar Partido
                Button(action: {
                    showFinishAlert = true
                }) {
                    HStack {
                        Image(systemName: "flag.checkered")
                        Text("Finalizar Partido")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
            }
        }
        .onAppear {
            setupHealthCallback()
            // Activar WatchConnectivity
            _ = WatchConnectivityManager.shared
        }
        .alert("Finalizar Partido", isPresented: $showFinishAlert) {
            Button("Cancelar", role: .cancel) { }
            Button("Finalizar", role: .destructive) {
                matchManager.finishMatch()
                matchManager.startNewMatch()
            }
        } message: {
            Text("¿Guardar resultado \(matchManager.matchData.homeTeam.name) \(matchManager.matchData.homeTeam.score) - \(matchManager.matchData.awayTeam.score) \(matchManager.matchData.awayTeam.name)?")
        }
    }

    private func setupHealthCallback() {
        healthManager.onHeartRateUpdate = { bpm in
            matchManager.addHeartRateSample(bpm)
        }
    }
}

// MARK: - Alternative Navigation Style (List-based)
struct MainMenuView: View {
    @StateObject private var matchManager = MatchManager()
    @StateObject private var healthManager = HealthManager()

    var body: some View {
        NavigationStack {
            List {
                // Quick Score Display
                Section {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(matchManager.matchData.homeTeam.name)
                                .font(.system(size: 12))
                                .foregroundColor(.green)
                            Text("\(matchManager.matchData.homeTeam.score)")
                                .font(.system(size: 24, weight: .bold))
                        }

                        Spacer()

                        Text(matchManager.displayTime)
                            .font(.system(size: 14, weight: .medium, design: .monospaced))
                            .foregroundColor(matchManager.isRunning ? .green : .secondary)

                        Spacer()

                        VStack(alignment: .trailing) {
                            Text(matchManager.matchData.awayTeam.name)
                                .font(.system(size: 12))
                                .foregroundColor(.blue)
                            Text("\(matchManager.matchData.awayTeam.score)")
                                .font(.system(size: 24, weight: .bold))
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Navigation Items
                Section {
                    NavigationLink(destination: ScoreboardView().environmentObject(matchManager)) {
                        Label("Marcador", systemImage: "sportscourt")
                    }

                    NavigationLink(destination: TimerView().environmentObject(matchManager)) {
                        Label("Cronómetro", systemImage: "timer")
                    }

                    NavigationLink(destination: HealthView().environmentObject(healthManager).environmentObject(matchManager)) {
                        Label {
                            HStack {
                                Text("Salud")
                                Spacer()
                                if healthManager.isMonitoring {
                                    Text("\(Int(healthManager.currentHeartRate)) BPM")
                                        .font(.system(size: 11))
                                        .foregroundColor(.red)
                                }
                            }
                        } icon: {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                        }
                    }
                }

                // Quick Actions
                Section("Acciones") {
                    Button(action: {
                        if matchManager.isRunning {
                            matchManager.pauseTimer()
                        } else {
                            matchManager.startTimer()
                        }
                    }) {
                        Label(matchManager.isRunning ? "Pausar" : "Iniciar",
                              systemImage: matchManager.isRunning ? "pause.fill" : "play.fill")
                    }

                    Button(action: {
                        matchManager.startNewMatch()
                    }) {
                        Label("Nuevo Partido", systemImage: "plus.circle")
                    }
                }
            }
            .navigationTitle("FutbolPro")
        }
    }
}

// MARK: - Sync Status View
struct SyncStatusView: View {
    @ObservedObject var connectivityManager = WatchConnectivityManager.shared

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(connectivityManager.isReachable ? Color.green : Color.orange)
                .frame(width: 6, height: 6)

            Text(connectivityManager.isReachable ? "Conectado" : "Sin conexión")
                .font(.system(size: 9))
                .foregroundColor(.secondary)

            if let lastSync = connectivityManager.lastSyncDate {
                Text("·")
                    .foregroundColor(.secondary)
                Text(lastSync, style: .relative)
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }
        }
    }
}

#Preview {
    ContentView()
}
