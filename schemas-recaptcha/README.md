# @astroapps/schemas-recaptcha

Google reCAPTCHA v2 control for `@react-typed-forms/schemas`.

## Installation

```bash
npm install @astroapps/schemas-recaptcha
```

## Usage

```tsx
import { createRecaptchaRenderer, RecaptchaExtension } from "@astroapps/schemas-recaptcha";

// Add the extension to your form editor
const extensions = [RecaptchaExtension];

// Add the renderer to your form renderer
const renderer = createFormRenderer([
  createRecaptchaRenderer({
    sitekey: "your-site-key",
  }),
  // ... other renderers
]);
```

## Options

### Renderer Options

| Option           | Type | Description |
|------------------|------|-------------|
| `sitekey`        | `string` | Default site key (can be overridden per-field) |
| `theme`          | `"light" \| "dark"` | Widget theme (default: `"light"`) |
| `size`           | `"normal" \| "compact" \| "invisible"` | Widget size (default: `"normal"`) |
| `badge`          | `"bottomright" \| "bottomleft" \| "inline"` | Badge position for invisible reCAPTCHA |
| `containerClass` | `string` | CSS class for the container element |

### Field Options (in schema editor)

- **Site Key**: Override the default site key
- **Theme**: Light or Dark
- **Size**: Normal, Compact, or Invisible
- **Badge Position**: For invisible mode positioning
- **Challenge Type**: Image or Audio preference

## Test Keys

For development and testing, you can use Google's test keys:

| Key | Value |
|-----|-------|
| Site Key | `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI` |
| Secret Key | `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe` |

These keys will always pass verification and should only be used for testing.

## Server-side Verification

The control stores the verification token in the form control value. This token should be verified server-side using Google's siteverify API:

```bash
POST https://www.google.com/recaptcha/api/siteverify
  secret=your-secret-key
  response=token-from-client
```

See [Google's reCAPTCHA documentation](https://developers.google.com/recaptcha/docs/verify) for more details.
