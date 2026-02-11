import Foundation

// MARK: - Match Data Model (Syncable with iOS)
struct MatchData: Codable, Identifiable {
    let id: UUID
    var homeTeam: TeamData
    var awayTeam: TeamData
    var currentPeriod: Int
    var totalPeriods: Int
    var periodDuration: TimeInterval // in seconds
    var extraTimeDuration: TimeInterval
    var elapsedTime: TimeInterval
    var isExtraTime: Bool
    var matchStatus: MatchStatus
    var heartRateSamples: [HeartRateSample]
    var startDate: Date?
    var endDate: Date?

    init(
        id: UUID = UUID(),
        homeTeam: TeamData = TeamData(name: "Team One"),
        awayTeam: TeamData = TeamData(name: "Team Two"),
        currentPeriod: Int = 1,
        totalPeriods: Int = 2,
        periodDuration: TimeInterval = 45 * 60,
        extraTimeDuration: TimeInterval = 15 * 60,
        elapsedTime: TimeInterval = 0,
        isExtraTime: Bool = false,
        matchStatus: MatchStatus = .notStarted,
        heartRateSamples: [HeartRateSample] = [],
        startDate: Date? = nil,
        endDate: Date? = nil
    ) {
        self.id = id
        self.homeTeam = homeTeam
        self.awayTeam = awayTeam
        self.currentPeriod = currentPeriod
        self.totalPeriods = totalPeriods
        self.periodDuration = periodDuration
        self.extraTimeDuration = extraTimeDuration
        self.elapsedTime = elapsedTime
        self.isExtraTime = isExtraTime
        self.matchStatus = matchStatus
        self.heartRateSamples = heartRateSamples
        self.startDate = startDate
        self.endDate = endDate
    }
}

struct TeamData: Codable {
    var name: String
    var score: Int
    var goalTimes: [TimeInterval]

    init(name: String, score: Int = 0, goalTimes: [TimeInterval] = []) {
        self.name = name
        self.score = score
        self.goalTimes = goalTimes
    }
}

struct HeartRateSample: Codable, Identifiable {
    let id: UUID
    let timestamp: Date
    let bpm: Double

    init(id: UUID = UUID(), timestamp: Date = Date(), bpm: Double) {
        self.id = id
        self.timestamp = timestamp
        self.bpm = bpm
    }
}

enum MatchStatus: String, Codable {
    case notStarted
    case inProgress
    case paused
    case halfTime
    case finished
}

// MARK: - Timer Configuration
struct TimerConfig {
    var periodDuration: TimeInterval
    var extraTimeDuration: TimeInterval
    var totalPeriods: Int

    static let standard = TimerConfig(
        periodDuration: 45 * 60,
        extraTimeDuration: 15 * 60,
        totalPeriods: 2
    )

    static let fiveASide = TimerConfig(
        periodDuration: 20 * 60,
        extraTimeDuration: 5 * 60,
        totalPeriods: 2
    )

    static let youth = TimerConfig(
        periodDuration: 25 * 60,
        extraTimeDuration: 5 * 60,
        totalPeriods: 2
    )
}

// MARK: - Sync Message Types
enum SyncMessageType: String, Codable {
    case matchUpdate
    case matchComplete
    case heartRateUpdate
}

struct SyncMessage: Codable {
    let type: SyncMessageType
    let matchData: MatchData
    let timestamp: Date
}
