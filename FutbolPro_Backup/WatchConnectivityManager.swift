import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    // MARK: - Singleton
    static let shared = WatchConnectivityManager()

    // MARK: - Published Properties
    @Published var isReachable: Bool = false
    @Published var lastSyncDate: Date?
    @Published var syncError: String?

    // MARK: - Private Properties
    private var session: WCSession?

    // MARK: - Initialization
    private override init() {
        super.init()
        setupSession()
    }

    // MARK: - Setup
    private func setupSession() {
        guard WCSession.isSupported() else {
            syncError = "Watch Connectivity not supported"
            return
        }

        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Send Methods
    func sendMatchUpdate(_ matchData: MatchData) {
        guard let session = session, session.activationState == .activated else {
            saveForLaterSync(matchData)
            return
        }

        let message = SyncMessage(
            type: .matchUpdate,
            matchData: matchData,
            timestamp: Date()
        )

        do {
            let data = try JSONEncoder().encode(message)
            let dictionary: [String: Any] = ["matchData": data]

            if session.isReachable {
                // Send immediately if iPhone is reachable
                session.sendMessage(dictionary, replyHandler: { [weak self] _ in
                    DispatchQueue.main.async {
                        self?.lastSyncDate = Date()
                    }
                }, errorHandler: { [weak self] error in
                    DispatchQueue.main.async {
                        self?.syncError = error.localizedDescription
                    }
                    self?.saveForLaterSync(matchData)
                })
            } else {
                // Use application context for background sync
                try session.updateApplicationContext(dictionary)
                DispatchQueue.main.async {
                    self.lastSyncDate = Date()
                }
            }
        } catch {
            syncError = "Encoding error: \(error.localizedDescription)"
            saveForLaterSync(matchData)
        }
    }

    func sendMatchComplete(_ matchData: MatchData) {
        guard let session = session, session.activationState == .activated else {
            saveCompletedMatch(matchData)
            return
        }

        let message = SyncMessage(
            type: .matchComplete,
            matchData: matchData,
            timestamp: Date()
        )

        do {
            let data = try JSONEncoder().encode(message)

            // Use transferUserInfo for guaranteed delivery of completed matches
            session.transferUserInfo(["completedMatch": data])

            DispatchQueue.main.async {
                self.lastSyncDate = Date()
            }
        } catch {
            syncError = "Encoding error: \(error.localizedDescription)"
            saveCompletedMatch(matchData)
        }
    }

    /// Envía el resultado final del partido al iPhone
    func sendFinishedMatch(_ matchResult: [String: Any]) {
        guard let session = session, session.activationState == .activated else {
            // Guardar localmente si no hay conexión
            saveFinishedMatchLocally(matchResult)
            return
        }

        if session.isReachable {
            // Enviar inmediatamente si el iPhone está disponible
            session.sendMessage(["finishedMatch": matchResult], replyHandler: { [weak self] _ in
                DispatchQueue.main.async {
                    self?.lastSyncDate = Date()
                }
            }, errorHandler: { [weak self] error in
                DispatchQueue.main.async {
                    self?.syncError = error.localizedDescription
                }
                self?.saveFinishedMatchLocally(matchResult)
            })
        } else {
            // Usar transferUserInfo para entrega garantizada
            session.transferUserInfo(["finishedMatch": matchResult])
            DispatchQueue.main.async {
                self.lastSyncDate = Date()
            }
        }
    }

    private func saveFinishedMatchLocally(_ matchResult: [String: Any]) {
        // Convertir a Data para guardar
        if let data = try? NSKeyedArchiver.archivedData(withRootObject: matchResult, requiringSecureCoding: false) {
            var pendingMatches = UserDefaults.standard.array(forKey: "pendingFinishedMatches") as? [Data] ?? []
            pendingMatches.append(data)
            UserDefaults.standard.set(pendingMatches, forKey: "pendingFinishedMatches")
        }
    }

    // MARK: - Local Storage for Offline Sync
    private func saveForLaterSync(_ matchData: MatchData) {
        do {
            let data = try JSONEncoder().encode(matchData)
            UserDefaults.standard.set(data, forKey: "pendingMatchSync")
        } catch {
            syncError = "Local save error: \(error.localizedDescription)"
        }
    }

    private func saveCompletedMatch(_ matchData: MatchData) {
        do {
            let data = try JSONEncoder().encode(matchData)
            var completedMatches = UserDefaults.standard.array(forKey: "completedMatches") as? [Data] ?? []
            completedMatches.append(data)
            UserDefaults.standard.set(completedMatches, forKey: "completedMatches")
        } catch {
            syncError = "Local save error: \(error.localizedDescription)"
        }
    }

    func syncPendingData() {
        // Sync pending match update
        if let pendingData = UserDefaults.standard.data(forKey: "pendingMatchSync"),
           let matchData = try? JSONDecoder().decode(MatchData.self, from: pendingData) {
            sendMatchUpdate(matchData)
            UserDefaults.standard.removeObject(forKey: "pendingMatchSync")
        }

        // Sync completed matches
        if let completedData = UserDefaults.standard.array(forKey: "completedMatches") as? [Data] {
            for data in completedData {
                if let matchData = try? JSONDecoder().decode(MatchData.self, from: data) {
                    sendMatchComplete(matchData)
                }
            }
            UserDefaults.standard.removeObject(forKey: "completedMatches")
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            if let error = error {
                self.syncError = error.localizedDescription
            }

            if activationState == .activated {
                self.syncPendingData()
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable

            if session.isReachable {
                self.syncPendingData()
            }
        }
    }

    // Required for iOS app companion (not needed for watchOS-only)
    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
    #endif

    // Receive messages from iOS app
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        // Handle incoming messages from iOS app
        // For example: team name updates, settings changes
        if let teamData = message["updateTeams"] as? Data,
           let teams = try? JSONDecoder().decode([String: String].self, from: teamData) {
            NotificationCenter.default.post(
                name: .teamsUpdatedFromiOS,
                object: nil,
                userInfo: teams
            )
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        // Handle application context updates from iOS
        if let settingsData = applicationContext["settings"] as? Data {
            // Process settings updates
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let teamsUpdatedFromiOS = Notification.Name("teamsUpdatedFromiOS")
}
