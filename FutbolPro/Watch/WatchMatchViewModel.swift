//
//  WatchMatchViewModel.swift
//  FutbolPro Watch App
//
//  ViewModel for Watch app
//

import Foundation
import WatchConnectivity

class WatchMatchViewModel: ObservableObject {
    @Published var team1Name: String = "Equipo 1"
    @Published var team2Name: String = "Equipo 2"
    @Published var team1Score: Int = 0
    @Published var team2Score: Int = 0
    @Published var elapsedTime: TimeInterval = 0
    @Published var isTimerRunning: Bool = false

    private let connectivityManager = WatchConnectivityManager.shared

    init() {
        setupNotificationObservers()
    }

    var formattedTime: String {
        let minutes = Int(elapsedTime) / 60
        let seconds = Int(elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    // MARK: - Actions
    func addGoalTeam1() {
        team1Score += 1
        sendGoalNotification(team: 1)
    }

    func addGoalTeam2() {
        team2Score += 1
        sendGoalNotification(team: 2)
    }

    func toggleTimer() {
        isTimerRunning.toggle()
    }

    func sendToggleTimer() {
        sendTimerToggle()
    }

    // MARK: - Watch Connectivity
    private func sendGoalNotification(team: Int) {
        guard WCSession.default.isReachable else { return }

        let message: [String: Any] = [
            "type": team == 1 ? "goalTeam1" : "goalTeam2"
        ]

        WCSession.default.sendMessage(message, replyHandler: nil) { error in
            print("Error sending goal: \(error.localizedDescription)")
        }
    }

    private func sendTimerToggle() {
        guard WCSession.default.isReachable else { return }

        let message: [String: Any] = [
            "type": "toggleTimer"
        ]

        WCSession.default.sendMessage(message, replyHandler: nil) { error in
            print("Error toggling timer: \(error.localizedDescription)")
        }
    }

    // MARK: - Notification Observers
    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("matchStateUpdated"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let data = notification.userInfo else { return }

            self?.team1Name = data["team1Name"] as? String ?? "Equipo 1"
            self?.team2Name = data["team2Name"] as? String ?? "Equipo 2"
            self?.team1Score = data["team1Score"] as? Int ?? 0
            self?.team2Score = data["team2Score"] as? Int ?? 0
            self?.elapsedTime = data["elapsedTime"] as? TimeInterval ?? 0
            self?.isTimerRunning = data["isRunning"] as? Bool ?? false
        }
    }
}
