import Foundation
import HealthKit
import Combine

@MainActor
class HealthManager: ObservableObject {
    // MARK: - Published Properties
    @Published var currentHeartRate: Double = 0
    @Published var averageHeartRate: Double = 0
    @Published var maxHeartRate: Double = 0
    @Published var minHeartRate: Double = 0
    @Published var isMonitoring: Bool = false
    @Published var authorizationStatus: HKAuthorizationStatus = .notDetermined
    @Published var errorMessage: String?

    // MARK: - Private Properties
    private let healthStore = HKHealthStore()
    private var heartRateQuery: HKAnchoredObjectQuery?
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?
    private var heartRateSamples: [Double] = []

    // MARK: - HealthKit Types
    private let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    private let activeEnergyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!

    // MARK: - Callback for Match Manager
    nonisolated(unsafe) var onHeartRateUpdate: ((Double) -> Void)?

    // MARK: - Initialization
    init() {
        Task { @MainActor in
            self.checkAvailability()
        }
    }

    // MARK: - Public Methods
    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            errorMessage = "HealthKit not available on this device"
            return
        }

        let typesToRead: Set<HKObjectType> = [heartRateType, activeEnergyType]
        let typesToWrite: Set<HKSampleType> = [
            HKQuantityType.workoutType(),
            activeEnergyType
        ]

        do {
            try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)
            authorizationStatus = healthStore.authorizationStatus(for: heartRateType)
        } catch {
            errorMessage = "Authorization failed: \(error.localizedDescription)"
        }
    }

    func startMonitoring() async {
        guard !isMonitoring else { return }

        // Reset stats
        heartRateSamples = []
        currentHeartRate = 0
        averageHeartRate = 0
        maxHeartRate = 0
        minHeartRate = 0

        await startWorkoutSession()
        startHeartRateQuery()
        isMonitoring = true
    }

    func stopMonitoring() async {
        isMonitoring = false
        stopHeartRateQuery()
        await endWorkoutSession()
    }

    // MARK: - Private Methods
    private func checkAvailability() {
        guard HKHealthStore.isHealthDataAvailable() else {
            errorMessage = "HealthKit not available"
            return
        }
        authorizationStatus = healthStore.authorizationStatus(for: heartRateType)
    }

    private func startWorkoutSession() async {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .soccer
        configuration.locationType = .outdoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()

            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            workoutSession?.startActivity(with: Date())
            try await workoutBuilder?.beginCollection(at: Date())
        } catch {
            errorMessage = "Failed to start workout: \(error.localizedDescription)"
        }
    }

    private func endWorkoutSession() async {
        workoutSession?.end()

        do {
            try await workoutBuilder?.endCollection(at: Date())
            try await workoutBuilder?.finishWorkout()
        } catch {
            errorMessage = "Failed to end workout: \(error.localizedDescription)"
        }

        workoutSession = nil
        workoutBuilder = nil
    }

    private func startHeartRateQuery() {
        let predicate = HKQuery.predicateForSamples(
            withStart: Date(),
            end: nil,
            options: .strictStartDate
        )

        heartRateQuery = HKAnchoredObjectQuery(
            type: heartRateType,
            predicate: predicate,
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in
            Task { @MainActor in
                self?.processHeartRateSamples(samples)
            }
        }

        heartRateQuery?.updateHandler = { [weak self] _, samples, _, _, _ in
            Task { @MainActor in
                self?.processHeartRateSamples(samples)
            }
        }

        if let query = heartRateQuery {
            healthStore.execute(query)
        }
    }

    private func stopHeartRateQuery() {
        if let query = heartRateQuery {
            healthStore.stop(query)
            heartRateQuery = nil
        }
    }

    private func processHeartRateSamples(_ samples: [HKSample]?) {
        guard let quantitySamples = samples as? [HKQuantitySample] else { return }

        for sample in quantitySamples {
            let heartRateUnit = HKUnit.count().unitDivided(by: .minute())
            let value = sample.quantity.doubleValue(for: heartRateUnit)

            self.heartRateSamples.append(value)
            self.currentHeartRate = value

            // Update statistics
            self.updateStatistics()

            // Notify callback
            self.onHeartRateUpdate?(value)
        }
    }

    private func updateStatistics() {
        guard !heartRateSamples.isEmpty else { return }

        averageHeartRate = heartRateSamples.reduce(0, +) / Double(heartRateSamples.count)
        maxHeartRate = heartRateSamples.max() ?? 0
        minHeartRate = heartRateSamples.min() ?? 0
    }

    // MARK: - Heart Rate Zone
    func getHeartRateZone() -> HeartRateZone {
        switch currentHeartRate {
        case 0..<100:
            return .rest
        case 100..<130:
            return .warmUp
        case 130..<160:
            return .fatBurn
        case 160..<180:
            return .cardio
        default:
            return .peak
        }
    }
}

// MARK: - Heart Rate Zone Enum
enum HeartRateZone: String {
    case rest = "Rest"
    case warmUp = "Warm Up"
    case fatBurn = "Fat Burn"
    case cardio = "Cardio"
    case peak = "Peak"

    var color: String {
        switch self {
        case .rest: return "gray"
        case .warmUp: return "blue"
        case .fatBurn: return "green"
        case .cardio: return "orange"
        case .peak: return "red"
        }
    }
}
