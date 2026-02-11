//
//  HealthKitManager.swift
//  FutbolPro
//
//  HealthKit integration for heart rate and calories
//

import Foundation
import HealthKit

class HealthKitManager: ObservableObject {
    private let healthStore = HKHealthStore()

    @Published var currentHeartRate: Double = 0
    @Published var caloriesBurned: Double = 0
    @Published var isAuthorized: Bool = false

    private var heartRateQuery: HKQuery?
    private var caloriesQuery: HKQuery?
    private var workoutStartDate: Date?

    /// Tipos de datos que necesitamos leer
    private let typesToRead: Set<HKObjectType> = [
        HKObjectType.quantityType(forIdentifier: .heartRate)!,
        HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    ]

    init() {
        checkAuthorization()
    }

    /// Verifica si HealthKit está disponible en el dispositivo
    func isHealthKitAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }

    /// Solicita permisos de HealthKit
    func requestAuthorization(completion: @escaping (Bool) -> Void) {
        guard isHealthKitAvailable() else {
            completion(false)
            return
        }

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.isAuthorized = success
                completion(success)
            }

            if let error = error {
                print("HealthKit authorization error: \(error.localizedDescription)")
            }
        }
    }

    /// Verifica el estado de autorización actual
    private func checkAuthorization() {
        guard isHealthKitAvailable() else { return }

        let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!
        let status = healthStore.authorizationStatus(for: heartRateType)

        DispatchQueue.main.async {
            self.isAuthorized = status == .sharingAuthorized
        }
    }

    /// Inicia el monitoreo de frecuencia cardíaca en tiempo real
    func startHeartRateMonitoring() {
        guard isAuthorized else { return }

        let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!

        let query = HKAnchoredObjectQuery(
            type: heartRateType,
            predicate: nil,
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] query, samples, deletedObjects, anchor, error in
            self?.processHeartRateSamples(samples)
        }

        query.updateHandler = { [weak self] query, samples, deletedObjects, anchor, error in
            self?.processHeartRateSamples(samples)
        }

        heartRateQuery = query
        healthStore.execute(query)
    }

    /// Procesa las muestras de frecuencia cardíaca
    private func processHeartRateSamples(_ samples: [HKSample]?) {
        guard let heartRateSamples = samples as? [HKQuantitySample] else { return }

        guard let latestSample = heartRateSamples.last else { return }

        let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
        let heartRate = latestSample.quantity.doubleValue(for: heartRateUnit)

        DispatchQueue.main.async {
            self.currentHeartRate = heartRate
        }
    }

    /// Detiene el monitoreo de frecuencia cardíaca
    func stopHeartRateMonitoring() {
        if let query = heartRateQuery {
            healthStore.stop(query)
            heartRateQuery = nil
        }
    }

    /// Inicia el seguimiento de calorías
    func startCaloriesTracking() {
        workoutStartDate = Date()
    }

    /// Calcula las calorías quemadas desde el inicio del partido
    func fetchCaloriesBurned() {
        guard isAuthorized, let startDate = workoutStartDate else { return }

        let caloriesType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: Date(),
            options: .strictStartDate
        )

        let query = HKStatisticsQuery(
            quantityType: caloriesType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { [weak self] query, statistics, error in
            guard let statistics = statistics,
                  let sum = statistics.sumQuantity() else {
                return
            }

            let calories = sum.doubleValue(for: HKUnit.kilocalorie())

            DispatchQueue.main.async {
                self?.caloriesBurned = calories
            }
        }

        healthStore.execute(query)
    }

    /// Detiene el seguimiento y devuelve el promedio de frecuencia cardíaca
    func stopTracking(completion: @escaping (Double?, Double?) -> Void) {
        guard isAuthorized, let startDate = workoutStartDate else {
            completion(nil, nil)
            return
        }

        stopHeartRateMonitoring()

        let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: Date(),
            options: .strictStartDate
        )

        let query = HKStatisticsQuery(
            quantityType: heartRateType,
            quantitySamplePredicate: predicate,
            options: .discreteAverage
        ) { [weak self] query, statistics, error in
            var avgHeartRate: Double? = nil

            if let statistics = statistics,
               let average = statistics.averageQuantity() {
                let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
                avgHeartRate = average.doubleValue(for: heartRateUnit)
            }

            let finalCalories = self?.caloriesBurned

            DispatchQueue.main.async {
                completion(avgHeartRate, finalCalories)
            }
        }

        healthStore.execute(query)
    }
}
