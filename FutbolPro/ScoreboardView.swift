import SwiftUI

struct ScoreboardView: View {
    @EnvironmentObject var matchManager: MatchManager
    @State private var showingEditSheet = false
    @State private var editingHome = true

    var body: some View {
        VStack(spacing: 8) {
            // Timer Display
            Text(matchManager.displayTime)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundColor(.green)

            // Period indicator
            periodIndicator

            // Score Display
            HStack(spacing: 4) {
                // Home Team
                teamScoreView(
                    team: matchManager.matchData.homeTeam,
                    isHome: true
                )

                Text("-")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)

                // Away Team
                teamScoreView(
                    team: matchManager.matchData.awayTeam,
                    isHome: false
                )
            }

            // Goal Buttons
            HStack(spacing: 16) {
                // Home Goal Button
                Button(action: {
                    matchManager.addHomeGoal()
                }) {
                    VStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 36))
                        Text("GOL")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .foregroundColor(.green)
                }
                .buttonStyle(.plain)

                // Away Goal Button
                Button(action: {
                    matchManager.addAwayGoal()
                }) {
                    VStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 36))
                        Text("GOL")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .foregroundColor(.blue)
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 4)
        }
        .sheet(isPresented: $showingEditSheet) {
            EditTeamView(
                isHome: editingHome,
                matchManager: matchManager
            )
        }
    }

    // MARK: - Subviews
    private var periodIndicator: some View {
        HStack(spacing: 4) {
            if matchManager.matchData.isExtraTime {
                Text("ET")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.orange)
            } else {
                Text("P\(matchManager.matchData.currentPeriod)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
            }

            if matchManager.isRunning {
                Circle()
                    .fill(Color.red)
                    .frame(width: 6, height: 6)
            }
        }
    }

    private func teamScoreView(team: TeamData, isHome: Bool) -> some View {
        VStack(spacing: 2) {
            // Team Name (tappable to edit)
            Button(action: {
                editingHome = isHome
                showingEditSheet = true
            }) {
                Text(team.name)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(isHome ? .green : .blue)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .buttonStyle(.plain)

            // Score
            Text("\(team.score)")
                .font(.system(size: 40, weight: .bold))
                .foregroundColor(.white)

            // Subtract button (small)
            Button(action: {
                if isHome {
                    matchManager.subtractHomeGoal()
                } else {
                    matchManager.subtractAwayGoal()
                }
            }) {
                Image(systemName: "minus.circle")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Edit Team Sheet
struct EditTeamView: View {
    let isHome: Bool
    @ObservedObject var matchManager: MatchManager
    @Environment(\.dismiss) var dismiss
    @State private var teamName: String = ""

    var body: some View {
        VStack(spacing: 12) {
            Text(isHome ? "Local" : "Visitante")
                .font(.headline)

            TextField("Nombre", text: $teamName)
                .textFieldStyle(.plain)
                .padding(8)
                .background(Color.gray.opacity(0.2))
                .cornerRadius(8)

            HStack {
                Button("Cancelar") {
                    dismiss()
                }
                .foregroundColor(.red)

                Spacer()

                Button("Guardar") {
                    if isHome {
                        matchManager.updateHomeTeamName(teamName)
                    } else {
                        matchManager.updateAwayTeamName(teamName)
                    }
                    dismiss()
                }
                .foregroundColor(.green)
            }
        }
        .padding()
        .onAppear {
            teamName = isHome ? matchManager.matchData.homeTeam.name : matchManager.matchData.awayTeam.name
        }
    }
}

#Preview {
    ScoreboardView()
        .environmentObject(MatchManager())
}
