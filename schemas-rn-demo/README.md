# Schemas RN Demo - Expo 53 App

A comprehensive demonstration app showcasing all the available controls and features of the `@react-typed-forms/schemas-rn` package built with Expo 53.

## Overview

This demo app features four main screens that demonstrate different aspects of the schemas-rn library:

### 📱 Screens

1. **Profile Tab** - User profile form with basic input controls
   - Text inputs (name, email, phone, bio, profile picture URL)
   - Date picker (date of birth) 
   - Numeric input (age)
   - Boolean toggle (account active)

2. **Settings Tab** - App settings with advanced controls
   - Dropdowns (notification frequency, theme, font size, language, timezone)
   - Radio buttons (theme selection, profile visibility)
   - Checkboxes (notification preferences, privacy settings)
   - Checkbox lists (data sharing options)
   - Accordions (collapsible privacy section)
   - Groups (organized settings sections)

3. **Catalog Tab** - Product catalog with arrays and complex objects
   - Array renderer with add/remove functionality
   - Nested forms within array items
   - Dynamic accordion items for products
   - Complex object validation

4. **Survey Tab** - Comprehensive feedback form
   - All control types combined
   - Form validation
   - Action buttons (submit/reset)
   - DateTime picker
   - Multi-step form structure

## 🛠 Controls Demonstrated

### Input Controls
- **Text Input** (`RNTextInputRenderer`) - Basic text, email, phone, URL, multiline
- **Numeric Input** (`ControlInput`) - Integers and floats
- **Date/Time Picker** (`RNDateTimePickerRenderer`) - Dates and timestamps
- **Boolean Toggle** (`RNCheckboxRenderer`) - On/off switches

### Selection Controls  
- **Dropdown/Select** (`RNSelectRenderer`) - Single selection from options
- **Radio Buttons** (`RNRadioItem`) - Single selection with visible options
- **Checkboxes** (`RNCheckButtons`) - Individual boolean flags
- **Checkbox Lists** (`CheckRenderer`) - Multiple selections from options

### Layout & Organization
- **Groups** (`DefaultGroupRenderer`) - Organize related fields
- **Accordions** (`DefaultAccordion`) - Collapsible sections
- **Arrays** (`DefaultArrayRenderer`) - Dynamic lists with add/remove
- **Scroll Lists** (`RNScrollListRenderer`) - Scrollable option lists

### Advanced Features
- **Icons** (`Icon`) - Vector icons from @expo/vector-icons
- **HTML Rendering** (`RNHtmlRenderer`) - Rich text display
- **Action Buttons** (`createButtonActionRenderer`) - Form actions
- **Validation** - Required fields and type checking
- **Real-time Updates** - Live form state display

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone and navigate to the demo directory:**
   ```bash
   cd schemas-rn-demo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on your preferred platform:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator  
   - Press `w` for web browser
   - Scan QR code with Expo Go app on your device

## 📁 Project Structure

```
schemas-rn-demo/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Profile screen
│   │   ├── settings.tsx       # Settings screen
│   │   ├── catalog.tsx        # Product catalog screen
│   │   ├── survey.tsx         # Survey form screen
│   │   └── _layout.tsx        # Tab navigation
│   └── _layout.tsx            # Root layout
├── assets/                    # App icons and splash screens
├── package.json              # Dependencies and scripts
├── app.json                  # Expo configuration
├── tailwind.config.js        # TailwindCSS configuration
├── metro.config.js           # Metro bundler config
├── babel.config.js           # Babel configuration
├── global.css               # Global styles
└── README.md                # This file
```

## 🎨 Styling

The app uses **NativeWind** (TailwindCSS for React Native) for styling:
- Responsive design principles
- Consistent color scheme (grays, blues)
- Modern card-based layouts
- Accessible contrast ratios
- Custom component styling via rendererOptions

## 🔧 Key Technologies

- **Expo 53** - Development platform
- **React Native 0.76.5** - Mobile framework  
- **@react-typed-forms/schemas-rn** - Form controls library
- **@react-typed-forms/core** - Form state management
- **React Navigation 7** - Tab navigation
- **NativeWind 4** - TailwindCSS for React Native
- **TypeScript 5.3** - Type safety
- **@rn-primitives** - Accessible UI primitives

## 📱 Testing

Run the app on different platforms to see how the schemas-rn controls adapt:

- **iOS**: Native iOS controls and styling
- **Android**: Material Design components  
- **Web**: Web-compatible fallbacks

## 🤝 Contributing

This is a demo app showcasing the schemas-rn library. For issues or feature requests related to the underlying library, please visit the [react-typed-forms repository](https://github.com/doolse/react-typed-forms).

## 📄 License

This demo app is provided as-is for demonstration purposes. See the individual package licenses for the underlying dependencies.