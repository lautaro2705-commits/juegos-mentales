//
//  Match.swift
//  FutbolPro
//
//  Data models for Match Management
//

import Foundation

/// Representa un partido de fútbol
struct Match: Identifiable, Codable {
    let id: UUID
    var team1Name: String
    var team2Name: String
    var team1Score: Int
    var team2Score: Int
    var duration: TimeInterval
    var startDate: Date
    var endDate: Date?
    var averageHeartRate: Double?
    var caloriesBurned: Double?

    init(
        id: UUID = UUID(),
        team1Name: String = "Equipo 1",
        team2Name: String = "Equipo 2",
        team1Score: Int = 0,
        team2Score: Int = 0,
        duration: TimeInterval = 0,
        startDate: Date = Date(),
        endDate: Date? = nil,
        averageHeartRate: Double? = nil,
        caloriesBurned: Double? = nil
    ) {
        self.id = id
        self.team1Name = team1Name
        self.team2Name = team2Name
        self.team1Score = team1Score
        self.team2Score = team2Score
        self.duration = duration
        self.startDate = startDate
        self.endDate = endDate
        self.averageHeartRate = averageHeartRate
        self.caloriesBurned = caloriesBurned
    }
}

/// Configuración del periodo de juego
enum MatchPeriod: Int, CaseIterable {
    case twenty = 20
    case fortyfive = 45
    case ninety = 90

    var minutes: Int {
        return self.rawValue
    }

    var displayName: String {
        return "\(rawValue) min"
    }
}
