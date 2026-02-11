//
//  MatchSetupView.swift
//  FutbolPro
//
//  Initial match configuration screen
//

import SwiftUI

struct MatchSetupView: View {
    @EnvironmentObject var viewModel: MatchViewModel
    @State private var selectedPeriodIndex = 1 // 45 min default

    let periods = MatchPeriod.allCases

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 30) {
                Spacer()

                // Logo/Title
                VStack(spacing: 10) {
                    Image(systemName: "sportscourt.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.neonGreen)

                    Text("Configurar Partido")
                        .font(.title2)
                        .foregroundColor(.white)
                }

                Spacer()

                // Team Names
                VStack(spacing: 25) {
                    TeamNameField(
                        teamName: $viewModel.team1Name,
                        placeholder: "Nombre Equipo 1"
                    )

                    Text("VS")
                        .font(.headline)
                        .foregroundColor(.gray)

                    TeamNameField(
                        teamName: $viewModel.team2Name,
                        placeholder: "Nombre Equipo 2"
                    )
                }
                .padding(.horizontal, 40)

                Spacer()

                // Period Selection
                VStack(spacing: 15) {
                    Text("Duración del Partido")
                        .font(.headline)
                        .foregroundColor(.gray)

                    Picker("Periodo", selection: $selectedPeriodIndex) {
                        ForEach(0..<periods.count, id: \.self) { index in
                            Text(periods[index].displayName)
                                .tag(index)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal, 40)
                    .onChange(of: selectedPeriodIndex) { newValue in
                        viewModel.selectedPeriod = periods[newValue]
                    }
                }

                Spacer()

                // Start Button
                Button(action: startMatch) {
                    HStack {
                        Image(systemName: "play.circle.fill")
                            .font(.title2)

                        Text("Iniciar Partido")
                            .font(.title3)
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.neonGreen)
                    .cornerRadius(15)
                    .padding(.horizontal, 40)
                }

                Spacer()
            }
        }
        .onAppear {
            viewModel.selectedPeriod = periods[selectedPeriodIndex]
        }
    }

    private func startMatch() {
        // Validar nombres
        if viewModel.team1Name.trimmingCharacters(in: .whitespaces).isEmpty {
            viewModel.team1Name = "Equipo 1"
        }
        if viewModel.team2Name.trimmingCharacters(in: .whitespaces).isEmpty {
            viewModel.team2Name = "Equipo 2"
        }

        viewModel.startMatch()
    }
}

struct TeamNameField: View {
    @Binding var teamName: String
    let placeholder: String

    var body: some View {
        TextField(placeholder, text: $teamName)
            .font(.title3)
            .foregroundColor(.white)
            .padding()
            .background(Color.gray.opacity(0.2))
            .cornerRadius(10)
            .multilineTextAlignment(.center)
    }
}

struct MatchSetupView_Previews: PreviewProvider {
    static var previews: some View {
        MatchSetupView()
            .environmentObject(MatchViewModel(healthKitManager: HealthKitManager()))
            .preferredColorScheme(.dark)
    }
}
