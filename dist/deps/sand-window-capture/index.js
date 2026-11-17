// Copyright Anysphere Inc.

const binding = require("./build/Release/sand_window_capture.node");

module.exports = {
  screen_capture_access_sync: binding.screen_capture_access_sync,
  request_screen_capture_access_sync: binding.request_screen_capture_access_sync,
  list_windows_sync: binding.list_windows_sync,
  capture_window_async: binding.capture_window_async,
  capture_rect_async: binding.capture_rect_async,
};
