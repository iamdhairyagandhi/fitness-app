import SwiftUI
import WidgetKit

private struct ProgressBar: View {
    let progress: Double
    let color: Color

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.white.opacity(0.12))
                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: max(4, geo.size.width * progress))
            }
        }
        .frame(height: 6)
    }
}

private struct CalorieRing: View {
    let progress: Double
    let remaining: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.12), lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    Color(hex: WidgetPalette.primary),
                    style: StrokeStyle(lineWidth: 8, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(remaining)")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundColor(Color(hex: WidgetPalette.text))
                Text("kcal left")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
            }
        }
    }
}

private struct DailyMacrosSmallView: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        let calorieProgress = WidgetFormat.percent(snapshot.caloriesConsumed, of: snapshot.caloriesTarget)
        let calorieRemaining = WidgetFormat.remaining(snapshot.caloriesConsumed, of: snapshot.caloriesTarget)
        let proteinProgress = WidgetFormat.percent(snapshot.proteinG, of: snapshot.proteinTargetG)

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Today")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                Spacer()
                Image(systemName: "flame.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: WidgetPalette.primary))
            }

            CalorieRing(progress: calorieProgress, remaining: calorieRemaining)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text("Protein")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                    Spacer()
                    Text("\(snapshot.proteinG)/\(snapshot.proteinTargetG)g")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(hex: WidgetPalette.text))
                }
                ProgressBar(progress: proteinProgress, color: Color(hex: WidgetPalette.info))
            }
        }
    }
}

private struct DailyMacrosMediumView: View {
    let snapshot: BodyPilotSnapshot

    var body: some View {
        let calorieProgress = WidgetFormat.percent(snapshot.caloriesConsumed, of: snapshot.caloriesTarget)
        let calorieRemaining = WidgetFormat.remaining(snapshot.caloriesConsumed, of: snapshot.caloriesTarget)
        let proteinProgress = WidgetFormat.percent(snapshot.proteinG, of: snapshot.proteinTargetG)
        let waterProgress = WidgetFormat.percent(snapshot.waterMl, of: snapshot.waterGoalMl)
        let waterGlasses = max(0, snapshot.waterMl / 250)
        let waterTargetGlasses = max(1, snapshot.waterGoalMl / 250)

        HStack(spacing: 16) {
            CalorieRing(progress: calorieProgress, remaining: calorieRemaining)
                .frame(width: 90, height: 90)

            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Daily Plan")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(hex: WidgetPalette.text))
                    Spacer()
                    Text("\(snapshot.caloriesConsumed)/\(snapshot.caloriesTarget)")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text("Protein")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                        Spacer()
                        Text("\(snapshot.proteinG) / \(snapshot.proteinTargetG) g")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: WidgetPalette.text))
                    }
                    ProgressBar(progress: proteinProgress, color: Color(hex: WidgetPalette.info))
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Label("Water", systemImage: "drop.fill")
                            .labelStyle(.titleAndIcon)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                        Spacer()
                        Text("\(waterGlasses) / \(waterTargetGlasses)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: WidgetPalette.text))
                    }
                    ProgressBar(progress: waterProgress, color: Color(hex: WidgetPalette.success))
                }
            }
        }
    }
}

private struct DailyMacrosWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        ZStack {
            Color(hex: WidgetPalette.background)
            content
                .padding(14)
        }
        .widgetURL(WidgetDeepLink.url(path: "/nutrition"))
    }

    @ViewBuilder
    private var content: some View {
        if !entry.snapshot.signedIn {
            SignedOutView(message: "Sign in to track meals")
        } else {
            switch family {
            case .systemMedium:
                DailyMacrosMediumView(snapshot: entry.snapshot)
            default:
                DailyMacrosSmallView(snapshot: entry.snapshot)
            }
        }
    }
}

struct DailyMacrosWidget: Widget {
    static let kind = "DailyMacrosWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: DailyMacrosWidget.kind, provider: SnapshotProvider()) { entry in
            DailyMacrosWidgetView(entry: entry)
                .containerBackgroundIfAvailable()
        }
        .configurationDisplayName("Daily Macros")
        .description("Calories remaining and protein progress for today.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
