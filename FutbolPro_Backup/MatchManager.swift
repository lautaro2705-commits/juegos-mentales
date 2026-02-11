import Foundation
import Combine
import WatchKit

@MainActor
class MatchManager: ObservableObject {
    // MARK: - Published Properties
    @Published var matchData: MatchData
    @Published var displayTime: String = "00:00"
    @Published var isRunning: Bool = false

    // MARK: - Private Properties
    private var timer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init() {
        self.matchData = MatchData()
        updateDisplayTime()
    }

    // MARK: - Team Management
    func updateHomeTeamName(_ name: String) {
        matchData.homeTeam.name = name.isEmpty ? "Team One" : name
        syncToiOS()
    }

    func updateAwayTeamName(_ name: String) {
        matchData.awayTeam.name = name.isEmpty ? "Team Two" : name
        syncToiOS()
    }

    // MARK: - Score Management
    func addHomeGoal() {
        matchData.homeTeam.score += 1
        matchData.homeTeam.goalTimes.append(matchData.elapsedTime)
        hapticFeedback()
        syncToiOS()
    }

    func addAwayGoal() {
        matchData.awayTeam.score += 1
        matchData.awayTeam.goalTimes.append(matchData.elapsedTime)
        hapticFeedback()
        syncToiOS()
    }

    func subtractHomeGoal() {
        if matchData.homeTeam.score > 0 {
            matchData.homeTeam.score -= 1
            if !matchData.homeTeam.goalTimes.isEmpty {
                matchData.homeTeam.goalTimes.removeLast()
            }
            syncToiOS()
        }
    }

    func subtractAwayGoal() {
        if matchData.awayTeam.score > 0 {
            matchData.awayTeam.score -= 1
            if !matchData.awayTeam.goalTimes.isEmpty {
                matchData.awayTeam.goalTimes.removeLast()
            }
            syncToiOS()
        }
    }

    // MARK: - Timer Management
    func configureTimer(_ config: TimerConfig) {
        matchData.periodDuration = config.periodDuration
        matchData.extraTimeDuration = config.extraTimeDuration
        matchData.totalPeriods = config.totalPeriods
        updateDisplayTime()
    }

    func startTimer() {
        guard !isRunning else { return }

        if matchData.matchStatus == .notStarted {
            matchData.startDate = Date()
        }

        matchData.matchStatus = .inProgress
        isRunning = true

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    func pauseTimer() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        matchData.matchStatus = .paused
        syncToiOS()
    }

    func resetTimer() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        matchData.elapsedTime = 0
        matchData.currentPeriod = 1
        matchData.isExtraTime = false
        matchData.matchStatus = .notStarted
        updateDisplayTime()
        syncToiOS()
    }

    func nextPeriod() {
        if matchData.currentPeriod < matchData.totalPeriods {
            matchData.currentPeriod += 1
            matchData.elapsedTime = 0
            matchData.matchStatus = .halfTime
            updateDisplayTime()
            hapticFeedback()
            syncToiOS()
        } else if !matchData.isExtraTime {
            // Start extra time
            matchData.isExtraTime = true
            matchData.elapsedTime = 0
            updateDisplayTime()
            hapticFeedback()
            syncToiOS()
        }
    }

    func endMatch() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        matchData.matchStatus = .finished
        matchData.endDate = Date()
        hapticFeedback()
        syncToiOS()
    }

    /// Finaliza el partido y envía los datos al iPhone para guardarlo en el historial
    func finishMatch() {
        // Detener el timer
        timer?.invalidate()
        timer = nil
        isRunning = false
        matchData.matchStatus = .finished
        matchData.endDate = Date()

        // Preparar mensaje para el iPhone
        let matchResult: [String: Any] = [
            "date": Date(),
            "homeTeam": matchData.homeTeam.name,
            "awayTeam": matchData.awayTeam.name,
            "homeScore": matchData.homeTeam.score,
            "awayScore": matchData.awayTeam.score,
            "duration": displayTime
        ]

        // Enviar al iPhone
        WatchConnectivityManager.shared.sendFinishedMatch(matchResult)

        // Feedback háptico
        hapticFeedback()
    }

    // MARK: - Private Methods
    private func tick() {
        matchData.elapsedTime += 1

        let maxTime = matchData.isExtraTime ? matchData.extraTimeDuration : matchData.periodDuration

        if matchData.elapsedTime >= maxTime {
            pauseTimer()
            hapticFeedback()
        }

        updateDisplayTime()
    }

    private func updateDisplayTime() {
        let minutes = Int(matchData.elapsedTime) / 60
        let seconds = Int(matchData.elapsedTime) % 60
        displayTime = String(format: "%02d:%02d", minutes, seconds)
    }

    private func hapticFeedback() {
        WKInterfaceDevice.current().play(.notification)
    }

    private func syncToiOS() {
        WatchConnectivityManager.shared.sendMatchUpdate(matchData)
    }

    // MARK: - Heart Rate Integration
    func addHeartRateSample(_ bpm: Double) {
        let sample = HeartRateSample(bpm: bpm)
        matchData.heartRateSamples.append(sample)
    }

    // MARK: - New Match
    func startNewMatch() {
        matchData = MatchData()
        updateDisplayTime()
    }
}
