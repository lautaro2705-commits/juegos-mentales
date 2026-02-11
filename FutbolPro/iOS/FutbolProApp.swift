//
//  FutbolProApp.swift
//  FutbolPro
//
//  Main App Entry Point
//

import SwiftUI

@main
struct FutbolProApp: App {
    @StateObject private var healthKitManager = HealthKitManager()
    @StateObject private var viewModel: MatchViewModel

    init() {
        let healthKit = HealthKitManager()
        _healthKitManager = StateObject(wrappedValue: healthKit)
        _viewModel = StateObject(wrappedValue: MatchViewModel(healthKitManager: healthKit))

        // Initialize WatchConnectivity
        _ = WatchConnectivityManager.shared
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
                .environmentObject(healthKitManager)
                .preferredColorScheme(.dark)
                .onAppear {
                    requestHealthKitPermissions()
                }
        }
    }

    private func requestHealthKitPermissions() {
        healthKitManager.requestAuthorization { success in
            if success {
                print("HealthKit authorized successfully")
            } else {
                print("HealthKit authorization failed")
            }
        }
    }
}
