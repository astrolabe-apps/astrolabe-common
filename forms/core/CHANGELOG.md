# Change Log - @astroapps/forms-core

This log was last generated on Fri, 04 Sep 2026 03:36:41 GMT and should not be manually modified.

## 2.3.0
Fri, 04 Sep 2026 03:36:41 GMT

### Minor changes

- withScripts now accepts dotted paths (e.g. "displayData.text") and builds the per-object-level $scripts nesting they imply, and merges with any existing scripts instead of replacing them. Previously a dotted key was taken literally, matched no schema field and was silently dropped, so scripts intended for a nested object never ran

## 2.2.0
Fri, 08 May 2026 00:59:16 GMT

### Minor changes

- Add createScriptedProxy, ScriptProvider, and defaultScriptProvider for scripted definition proxy support. 

### Patches

- Upgrade to jsonata 2.1.0 so that the null coalescing operator exists
- Support manual navigation
- Clear child nodes when parent datanode changes

