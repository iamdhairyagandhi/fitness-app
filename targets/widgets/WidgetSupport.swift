import SwiftUI
import WidgetKit

extension Color {
    /// Create a Color from a `#RRGGBB` or `#RRGGBBAA` hex string. Falls back
    /// to opaque black on parse failure so widget rendering never crashes.
    init(hex: String) {
        var trimmed = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("#") { trimmed.removeFirst() }

        var rgba: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&rgba)

        let r, g, b, a: Double
        switch trimmed.count {
        case 6:
            r = Double((rgba >> 16) & 0xFF) / 255.0
            g = Double((rgba >> 8) & 0xFF) / 255.0
            b = Double(rgba & 0xFF) / 255.0
            a = 1.0
        case 8:
            r = Double((rgba >> 24) & 0xFF) / 255.0
            g = Double((rgba >> 16) & 0xFF) / 255.0
            b = Double((rgba >> 8) & 0xFF) / 255.0
            a = Double(rgba & 0xFF) / 255.0
        default:
            r = 0; g = 0; b = 0; a = 1
        }
        self = Color(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

/// Generic timeline entry that wraps the latest `BodyPilotSnapshot` along
/// with the time at which it was scheduled for display.
struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: BodyPilotSnapshot
}

/// Shared provider for every widget kind. WidgetKit asks for a placeholder
/// during gallery rendering, a quick snapshot for transitions, and a full
/// timeline for scheduled refreshes. We surface the same App Group snapshot
/// in each path and ask the system to refresh every 30 minutes; the host
/// app pushes immediate reloads via `WidgetCenter` when data actually
/// changes.
struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        let snapshot = context.isPreview ? BodyPilotSnapshot.placeholder : SnapshotStore.load()
        completion(SnapshotEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let snapshot = SnapshotStore.load()
        let now = Date()
        let entry = SnapshotEntry(date: now, snapshot: snapshot)
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

/// Helper to build a deep link URL that matches Expo Router's scheme.
enum WidgetDeepLink {
    static let scheme = "bodypilot"

    static func url(path: String) -> URL {
        let normalized = path.hasPrefix("/") ? path : "/\(path)"
        return URL(string: "\(scheme)://\(normalized)") ?? URL(string: "\(scheme)://")!
    }
}
