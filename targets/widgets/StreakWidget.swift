import SwiftUI
import WidgetKit

private struct StreakSmallView: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Streak")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                Spacer()
                Text("Lvl \(snapshot.level)")
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule().fill(Color(hex: WidgetPalette.surface))
                    )
                    .foregroundColor(Color(hex: WidgetPalette.primary))
            }

            Spacer(minLength: 0)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(snapshot.streakCount)")
                    .font(.system(size: 48, weight: .heavy, design: .rounded))
                    .foregroundColor(Color(hex: WidgetPalette.primary))
                Text(snapshot.streakCount == 1 ? "day" : "days")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
            }

            Image(systemName: "flame.fill")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color(hex: WidgetPalette.primary))

            Spacer(minLength: 0)

            Text(footerLine)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                .lineLimit(1)
        }
    }

    private var footerLine: String {
        guard let days = WidgetFormat.daysAgo(snapshot.lastWorkoutDate) else {
            return "Log a workout to start"
        }
        if days == 0 { return "Lifted today" }
        if days == 1 { return "Last lift: yesterday" }
        return "Last lift: \(days)d ago"
    }
}

private struct StreakWidgetView: View {
    let entry: SnapshotEntry

    var body: some View {
        ZStack {
            Color(hex: WidgetPalette.background)
            content.padding(14)
        }
        .widgetURL(WidgetDeepLink.url(path: "/achievements"))
    }

    @ViewBuilder
    private var content: some View {
        if !entry.snapshot.signedIn {
            SignedOutView(message: "Sign in to track streaks")
        } else {
            StreakSmallView(snapshot: entry.snapshot)
        }
    }
}

struct StreakWidget: Widget {
    static let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: StreakWidget.kind, provider: SnapshotProvider()) { entry in
            StreakWidgetView(entry: entry)
                .containerBackgroundIfAvailable()
        }
        .configurationDisplayName("Workout Streak")
        .description("Your current streak, level, and last lift.")
        .supportedFamilies([.systemSmall])
    }
}
