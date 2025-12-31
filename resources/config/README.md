# Personality Profile Configuration

This folder contains default personality profiles that are bundled with the application.

## How it Works

### Bundled Profiles (Read-Only)

This folder contains:

- **10 default personality profiles** - pre-made personalities for different play styles
- **generic.json** - fallback profile used when no specific match is found

These are bundled with the app and cannot be edited. They're always available.

### User Custom Profiles (Writable)

Users can create their OWN custom profiles in:

- **Windows:** `%APPDATA%/aurora4x-advisor/config/personality-profiles/`
- **macOS:** `~/Library/Application Support/aurora4x-advisor/config/personality-profiles/`
- **Linux:** `~/.config/aurora4x-advisor/config/personality-profiles/`

User profiles can be:

- **New additions** - Create profiles with unique IDs
- **Overrides** - Copy a bundled profile, keep the same ID, and customize it!

**User profiles always take priority** - if a user profile has the same ID as a bundled one, the user's version is used.

### Total Available Profiles

- **10 bundled profiles** (or fewer if user overrides some)
- **+ User's custom profiles** (new additions)
- User overrides replace bundled profiles with same ID

### Structure

```
config/
├── generic.json                    # Fallback profile (neutral, ideology-less)
└── personality-profiles/           # 10 personality profiles
    ├── nationalist/
    │   ├── fanatic-purifier.json
    │   └── militarist-expansionist.json
    ├── religious/
    │   ├── fanatic-purifier.json
    │   └── holy-crusader.json
    ├── corporate/
    │   └── profit-maximizer.json
    ├── communist/
    │   └── revolutionary-vanguard.json
    ├── diplomatic/
    │   └── galactic-unifier.json
    ├── military/
    │   └── grand-strategist.json
    ├── monarchist/
    │   └── imperial-chancellor.json
    └── technocrat/
        └── efficiency-director.json
```

## Profile Format

Each profile JSON file contains:

- **id**: Unique identifier
- **archetype**: Reference to base archetype
- **name**: Display name
- **keywords**: Searchable tags
- **description**: Profile description
- **matcher**: Ideology ranges for auto-selection
- **greetings**: Initial and returning greetings
- **tutorialAdvice**: Tutorial tips with conditions
- **observations**: Game observation messages with variants

See existing profiles for examples.

## Adding Custom Profiles

### Option 1: Create New Profile

1. Go to your user data directory (see paths above)
2. Navigate to `config/personality-profiles/`
3. Create a new subfolder (e.g., `custom/`)
4. Add your profile JSON file with a **unique ID**
5. Restart the app - your profile will be loaded automatically

### Option 2: Override Bundled Profile

1. Copy a bundled profile from this folder (resources/config/personality-profiles/)
2. Paste it into your user data directory `config/personality-profiles/`
3. Keep the **same ID** but customize the messages/greetings/advice
4. Restart the app - your version will be used instead of the bundled one!

The app automatically scans all subdirectories for `.json` files.
