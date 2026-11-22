# Avantika

Avantika is a local web app for Ujjain pooja requests, spiritual guides and manual fulfillment. It runs on Windows with Node.js 22.13 or later and requires no package installation.

## Run the app

From this folder in PowerShell:

```powershell
npm.cmd start
```

Open http://127.0.0.1:4173 and create a devotee account. The app stores accounts, requests and status history in `data/avantika.sqlite`. Stop the server with Ctrl+C.

To exercise the Pandit and Operations portals, start the server with two distinct registration codes you choose. Use at least 12 characters per code.

```powershell
$env:PANDIT_CODE = '<your Pandit registration code>'
$env:ADMIN_CODE = '<your Operations registration code>'
npm.cmd start
```

Create a separate account for each role using its code. Use separate browser profiles to keep each role signed in at the same time. The Operations dashboard can assign requests to a registered Pandit. Pandits can also claim unassigned work. Existing staff accounts can sign in after the registration codes are removed from the environment.

Run the automated workflow checks with `npm.cmd test`.

## What the documents establish

| Source | Role in the implementation |
| --- | --- |
| `Ujjain_Vedic_SuperApp_Complete_Master_Document_final.pdf` | Version 3 is the requirements baseline. It adds explicit proxy-pooja rules, Karmkand, advanced Jyotish, partner operations and a four-phase roadmap. |
| `Ujjain_Vedic_SuperApp_Complete_Master_Document.pdf` | Earlier consolidated blueprint covering the devotee modules, content library and astrology engine. |
| `Ujjain_Vedic_Spiritual_SuperApp_PRD.pdf` | Original three-interface product plan and technical blueprint. |
| `Complete_Guide_to_Hindu_Poojas_India_and_Ujjain.docx` | Ritual categories, venues and indicative prices used to populate the catalog. |
| `Complete_Vedic_Rituals_Vrat_Daan_and_Consultation_Guide.docx` | Festival-month listings, Vrat and home puja practices, Daan categories and consultation topics. |

The final brief makes remote booking the central transaction. A devotee submits a Sankalp and optionally requests India-only Prasad delivery. The video is complimentary, Prasad carries no item fee, and any courier charge appears separately. The final brief calls for confirmed prices, verified priests and actual delivery-service checks. This build shows indicative pricing where available and a sample ₹99 courier estimate. A PIN code is checked for format. Operations confirms availability and actual eligibility outside the app.

## Available workflows

- **Devotee** — Browse and filter 36 rituals, submit remote or in-person requests, follow status history, open a video or courier link, cancel an unaccepted request and open support tickets.
- **Pandit** — Claim or receive assigned requests, confirm date and time in IST, record ritual progress and submit private video links. Document results for consultations, Daan pledges and astrology reviews.
- **Operations** — Assign a Pandit, oversee the queue, record packing and dispatch, enter an AWB and tracking link, mark delivery and resolve support tickets.
- **Practice and reference** — Explore 12 Hindu months, 13 short guides and interactive Samagri checklists. Count Jaap for three mantras with progress saved in the browser.
- **Other services** — Record Daan pledges and request consultations, Kundli, Kundli Milan, Muhurat, Panchang and Gochar review. Staff enter reviewed results manually.

## Remaining production scope

The supplied roadmap extends beyond this local release. Production fulfillment requires onboarded temple, priest and Gaushala partners; approved fees and parcel policies; a configured courier; private video hosting; payments with refund and reconciliation flows; verified 80G eligibility and receipts; and notification, OTP and live consultation providers. This app accepts requests and pledges without charging money. Link privacy depends on the host where staff store the video or report.

Accurate Panchang, Kundli, Ashtakoota, Gochar and Muhurat automation requires a licensed ephemeris or astrology provider, location and historical time-zone data, a defined calculation convention and checked reference fixtures. This build uses manual review so it does not display computed-looking results from sample data.

Native Android and iOS apps, complete bilingual UI, advanced astrology, pilgrim commerce, subscriptions and public deployment are outside this local release. The web UI uses English with selected Sanskrit mantra text. Before collecting real devotee information on a hosted service, add production authentication, role provisioning, privacy and retention controls, secure storage, HTTPS and operational monitoring.

## Install on Android

Copy [Avantika.apk](android/Avantika.apk) to your phone and open it in Files. If Android prompts you, allow installs from that file source. The APK supports Android 8.0 and newer and uses Android System WebView.

The ritual catalog, festival calendar, guides, Samagri checklists and Jaap Mala open on the phone without a server. To sign in or submit and track requests, connect to the PC running Avantika:

1. Put your PC and Android phone on the same trusted Wi-Fi network.
2. From the workspace root, run `ipconfig` and find the IPv4 address under your Wi-Fi adapter. Substitute that address below.

   ```powershell
   $env:AVANTIKA_BIND = '192.168.1.10'
   npm.cmd --prefix app start
   ```

3. To download directly on your phone, open the printed server address in the phone browser and append `/download/avantika.apk`.
4. In the Android app, tap **Connection** and enter the full address printed by the server, including `http://` and the port. If Windows Firewall prompts, allow access on the private network only.
5. Keep the PC server running while using connected features. Tap **Connection → Use offline** to return to the bundled library.

Wi-Fi mode explicitly binds to the selected private address and uses plain HTTP, so use test accounts and test information. When opening the app on the PC while Wi-Fi mode is running, use the printed address. The default server mode continues to bind to `127.0.0.1` when `AVANTIKA_BIND` is unset.

### Rebuild the APK

Install Android SDK Platform 35 and Android SDK Build Tools 35.0.0. Use the Android Studio bundled JDK or supply the JDK path with `-JavaHome`.

```powershell
pwsh -File app/android/build.ps1 -SdkRoot 'C:\path\to\Android\Sdk'
```

The build packages the current web assets, compiles the Android shell, signs the APK and verifies its signature and alignment. It stores the local signing key under `app/android/.tools`. Keep that key to install future builds as updates to this installation.

## Google sign-in on the PC

Use the FlexiRide **Web application** OAuth client only if you have access to its Google Cloud project. In that client, authorize the exact callback `http://127.0.0.1:4173/api/login/google/callback`. The OAuth consent screen may display the FlexiRide project name. Keep the client secret in a private local configuration and load it as the `GOOGLE_CLIENT_SECRET` environment variable. Set `GOOGLE_CLIENT_ID` from the same client and start the default loopback server. For a different loopback host or port, set `GOOGLE_REDIRECT_URI` to the exact registered callback.

Open `http://127.0.0.1:4173` in a regular desktop browser. The Google button appears in the sign-in dialog when both settings are available and the browser address matches the callback. Google accounts use the devotee role. Existing password accounts retain their original login. The Android WebView and plain-HTTP Wi-Fi address use email and password.

## Connected devotional services

The same request and devotional routes run on desktop or Android. The PC server stores records in SQLite. The hosted Worker uses a separate Cloudflare D1 database, so local accounts and requests do not automatically migrate. New hosted accounts require a 12-character password. Configure hosted `ADMIN_CODE` and `PANDIT_CODE` as private runtime secrets of at least 16 characters before registering staff; local registration codes are independent. See [the comparison and remaining service integrations](FEATURE-COMPARISON.md).

The Android app opens the hosted HTTPS site on a fresh install and offers **Use hosted site**, a local Wi-Fi server, or **Use offline** under **Connection**. An existing installation may remember its earlier Wi-Fi setting.

Operations can publish recordings, readings, Panchang notes, horoscopes and upcoming observances from **Devotional Library**, and review pending posts from **Community**. Dated material is editorial until a verified data source is connected. Chadhava and store requests appear in the staff queue and can receive a recorded outcome or proof link.
