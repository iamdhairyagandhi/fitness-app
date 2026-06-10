import SwiftUI
import WidgetKit

private struct LockCircularStreak: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12, weight: .bold))
                Text("\(snapshot.streakCount)")
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.6)
            }
        }
        .widgetAccentable()
    }
}

private struct LockRectangularStreak: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12, weight: .bold))
                Text("\(snapshot.streakCount) day streak")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .widgetAccentable()
            }
            Text(secondaryLine)
                .font(.system(size: 11, weight: .medium))
                .lineLimit(1)
        }
    }

    private var secondaryLine: String {
        guard let days = WidgetFormat.daysAgo(snapshot.lastWorkoutDate), let name = snapshot.lastWorkoutName else {
            return "Lvl \(snapshot.level) · \(snapshot.workoutsCompleted) workouts"
        }
        if days == 0 { return "\(name) today" }
        if days == 1 { return "\(name) yesterday" }
        return "\(name) · \(days)d ago"
    }
}

private struct LockScreenStreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        Group {
            switch family {
            case .accessoryCircular:
                LockCircularStreak(snapshot: entry.snapshot)
            case .accessoryRectangular:
                LockRectangularStreak(snapshot: entry.snapshot)
            default:
                Text("\(entry.snapshot.streakCount)")
                    .font(.system(size: 14, weight: .bold))
            }
        }
        .widgetURL(WidgetDeepLink.url(path: "/achievements"))
    }
}

struct LockScreenStreakWidget: Widget {
    static let kind = "LockScreenStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: LockScreenStreakWidget.kind, provider: SnapshotProvider()) { entry in
            LockScreenStreakWidgetView(entry: entry)
                .containerBackgroundIfAvailable()
        }
        .configurationDisplayName("Streak (Lock Screen)")
        .description("Keep your fire visible on the Lock Screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular])
    }
}
