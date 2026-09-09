# Design: Server Clipboard Direction Control

## Problem

In a corporate deployment, data exfiltration via clipboard is a risk. Users connecting
to a server can copy text from the server's clipboard to their local machine.

## Goal

One-way clipboard: users can paste INTO servers (client→server), but cannot copy OUT
(server→client).

## Existing Feature

RustDesk already has `one-way-clipboard-redirection` as a builtin option.

`src/server/connection.rs:2247-2251`:

```rust
fn can_sub_clipboard_service(&self) -> bool {
    self.clipboard_enabled()
        && self.peer_keyboard_enabled()
        && crate::get_builtin_option(keys::OPTION_ONE_WAY_CLIPBOARD_REDIRECTION) != "Y"
}
```

When set to `"Y"`:
- Server does NOT subscribe to its local clipboard service
- Server never sends clipboard data to the client
- Inbound clipboard (client→server) is unaffected

## How to Enable

### Option A: RustDesk2.toml (no custom build)

Set on the server device:

```toml
[options]
one-way-clipboard-redirection = 'Y'
```

- Works with stock upstream builds
- User can modify if they have admin/file access
- Suitable for secured machines (no admin access)

### Option B: custom.txt hard setting (requires custom build)

Bake into `custom.txt` as a hard setting (user cannot override):

```json
{
  "one-way-clipboard-redirection": "Y"
}
```

Requires replacing the `custom.txt` signing key in the binary (see design-trusted-builds.md).

### Option C: Hardcode in source (requires custom build)

Set in `BUILTIN_SETTINGS` at compile time. User cannot override.

Requires building the desktop app from our fork.

## Recommendation

Start with **Option A** (RustDesk2.toml) for secured Mac servers. No custom build needed.

If enforcement on admin-access machines becomes a requirement, upgrade to Option B or C,
which depend on creating a custom build (see design-trusted-builds.md).

## Verification

Test by connecting to a server with the setting enabled:
1. Copy text on the server's desktop
2. Attempt to paste on the client → should NOT paste server's text
3. Copy text on the client, paste on the server → should work

## Related

- [design-config-enforcement.md](design-config-enforcement.md) — preventing users from modifying settings
- [design-trusted-builds.md](design-trusted-builds.md) — custom builds with enforced settings
