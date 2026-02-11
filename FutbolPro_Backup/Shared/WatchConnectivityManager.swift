//
//  WatchConnectivityManager.swift
//  FutbolPro
//
//  Manages communication between iPhone and Apple Watch
//

import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    @Published var isReachable: Bool = false

    private override init() {
        super.init()

        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    // MARK: - Send Data to Watch
    func sendMatchState(
        team1Name: String,
        team2Name: String,
        team1Score: Int,
        team2Score: Int,
        elapsedTime: TimeInterval,
        isRunning: Bool
    ) {
        guard WCSession.default.isReachable else {
            print("Watch is not reachable")
            return
        }

        let message: [String: Any] = [
            "type": "matchState",
            "team1Name": team1Name,
            "team2Name": team2Name,
            "team1Score": team1Score,
            "team2Score": team2Score,
            "elapsedTime": elapsedTime,
            "isRunning": isRunning
        ]

        WCSession.default.sendMessage(message, replyHandler: nil) { error in
            print("Error sending match state: \(error.localizedDescription)")
        }
    }

    func sendHeartRate(_ heartRate: Double) {
        guard WCSession.default.isReachable else { return }

        let message: [String: Any] = [
            "type": "heartRate",
            "value": heartRate
        ]

        WCSession.default.sendMessage(message, replyHandler: nil)
    }

    // MARK: - Receive Data from Watch
    private func handleMessage(_ message: [String: Any]) {
        guard let type = message["type"] as? String else { return }

        switch type {
        case "goalTeam1":
            NotificationCenter.default.post(name: .goalTeam1, object: nil)

        case "goalTeam2":
            NotificationCenter.default.post(name: .goalTeam2, object: nil)

        case "toggleTimer":
            NotificationCenter.default.post(name: .toggleTimer, object: nil)

        default:
            break
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityManager: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }

        if let error = error {
            print("WCSession activation error: \(error.localizedDescription)")
        }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("WCSession became inactive")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("WCSession deactivated")
        // Reactivate session for iOS
        WCSession.default.activate()
    }
    #endif

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.handleMessage(message)
        }
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        DispatchQueue.main.async {
            self.handleMessage(message)
            replyHandler(["status": "received"])
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let goalTeam1 = Notification.Name("goalTeam1")
    static let goalTeam2 = Notification.Name("goalTeam2")
    static let toggleTimer = Notification.Name("toggleTimer")
}
