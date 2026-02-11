//
//  WatchApp.swift
//  FutbolPro Watch App
//
//  Watch App Entry Point
//

import SwiftUI

@main
struct FutbolPro_Watch_App: App {
    @StateObject private var viewModel = WatchMatchViewModel()
    @StateObject private var healthKitManager = HealthKitManager()

    init() {
        // Initialize WatchConnectivity
        _ = WatchConnectivityManager.shared
    }

    var body: some Scene {
        WindowGroup {
            WatchMatchView()
                .environmentObject(viewModel)
                .environmentObject(healthKitManager)
        }
    }
}
