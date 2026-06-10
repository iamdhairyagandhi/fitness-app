import SwiftUI
import WidgetKit

private struct ActivityStat: View {
    let icon: String
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(color)
                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
            }
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundColor(Color(hex: WidgetPalette.text))
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
    }
}

private struct ActivitySmallView: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Activity")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                Spacer()
                Image(systemName: "figure.walk")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: WidgetPalette.success))
            }

            ActivityStat(
                icon: "shoeprints.fill",
                label: "Steps",
                value: WidgetFormat.compactNumber(snapshot.steps),
                color: Color(hex: WidgetPalette.success)
            )

            ActivityStat(
                icon: "flame.fill",
                label: "Active",
                value: "\(snapshot.activeEnergyKcal) kcal",
                color: Color(hex: WidgetPalette.primary)
            )

            Spacer(minLength: 0)

            if snapshot.healthStatus != "authorized" {
                Text("Connect Apple Health")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Color(hex: WidgetPalette.warning))
            }
        }
    }
}

private struct ActivityMediumView: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's Activity")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(hex: WidgetPalette.text))
                Spacer()
                if snapshot.healthStatus == "authorized" {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: WidgetPalette.primary))
                } else {
                    Text("Health off")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(Color(hex: WidgetPalette.warning))
                }
            }

            HStack(spacing: 18) {
                ActivityStat(
                    icon: "shoeprints.fill",
                    label: "Steps",
                    value: WidgetFormat.compactNumber(snapshot.steps),
                    color: Color(hex: WidgetPalette.success)
                )
                ActivityStat(
                    icon: "flame.fill",
                    label: "Active",
                    value: "\(snapshot.activeEnergyKcal) kcal",
                    color: Color(hex: WidgetPalette.primary)
                )
                ActivityStat(
                    icon: "bolt.fill",
                    label: "Streak",
                    value: "\(snapshot.streakCount)d",
                    color: Color(hex: WidgetPalette.warning)
                )
            }

            Spacer(minLength: 0)

            HStack {
                Image(systemName: snapshot.activeWorkoutName != nil ? "play.fill" : "barbell")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: WidgetPalette.primary))
                Text(workoutLine)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.text))
                    .lineLimit(1)
                Spacer()
            }
            .padding(8)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: WidgetPalette.surface))
            )
        }
    }

    private var workoutLine: String {
        if let active = snapshot.activeWorkoutName {
            return "In progress · \(active)"
        }
        if let last = snapshot.lastWorkoutName, let days = WidgetFormat.daysAgo(snapshot.lastWorkoutDate) {
            if days == 0 { return "\(last) · today" }
            if days == 1 { return "\(last) · yesterday" }
            return "\(last) · \(days)d ago"
        }
        return "No workouts logged yet"
    }
}

private struct ActivityWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        ZStack {
            Color(hex: WidgetPalette.background)
            content.padding(14)
        }
        .widgetURL(WidgetDeepLink.url(path: "/"))
    }

    @ViewBuilder
    private var content: some View {
        if !entry.snapshot.signedIn {
            SignedOutView(message: "Sign in to see activity")
        } else {
            switch family {
            case .systemMedium:
                ActivityMediumView(snapshot: entry.snapshot)
            default:
                ActivitySmallView(snapshot: entry.snapshot)
            }
        }
    }
}

struct ActivityWidget: Widget {
    static let kind = "ActivityWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: ActivityWidget.kind, provider: SnapshotProvider()) { entry in
            ActivityWidgetView(entry: entry)
                .containerBackgroundIfAvailable()
        }
        .configurationDisplayName("Activity")
        .description("Steps, active calories, and your latest workout.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
