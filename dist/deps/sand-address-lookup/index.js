// Copyright Anysphere Inc.

const binding = require("./build/Release/sand_address_lookup.node");

module.exports = {
  suggest_addresses_async: binding.suggest_addresses_async,
  resolve_address_async: binding.resolve_address_async,
};
