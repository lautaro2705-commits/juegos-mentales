import SwiftUI
import WatchKit

@main
struct FutbolProApp: App {
    // MARK: - App Delegate
    @WKApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// MARK: - App Delegate
class AppDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        // Initialize Watch Connectivity
        _ = WatchConnectivityManager.shared

        // Request notification permissions for match events
        requestNotificationPermissions()
    }

    func applicationDidBecomeActive() {
        // Sync any pending data when app becomes active
        WatchConnectivityManager.shared.syncPendingData()
    }

    func applicationWillResignActive() {
        // Save current state
    }

    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - Extended Runtime Session (for background heart rate monitoring)
class ExtendedRuntimeManager: NSObject, ObservableObject {
    static let shared = ExtendedRuntimeManager()

    private var session: WKExtendedRuntimeSession?

    func startSession() {
        guard session == nil else { return }

        session = WKExtendedRuntimeSession()
        session?.delegate = self
        session?.start()
    }

    func endSession() {
        session?.invalidate()
        session = nil
    }
}

extension ExtendedRuntimeManager: WKExtendedRuntimeSessionDelegate {
    func extendedRuntimeSession(_ extendedRuntimeSession: WKExtendedRuntimeSession, didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason, error: Error?) {
        session = nil
        if let error = error {
            print("Extended runtime session ended with error: \(error.localizedDescription)")
        }
    }

    func extendedRuntimeSessionDidStart(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
        print("Extended runtime session started")
    }

    func extendedRuntimeSessionWillExpire(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
        print("Extended runtime session will expire")
    }
}
