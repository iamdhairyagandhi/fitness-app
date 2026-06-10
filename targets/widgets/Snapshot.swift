import Foundation

/// Single source of truth shared between the BodyPilot app and the widget
/// extension. The React Native side serialises this struct to JSON and writes
/// it to the App Group UserDefaults under `Snapshot.storageKey`.
struct BodyPilotSnapshot: Codable {
    let schemaVersion: Int
    let signedIn: Bool
    let updatedAt: String
    let localDate: String

    let displayName: String?

    // Nutrition
    let caloriesConsumed: Int
    let caloriesTarget: Int
    let proteinG: Int
    let proteinTargetG: Int
    let waterMl: Int
    let waterGoalMl: Int

    // Gamification / workouts
    let streakCount: Int
    let level: Int
    let xp: Int
    let workoutsCompleted: Int
    let lastWorkoutDate: String?
    let lastWorkoutName: String?
    let activeWorkoutName: String?

    // Apple Health
    let steps: Int
    let activeEnergyKcal: Int
    let healthStatus: String
    let healthSyncedAt: String?

    static let placeholder = BodyPilotSnapshot(
        schemaVersion: 1,
        signedIn: true,
        updatedAt: "",
        localDate: ISO8601DateFormatter.localDateString(Date()),
        displayName: "Pilot",
        caloriesConsumed: 1240,
        caloriesTarget: 2200,
        proteinG: 95,
        proteinTargetG: 165,
        waterMl: 1500,
        waterGoalMl: 2800,
        streakCount: 12,
        level: 7,
        xp: 4200,
        workoutsCompleted: 48,
        lastWorkoutDate: nil,
        lastWorkoutName: "Push Day",
        activeWorkoutName: nil,
        steps: 8420,
        activeEnergyKcal: 410,
        healthStatus: "authorized",
        healthSyncedAt: nil
    )

    static let signedOut = BodyPilotSnapshot(
        schemaVersion: 1,
        signedIn: false,
        updatedAt: "",
        localDate: ISO8601DateFormatter.localDateString(Date()),
        displayName: nil,
        caloriesConsumed: 0,
        caloriesTarget: 2000,
        proteinG: 0,
        proteinTargetG: 150,
        waterMl: 0,
        waterGoalMl: 2500,
        streakCount: 0,
        level: 1,
        xp: 0,
        workoutsCompleted: 0,
        lastWorkoutDate: nil,
        lastWorkoutName: nil,
        activeWorkoutName: nil,
        steps: 0,
        activeEnergyKcal: 0,
        healthStatus: "unsupported",
        healthSyncedAt: nil
    )
}

enum SnapshotStore {
    static let appGroupID = "group.com.dhairyagandhi.fitfusion"
    static let storageKey = "bodypilot.widget.snapshot"

    /// Read the latest snapshot written by the host app. Falls back to the
    /// placeholder snapshot when nothing has been written yet (first install,
    /// signed-out state, or previews).
    static func load() -> BodyPilotSnapshot {
        guard
            let defaults = UserDefaults(suiteName: appGroupID),
            let raw = defaults.string(forKey: storageKey),
            let data = raw.data(using: .utf8)
        else {
            return .placeholder
        }

        do {
            return try JSONDecoder().decode(BodyPilotSnapshot.self, from: data)
        } catch {
            return .placeholder
        }
    }
}

extension ISO8601DateFormatter {
    static func localDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

/// Common helpers shared across all widgets.
enum WidgetFormat {
    static func percent(_ value: Int, of total: Int) -> Double {
        guard total > 0 else { return 0 }
        return min(1.0, max(0.0, Double(value) / Double(total)))
    }

    static func remaining(_ value: Int, of total: Int) -> Int {
        return max(0, total - value)
    }

    static func compactNumber(_ value: Int) -> String {
        if value >= 1000 {
            let thousands = Double(value) / 1000.0
            return String(format: "%.1fk", thousands)
        }
        return "\(value)"
    }

    /// Days since the given ISO date string, or nil if unparseable.
    static func daysAgo(_ iso: String?) -> Int? {
        guard let iso, let date = parseISO(iso) else { return nil }
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: date)
        let now = calendar.startOfDay(for: Date())
        return calendar.dateComponents([.day], from: start, to: now).day
    }

    private static func parseISO(_ value: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: value) { return date }
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: value) { return date }

        let plain = DateFormatter()
        plain.calendar = Calendar(identifier: .gregorian)
        plain.locale = Locale(identifier: "en_US_POSIX")
        plain.dateFormat = "yyyy-MM-dd"
        return plain.date(from: value)
    }
}

enum WidgetPalette {
    static let background = "#0F0F0F"
    static let surface = "#1A1A1A"
    static let primary = "#FF6B35"
    static let success = "#34D399"
    static let info = "#60A5FA"
    static let warning = "#FBBF24"
    static let text = "#FFFFFF"
    static let textSecondary = "#9CA3AF"
}
