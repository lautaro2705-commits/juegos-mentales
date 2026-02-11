import Foundation
import WatchConnectivity

// MARK: - Match Record Model
struct MatchRecord: Codable, Identifiable {
    let id: UUID
    let date: Date
    let homeTeam: String
    let awayTeam: String
    let homeScore: Int
    let awayScore: Int
    let duration: String

    init(id: UUID = UUID(), date: Date, homeTeam: String, awayTeam: String, homeScore: Int, awayScore: Int, duration: String) {
        self.id = id
        self.date = date
        self.homeTeam = homeTeam
        self.awayTeam = awayTeam
        self.homeScore = homeScore
        self.awayScore = awayScore
        self.duration = duration
    }

    init?(from dictionary: [String: Any]) {
        guard let date = dictionary["date"] as? Date,
              let homeTeam = dictionary["homeTeam"] as? String,
              let awayTeam = dictionary["awayTeam"] as? String,
              let homeScore = dictionary["homeScore"] as? Int,
              let awayScore = dictionary["awayScore"] as? Int,
              let duration = dictionary["duration"] as? String else {
            return nil
        }

        self.id = UUID()
        self.date = date
        self.homeTeam = homeTeam
        self.awayTeam = awayTeam
        self.homeScore = homeScore
        self.awayScore = awayScore
        self.duration = duration
    }
}

// MARK: - Match History Manager
class MatchHistoryManager: NSObject, ObservableObject {
    // MARK: - Singleton
    static let shared = MatchHistoryManager()

    // MARK: - Published Properties
    @Published var matches: [MatchRecord] = []
    @Published var isWatchConnected: Bool = false
    @Published var lastSyncDate: Date?

    // MARK: - Private Properties
    private var session: WCSession?
    private let matchesKey = "savedMatches"

    // MARK: - Initialization
    override init() {
        super.init()
        loadMatches()
        setupWatchConnectivity()
    }

    // MARK: - Watch Connectivity Setup
    private func setupWatchConnectivity() {
        guard WCSession.isSupported() else { return }

        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Persistence
    private func loadMatches() {
        guard let data = UserDefaults.standard.data(forKey: matchesKey),
              let decoded = try? JSONDecoder().decode([MatchRecord].self, from: data) else {
            matches = []
            return
        }
        matches = decoded.sorted { $0.date > $1.date }
    }

    private func saveMatches() {
        guard let encoded = try? JSONEncoder().encode(matches) else { return }
        UserDefaults.standard.set(encoded, forKey: matchesKey)
    }

    // MARK: - Public Methods
    func addMatch(_ record: MatchRecord) {
        DispatchQueue.main.async {
            self.matches.insert(record, at: 0)
            self.saveMatches()
            self.lastSyncDate = Date()
        }
    }

    func deleteMatch(at offsets: IndexSet) {
        matches.remove(atOffsets: offsets)
        saveMatches()
    }

    func deleteMatch(_ record: MatchRecord) {
        matches.removeAll { $0.id == record.id }
        saveMatches()
    }

    func clearAllMatches() {
        matches.removeAll()
        saveMatches()
    }
}

// MARK: - WCSessionDelegate
extension MatchHistoryManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isWatchConnected = activationState == .activated
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isWatchConnected = false
        }
    }

    func sessionDidDeactivate(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isWatchConnected = false
        }
        // Reactivar la sesión
        session.activate()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isWatchConnected = session.isReachable
        }
    }

    // Recibir mensajes del Watch
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleIncomingMessage(message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        handleIncomingMessage(message)
        replyHandler(["status": "received"])
    }

    // Recibir transferUserInfo del Watch (entrega garantizada)
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handleIncomingMessage(userInfo)
    }

    // Procesar mensaje entrante
    private func handleIncomingMessage(_ message: [String: Any]) {
        if let matchData = message["finishedMatch"] as? [String: Any],
           let record = MatchRecord(from: matchData) {
            addMatch(record)
        }
    }
}
