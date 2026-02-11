//
//  WatchMatchView.swift
//  FutbolPro Watch App
//
//  Main watch interface for match control
//

import SwiftUI

struct WatchMatchView: View {
    @EnvironmentObject var viewModel: WatchMatchViewModel

    var body: some View {
        TabView {
            // Timer Tab
            TimerTabView()
                .tag(0)

            // Score Tab
            ScoreTabView()
                .tag(1)

            // Health Tab
            HealthTabView()
                .tag(2)
        }
        .tabViewStyle(.page)
    }
}

// MARK: - Timer Tab
struct TimerTabView: View {
    @EnvironmentObject var viewModel: WatchMatchViewModel

    var body: some View {
        VStack(spacing: 10) {
            // Timer Display
            Text(viewModel.formattedTime)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundColor(.green)
                .monospacedDigit()

            // Control Buttons
            HStack(spacing: 15) {
                Button(action: { viewModel.toggleTimer() }) {
                    Image(systemName: viewModel.isTimerRunning ? "pause.circle.fill" : "play.circle.fill")
                        .font(.title)
                        .foregroundColor(.green)
                }

                Button(action: { viewModel.sendToggleTimer() }) {
                    Image(systemName: "arrow.clockwise.circle.fill")
                        .font(.title2)
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

// MARK: - Score Tab
struct ScoreTabView: View {
    @EnvironmentObject var viewModel: WatchMatchViewModel

    var body: some View {
        VStack(spacing: 15) {
            // Team 1
            VStack(spacing: 8) {
                Text(viewModel.team1Name)
                    .font(.caption)
                    .foregroundColor(.gray)
                    .lineLimit(1)

                Text("\(viewModel.team1Score)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)

                Button(action: { viewModel.addGoalTeam1() }) {
                    Text("+1")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(width: 60, height: 30)
                        .background(Color.green)
                        .cornerRadius(8)
                }
            }

            Text("VS")
                .font(.caption2)
                .foregroundColor(.gray)

            // Team 2
            VStack(spacing: 8) {
                Text(viewModel.team2Name)
                    .font(.caption)
                    .foregroundColor(.gray)
                    .lineLimit(1)

                Text("\(viewModel.team2Score)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)

                Button(action: { viewModel.addGoalTeam2() }) {
                    Text("+1")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(width: 60, height: 30)
                        .background(Color.green)
                        .cornerRadius(8)
                }
            }
        }
    }
}

// MARK: - Health Tab
struct HealthTabView: View {
    @EnvironmentObject var healthKitManager: HealthKitManager

    var body: some View {
        VStack(spacing: 20) {
            // Heart Rate
            VStack(spacing: 5) {
                Image(systemName: "heart.fill")
                    .font(.title2)
                    .foregroundColor(.red)

                Text(String(format: "%.0f", healthKitManager.currentHeartRate))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)

                Text("BPM")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            // Calories
            VStack(spacing: 5) {
                Image(systemName: "flame.fill")
                    .font(.title3)
                    .foregroundColor(.orange)

                Text(String(format: "%.0f", healthKitManager.caloriesBurned))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)

                Text("kcal")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
}

struct WatchMatchView_Previews: PreviewProvider {
    static var previews: some View {
        WatchMatchView()
            .environmentObject(WatchMatchViewModel())
            .environmentObject(HealthKitManager())
    }
}
