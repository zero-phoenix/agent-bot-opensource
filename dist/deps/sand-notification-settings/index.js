// Copyright Anysphere Inc.

const binding = require("./build/Release/sand_notification_settings.node");

module.exports = {
  notification_settings_async: binding.notification_settings_async,
  managed_policy_value_sync: binding.managed_policy_value_sync,
  watch_scroll_finger_lift: binding.watch_scroll_finger_lift,
};
