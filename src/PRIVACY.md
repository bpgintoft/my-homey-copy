# My Homey — Privacy & Data Usage Documentation

**Last Updated:** March 2026  
**App:** My Homey — Family Home Management  
**Platform:** Base44

---

## 1. Overview

My Homey is a private, family-facing home management application. This document describes how data is collected, stored, and used, and is intended to satisfy App Store review requirements including Apple's Privacy Manifest (PrivacyInfo.xcprivacy) obligations.

---

## 2. Required Reason APIs

The following iOS system APIs are used by My Homey and their justifications are listed per Apple's Required Reasons policy:

### File Timestamp APIs
- **API:** `NSFileSystemFreeSize`, `NSFileSystemSize` (via WKWebView / local storage)
- **Reason:** Used to manage locally cached calendar events and family data for offline viewing.
- **Privacy Nutrition Label Category:** File timestamp APIs — Reason `DDA9.1` (app functionality)

### Calendar Access
- **API:** `EKEventStore` / Google Calendar OAuth
- **Reason:** Used to display and create maintenance and chore reminders on the user's own Google Calendar. Access is granted explicitly via OAuth consent screen.
- **Privacy Nutrition Label Category:** Calendars — `CA34.1` (app functionality, user-initiated)

### UserDefaults / Local Storage
- **API:** `NSUserDefaults` (via localStorage in WKWebView)
- **Reason:** Stores session-level preferences (e.g., Documents PIN session, page layout preferences). No PII is stored in local storage.
- **Privacy Nutrition Label Category:** User defaults — `CA34.1`

---

## 3. Data Collection & Storage

| Data Type | Where Stored | Shared with 3rd Parties? |
|---|---|---|
| Family member profiles | Base44 cloud database | No |
| Documents & IDs (scans) | Base44 **private** encrypted storage | No |
| Meal plans & grocery lists | Base44 cloud database | No |
| Maintenance records | Base44 cloud database | No |
| Google Calendar events | Google's servers (via OAuth) | No (Google only) |
| AI-generated content (meals, tips) | Not stored permanently | No |

---

## 4. AI & Machine Learning Disclosure

My Homey uses AI in the following ways:

### What AI is used for:
- **Meal ideas & recipe suggestions** — generates meal recommendations based on preferences stored in the app.
- **Maintenance tips** — provides how-to guidance for household appliances and tasks.
- **Activity suggestions** — suggests age-appropriate kids' activities.
- **Document transcription** — extracts text from uploaded historical documents.

### What AI does NOT do:
- **Does not receive Personally Identifiable Information (PII).** Names, SSNs, passport numbers, insurance IDs, and other sensitive fields stored in the Documents & IDs section are **never** sent to any AI model.
- **Does not train on your data.** Queries to the AI are ephemeral and not used to train third-party models.
- **Does not profile users.** No behavioral profiling or advertising targeting occurs.

### AI Provider:
AI features are powered by Base44's integrated LLM service. Base44's data processing agreements prohibit use of app data for model training.

---

## 5. iOS 26 Age Assurance & Parental Controls

My Homey supports the iOS 26 Declared Age Range API:

- Users tagged with `role: "child"` or `age_range: "under_13"` will trigger the system-level parental consent flow before accessing the app.
- The app tracks `parental_consent_status` per user: `pending`, `granted`, or `denied`.
- Child users are restricted from: viewing the Decisions page, accessing Documents & IDs, editing personal/financial information, and other adult-only sections.
- No data from child users is used for AI features.

---

## 6. Third-Party Services

| Service | Purpose | Privacy Policy |
|---|---|---|
| Base44 | App platform, database, file storage | https://base44.com/privacy |
| Google Calendar | Optional calendar sync (OAuth, user-initiated) | https://policies.google.com/privacy |
| Google Maps | Address autocomplete for contacts/vendors | https://policies.google.com/privacy |

---

## 7. Data Deletion

Users may request deletion of all their data by contacting the app administrator. The administrator can use the cascade-delete function in the Family management section to remove all records associated with a family member.

---

## 8. Contact

For privacy questions, contact the app owner through the Base44 platform.