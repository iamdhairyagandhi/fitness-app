import SwiftUI
import WidgetKit

/// iOS 17 requires every widget to declare its container background via
/// `.containerBackground(...)`. On iOS 16 the system background is implicit
/// and the modifier is unavailable, so we provide a no-op fallback so the
/// same widget code compiles for both versions.
extension View {
    @ViewBuilder
    func containerBackgroundIfAvailable() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(Color(hex: WidgetPalette.background), for: .widget)
        } else {
            self
        }
    }
}

/// Lightweight placeholder rendered when the user has signed out of the
/// host app. Tapping the widget opens BodyPilot so the user can sign back
/// in.
struct SignedOutView: View {
    let message: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "lock.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(Color(hex: WidgetPalette.primary))
            Text("BodyPilot")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(hex: WidgetPalette.text))
            Text(message)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(hex: WidgetPalette.textSecondary))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
