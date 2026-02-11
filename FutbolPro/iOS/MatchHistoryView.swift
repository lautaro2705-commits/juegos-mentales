//
//  MatchHistoryView.swift
//  FutbolPro
//
//  Displays saved match history
//

import SwiftUI

struct MatchHistoryView: View {
    @EnvironmentObject var viewModel: MatchViewModel
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                if viewModel.matchHistory.isEmpty {
                    EmptyHistoryView()
                } else {
                    List {
                        ForEach(viewModel.matchHistory) { match in
                            MatchHistoryRow(match: match)
                                .listRowBackground(Color.gray.opacity(0.2))
                        }
                        .onDelete(perform: viewModel.deleteMatch)
                    }
                    .listStyle(PlainListStyle())
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Historial")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cerrar") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.neonGreen)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct EmptyHistoryView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "tray")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("No hay partidos guardados")
                .font(.headline)
                .foregroundColor(.gray)
        }
    }
}

struct MatchHistoryRow: View {
    let match: Match
    @EnvironmentObject var viewModel: MatchViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Teams and Score
            HStack {
                Text(match.team1Name)
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                HStack(spacing: 10) {
                    Text("\(match.team1Score)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.neonGreen)

                    Text("-")
                        .foregroundColor(.gray)

                    Text("\(match.team2Score)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.neonGreen)
                }

                Spacer()

                Text(match.team2Name)
                    .font(.headline)
                    .foregroundColor(.white)
            }

            Divider()
                .background(Color.gray)

            // Match Details
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.gray)
                    Text("Duración: \(viewModel.formatTime(match.duration))")
                        .font(.subheadline)
                        .foregroundColor(.white)
                }

                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.gray)
                    Text(viewModel.formatDate(match.startDate))
                        .font(.subheadline)
                        .foregroundColor(.white)
                }

                if let avgHeartRate = match.averageHeartRate {
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundColor(.red)
                        Text("Promedio: \(String(format: "%.0f", avgHeartRate)) BPM")
                            .font(.subheadline)
                            .foregroundColor(.white)
                    }
                }

                if let calories = match.caloriesBurned {
                    HStack {
                        Image(systemName: "flame.fill")
                            .foregroundColor(.orange)
                        Text("Calorías: \(String(format: "%.0f", calories)) kcal")
                            .font(.subheadline)
                            .foregroundColor(.white)
                    }
                }
            }
        }
        .padding(.vertical, 8)
    }
}

struct MatchHistoryView_Previews: PreviewProvider {
    static var previews: some View {
        MatchHistoryView()
            .environmentObject(MatchViewModel(healthKitManager: HealthKitManager()))
            .preferredColorScheme(.dark)
    }
}
