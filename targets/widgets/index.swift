import SwiftUI
import WidgetKit

@main
struct BodyPilotWidgets: WidgetBundle {
    var body: some Widget {
        DailyMacrosWidget()
        ActivityWidget()
        StreakWidget()
        HydrationWidget()
        LockScreenStreakWidget()
    }
}
