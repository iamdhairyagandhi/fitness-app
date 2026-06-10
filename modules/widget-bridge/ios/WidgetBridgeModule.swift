import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WidgetBridgeModule")

        Function("setSnapshot") { (suite: String, key: String, jsonValue: String) -> Bool in
            guard let defaults = UserDefaults(suiteName: suite) else { return false }
            defaults.set(jsonValue, forKey: key)
            return true
        }

        Function("clearSnapshot") { (suite: String, key: String) -> Bool in
            guard let defaults = UserDefaults(suiteName: suite) else { return false }
            defaults.removeObject(forKey: key)
            return true
        }

        Function("reloadAll") {
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }

        Function("reloadKind") { (kind: String) in
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadTimelines(ofKind: kind)
            }
        }

        Function("isAvailable") { () -> Bool in
            return true
        }
    }
}
