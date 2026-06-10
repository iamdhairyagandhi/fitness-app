/** @type {import("@bacons/apple-targets").Config} */
module.exports = {
    type: "widget",
    name: "BodyPilotWidgets",
    icon: "../../assets/icon.png",
    colors: {
        $accent: "#FF6B35",
        $widgetBackground: "#0F0F0F",
    },
    deploymentTarget: "16.4",
    entitlements: {
        "com.apple.security.application-groups": [
            "group.com.dhairyagandhi.fitfusion",
        ],
    },
};
