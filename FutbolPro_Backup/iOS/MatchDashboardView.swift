//
//  MatchDashboardView.swift
//  FutbolPro
//
//  Main match control dashboard
//

import SwiftUI

struct MatchDashboardView: View {
    @EnvironmentObject var viewModel: MatchViewModel
    @EnvironmentObject var healthKitManager: HealthKitManager
    @State private var showingExtraTimeSheet = false
    @State private var showingFinishAlert = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 20) {
                // Health Stats Bar
                HealthStatsBar()

                Spacer()

                // Timer Display
                TimerDisplay()

                Spacer()

                // Score Display
                ScoreBoard()

                Spacer()

                // Controls
                ControlButtons()

                Spacer()

                // Extra Time & Finish
                BottomControls()
            }
            .padding()
        }
        .alert("Finalizar Partido", isPresented: $showingFinishAlert) {
            Button("Cancelar", role: .cancel) { }
            Button("Finalizar", role: .destructive) {
                viewModel.finishMatch()
            }
        } message: {
            Text("¿Deseas guardar este partido y finalizar?")
        }
        .sheet(isPresented: $showingExtraTimeSheet) {
            ExtraTimeSheet(isPresented: $showingExtraTimeSheet)
        }
        .onReceive(NotificationCenter.default.publisher(for: .goalTeam1)) { _ in
            viewModel.addGoalTeam1()
        }
        .onReceive(NotificationCenter.default.publisher(for: .goalTeam2)) { _ in
            viewModel.addGoalTeam2()
        }
        .onReceive(NotificationCenter.default.publisher(for: .toggleTimer)) { _ in
            viewModel.toggleTimer()
        }
        .onChange(of: viewModel.isMatchActive) { isActive in
            if isActive {
                sendMatchStateToWatch()
            }
        }
        .onChange(of: viewModel.team1Score) { _ in
            sendMatchStateToWatch()
        }
        .onChange(of: viewModel.team2Score) { _ in
            sendMatchStateToWatch()
        }
        .onChange(of: viewModel.elapsedTime) { _ in
            if Int(viewModel.elapsedTime) % 5 == 0 {
                sendMatchStateToWatch()
            }
        }
    }

    private func sendMatchStateToWatch() {
        WatchConnectivityManager.shared.sendMatchState(
            team1Name: viewModel.team1Name,
            team2Name: viewModel.team2Name,
            team1Score: viewModel.team1Score,
            team2Score: viewModel.team2Score,
            elapsedTime: viewModel.elapsedTime,
            isRunning: viewModel.isTimerRunning
        )
    }
}

// MARK: - Health Stats Bar
struct HealthStatsBar: View {
    @EnvironmentObject var healthKitManager: HealthKitManager

    var body: some View {
        HStack(spacing: 30) {
            HealthStatItem(
                icon: "heart.fill",
                value: String(format: "%.0f", healthKitManager.currentHeartRate),
                unit: "BPM",
                color: .red
            )

            HealthStatItem(
                icon: "flame.fill",
                value: String(format: "%.0f", healthKitManager.caloriesBurned),
                unit: "kcal",
                color: .orange
            )
        }
        .padding()
        .background(Color.gray.opacity(0.2))
        .cornerRadius(15)
    }
}

struct HealthStatItem: View {
    let icon: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text(unit)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Timer Display
struct TimerDisplay: View {
    @EnvironmentObject var viewModel: MatchViewModel

    var body: some View {
        VStack(spacing: 10) {
            Text(viewModel.formatTime(viewModel.elapsedTime))
                .font(.system(size: 70, weight: .bold, design: .rounded))
                .foregroundColor(.neonGreen)
                .monospacedDigit()

            // Remaining Time
            if !viewModel.isMatchFinished {
                Text("Quedan: \(viewModel.formatTime(viewModel.remainingTime))")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            } else {
                Text("¡TIEMPO CUMPLIDO!")
                    .font(.headline)
                    .foregroundColor(.neonGreen)
            }
        }
    }
}

// MARK: - ScoreBoard
struct ScoreBoard: View {
    @EnvironmentObject var viewModel: MatchViewModel

    var body: some View {
        HStack(spacing: 40) {
            // Team 1
            TeamScoreView(
                teamName: viewModel.team1Name,
                score: viewModel.team1Score,
                addGoal: { viewModel.addGoalTeam1() }
            )

            // VS Separator
            Text("VS")
                .font(.title2)
                .foregroundColor(.gray)

            // Team 2
            TeamScoreView(
                teamName: viewModel.team2Name,
                score: viewModel.team2Score,
                addGoal: { viewModel.addGoalTeam2() }
            )
        }
    }
}

struct TeamScoreView: View {
    let teamName: String
    let score: Int
    let addGoal: () -> Void

    var body: some View {
        VStack(spacing: 15) {
            Text(teamName)
                .font(.headline)
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)

            Text("\(score)")
                .font(.system(size: 80, weight: .bold))
                .foregroundColor(.white)

            Button(action: addGoal) {
                HStack {
                    Image(systemName: "plus")
                    Text("Gol")
                }
                .font(.headline)
                .foregroundColor(.black)
                .padding(.horizontal, 25)
                .padding(.vertical, 12)
                .background(Color.neonGreen)
                .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Control Buttons
struct ControlButtons: View {
    @EnvironmentObject var viewModel: MatchViewModel

    var body: some View {
        HStack(spacing: 20) {
            // Play/Pause Button
            Button(action: { viewModel.toggleTimer() }) {
                Image(systemName: viewModel.isTimerRunning ? "pause.circle.fill" : "play.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.neonGreen)
            }

            // Reset Button
            Button(action: { viewModel.resetMatch() }) {
                Image(systemName: "arrow.counterclockwise.circle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Bottom Controls
struct BottomControls: View {
    @EnvironmentObject var viewModel: MatchViewModel
    @Binding var showingExtraTimeSheet: Bool
    @Binding var showingFinishAlert: Bool

    init() {
        _showingExtraTimeSheet = .constant(false)
        _showingFinishAlert = .constant(false)
    }

    var body: some View {
        HStack(spacing: 15) {
            // Extra Time Button
            Button(action: { showingExtraTimeSheet = true }) {
                HStack {
                    Image(systemName: "clock.badge.plus")
                    Text("Tiempo Extra")
                }
                .font(.subheadline)
                .foregroundColor(.white)
                .padding()
                .background(Color.gray.opacity(0.3))
                .cornerRadius(10)
            }

            // Finish Button
            Button(action: { showingFinishAlert = true }) {
                HStack {
                    Image(systemName: "flag.checkered")
                    Text("Finalizar")
                }
                .font(.subheadline)
                .foregroundColor(.black)
                .padding()
                .background(Color.neonGreen)
                .cornerRadius(10)
            }
        }
    }
}

// MARK: - Extra Time Sheet
struct ExtraTimeSheet: View {
    @EnvironmentObject var viewModel: MatchViewModel
    @Binding var isPresented: Bool
    @State private var selectedMinutes = 5

    let minuteOptions = [1, 2, 3, 5, 10, 15]

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 30) {
                    Text("Agregar Tiempo Extra")
                        .font(.title2)
                        .foregroundColor(.white)

                    Picker("Minutos", selection: $selectedMinutes) {
                        ForEach(minuteOptions, id: \.self) { minutes in
                            Text("\(minutes) min")
                                .tag(minutes)
                        }
                    }
                    .pickerStyle(WheelPickerStyle())
                    .frame(height: 150)

                    Button(action: {
                        viewModel.addExtraTime(minutes: selectedMinutes)
                        isPresented = false
                    }) {
                        Text("Agregar")
                            .font(.headline)
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.neonGreen)
                            .cornerRadius(10)
                    }
                    .padding(.horizontal)
                }
            }
            .navigationBarItems(trailing: Button("Cancelar") {
                isPresented = false
            })
        }
        .preferredColorScheme(.dark)
    }
}

struct MatchDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        MatchDashboardView()
            .environmentObject(MatchViewModel(healthKitManager: HealthKitManager()))
            .environmentObject(HealthKitManager())
            .preferredColorScheme(.dark)
    }
}
