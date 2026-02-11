//
//  ContentView.swift
//  FutbolPro
//
//  Main view coordinator
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var viewModel: MatchViewModel
    @State private var showingHistory = false

    var body: some View {
        NavigationView {
            Group {
                if viewModel.isMatchActive {
                    MatchDashboardView()
                } else {
                    MatchSetupView()
                }
            }
            .navigationTitle("FutbolPro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingHistory = true
                    } label: {
                        Image(systemName: "clock.arrow.circlepath")
                            .foregroundColor(.neonGreen)
                    }
                }
            }
            .sheet(isPresented: $showingHistory) {
                MatchHistoryView()
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(MatchViewModel(healthKitManager: HealthKitManager()))
            .environmentObject(HealthKitManager())
            .preferredColorScheme(.dark)
    }
}
