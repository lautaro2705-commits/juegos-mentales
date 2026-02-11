//
//  MatchViewModel.swift
//  FutbolPro
//
//  ViewModel for managing match state and logic
//

import Foundation
import Combine

class MatchViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var team1Name: String = "Equipo 1"
    @Published var team2Name: String = "Equipo 2"
    @Published var team1Score: Int = 0
    @Published var team2Score: Int = 0
    @Published var elapsedTime: TimeInterval = 0
    @Published var isMatchActive: Bool = false
    @Published var isTimerRunning: Bool = false
    @Published var matchHistory: [Match] = []

    // MARK: - Properties
    var selectedPeriod: MatchPeriod = .fortyfive
    var extraTime: TimeInterval = 0

    private var timer: Timer?
    private var matchStartDate: Date?
    private let healthKitManager: HealthKitManager

    // MARK: - Computed Properties
    var totalMatchTime: TimeInterval {
        return TimeInterval(selectedPeriod.minutes * 60) + extraTime
    }

    var remainingTime: TimeInterval {
        let remaining = totalMatchTime - elapsedTime
        return max(0, remaining)
    }

    var isMatchFinished: Bool {
        return elapsedTime >= totalMatchTime
    }

    // MARK: - Initialization
    init(healthKitManager: HealthKitManager) {
        self.healthKitManager = healthKitManager
        loadMatchHistory()
    }

    // MARK: - Match Control
    func startMatch() {
        guard !isMatchActive else { return }

        isMatchActive = true
        matchStartDate = Date()

        // Iniciar monitoreo de salud
        healthKitManager.startHeartRateMonitoring()
        healthKitManager.startCaloriesTracking()

        startTimer()
    }

    func toggleTimer() {
        if isTimerRunning {
            pauseTimer()
        } else {
            startTimer()
        }
    }

    private func startTimer() {
        guard !isTimerRunning else { return }

        isTimerRunning = true

        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            self.elapsedTime += 0.1

            // Actualizar calorías cada 5 segundos
            if Int(self.elapsedTime * 10) % 50 == 0 {
                self.healthKitManager.fetchCaloriesBurned()
            }

            // Verificar si el tiempo terminó
            if self.isMatchFinished {
                self.pauseTimer()
            }
        }
    }

    private func pauseTimer() {
        isTimerRunning = false
        timer?.invalidate()
        timer = nil
    }

    func resetMatch() {
        pauseTimer()

        team1Score = 0
        team2Score = 0
        elapsedTime = 0
        isMatchActive = false
        extraTime = 0
        matchStartDate = nil

        healthKitManager.stopHeartRateMonitoring()
    }

    func finishMatch() {
        pauseTimer()

        healthKitManager.stopTracking { [weak self] avgHeartRate, calories in
            guard let self = self, let startDate = self.matchStartDate else { return }

            let match = Match(
                team1Name: self.team1Name,
                team2Name: self.team2Name,
                team1Score: self.team1Score,
                team2Score: self.team2Score,
                duration: self.elapsedTime,
                startDate: startDate,
                endDate: Date(),
                averageHeartRate: avgHeartRate,
                caloriesBurned: calories
            )

            self.saveMatch(match)
            self.resetMatch()
        }
    }

    // MARK: - Score Management
    func addGoalTeam1() {
        team1Score += 1
    }

    func addGoalTeam2() {
        team2Score += 1
    }

    // MARK: - Time Management
    func addExtraTime(minutes: Int) {
        extraTime += TimeInterval(minutes * 60)
    }

    // MARK: - Persistence
    private func saveMatch(_ match: Match) {
        matchHistory.insert(match, at: 0)
        saveMatchHistory()
    }

    private func saveMatchHistory() {
        if let encoded = try? JSONEncoder().encode(matchHistory) {
            UserDefaults.standard.set(encoded, forKey: "matchHistory")
        }
    }

    private func loadMatchHistory() {
        if let data = UserDefaults.standard.data(forKey: "matchHistory"),
           let decoded = try? JSONDecoder().decode([Match].self, from: data) {
            matchHistory = decoded
        }
    }

    func deleteMatch(at offsets: IndexSet) {
        matchHistory.remove(atOffsets: offsets)
        saveMatchHistory()
    }

    // MARK: - Formatting Helpers
    func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        let milliseconds = Int((time.truncatingRemainder(dividingBy: 1)) * 10)
        return String(format: "%02d:%02d.%01d", minutes, seconds, milliseconds)
    }

    func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
