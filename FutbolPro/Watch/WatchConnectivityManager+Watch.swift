//
//  WatchConnectivityManager+Watch.swift
//  FutbolPro Watch App
//
//  Watch-specific connectivity handling
//

import Foundation
import WatchConnectivity

extension WatchConnectivityManager {
    // MARK: - Watch-specific message handling
    func handleWatchMessage(_ message: [String: Any]) {
        guard let type = message["type"] as? String else { return }

        switch type {
        case "matchState":
            let data: [String: Any] = [
                "team1Name": message["team1Name"] as? String ?? "Equipo 1",
                "team2Name": message["team2Name"] as? String ?? "Equipo 2",
                "team1Score": message["team1Score"] as? Int ?? 0,
                "team2Score": message["team2Score"] as? Int ?? 0,
                "elapsedTime": message["elapsedTime"] as? TimeInterval ?? 0,
                "isRunning": message["isRunning"] as? Bool ?? false
            ]

            NotificationCenter.default.post(
                name: NSNotification.Name("matchStateUpdated"),
                object: nil,
                userInfo: data
            )

        case "heartRate":
            if let value = message["value"] as? Double {
                NotificationCenter.default.post(
                    name: NSNotification.Name("heartRateUpdated"),
                    object: nil,
                    userInfo: ["value": value]
                )
            }

        default:
            break
        }
    }
}
