import SwiftUI
import WidgetKit

private struct WaterDots: View {
    let filled: Int
    let total: Int

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 4)

    var body: some View {
        let cap = min(max(total, 1), 12)
        let filledClamped = min(filled, cap)
        LazyVGrid(columns: columns, spacing: 6) {
            ForEach(0..<cap, id: \.self) { index in
                Image(systemName: index < filledClamped ? "drop.fill" : "drop")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(
                        index < filledClamped
                            ? Color(hex: WidgetPalette.info)
                            : Color.white.opacity(0.18)
                    )
            }
        }
    }
}

private struct HydrationSmallView: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        let servingMl = 250
        let total = max(1, snapshot.waterGoalMl / servingMl)
        let filled = max(0, snapshot.waterMl / servingMl)
        let percent = Int(WidgetFormat.percent(snapshot.waterMl, of: snapshot.waterGoalMl) * 100)

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Water")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                Spacer()
                Text("\(percent)%")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: WidgetPalette.info))
            }

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(snapshot.waterMl)")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundColor(Color(hex: WidgetPalette.text))
                Text("/ \(snapshot.waterGoalMl) ml")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
            }

            WaterDots(filled: filled, total: total)

            Spacer(minLength: 0)

            HStack(spacing: 4) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: WidgetPalette.info))
                Text("Tap to log")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
            }
        }
    }
}

private struct HydrationWidgetView: View {
    let entry: SnapshotEntry

    var body: some View {
        ZStack {
            Color(hex: WidgetPalette.background)
            content.padding(14)
        }
        .widgetURL(WidgetDeepLink.url(path: "/nutrition?action=logWater"))
    }

    @ViewBuilder
    private var content: some View {
        if !entry.snapshot.signedIn {
            SignedOutView(message: "Sign in to track water")
        } else {
            HydrationSmallView(snapshot: entry.snapshot)
        }
    }
}

struct HydrationWidget: Widget {
    static let kind = "HydrationWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: HydrationWidget.kind, provider: SnapshotProvider()) { entry in
            HydrationWidgetView(entry: entry)
                .containerBackgroundIfAvailable()
        }
        .configurationDisplayName("Hydration")
        .description("Track water intake at a glance. Tap to log a glass.")
        .supportedFamilies([.systemSmall])
    }
}
