# Sri Mandir and Avantika feature comparison

This comparison uses Sri Mandir's public website and linked product pages. The audit covered the main navigation and representative tools and details. It covers visible features and published descriptions. It does not assert how Sri Mandir implements its private services or what happens after purchase.

| Feature | Public Sri Mandir product | Avantika after this update | Remaining scope |
| --- | --- | --- | --- |
| Pooja | Dated temple poojas, account booking history and fulfillment evidence | Staff-published dated events, remote and in-person requests, Sankalp, role-based status, ritual video link and Prasad tracking | Verified temple capacity and online payment settlement |
| Chadhava | Dated temple offerings, booking history and fulfillment evidence | Dated temple events, offering selection, Sankalp, request tracking and staff-recorded fulfillment evidence | Live partner availability and paid checkout |
| Temples and darshan | Temple directory and app darshan | Searchable regional temple profiles and playback for supported published audio and video files | Larger directory and licensed recordings or streams |
| Personal mandir | Personal temple and virtual worship | Deity selection and private, date-based offering history across signed-in devices | Additional virtual rituals, media and reminders |
| Literature and music | Devotional articles, books, music, Aarti, Mantra and Chalisa | Festival and home worship guides, three original starter readings, Jaap Mala and published devotional audio links | Licensed media catalog, playlists and richer content |
| Panchang, horoscope, astrology | Daily material, online calculators and astrologer consultations | City-and-date daylight estimates, staff-published notes and horoscope entries, review requests and consultation links | Tithi, Nakshatra, Rahu Kaal, instant birth calculations and in-app live consultation |
| Community | Devotional community advertised in the app | Signed-in reflections, owner visibility while pending, and operations moderation before publication | Replies, following and notifications |
| Store | Product catalog and retail checkout | Staff-managed products and inventory, persistent cart, submitted orders, stock reservation, cancellation and manual dispatch tracking | Online payments, shipping-provider automation and returns |

Sources: [Sri Mandir home and app overview](https://www.srimandir.com/) · [Chadhava](https://www.srimandir.com/chadhava) · [Temple directory](https://www.srimandir.com/temples) · [Panchang](https://www.srimandir.com/panchang) · [Astrology calculators](https://www.srimandir.com/astrology-calculator) · [Store](https://srimandir.store/).

## Page-level journeys

| Journey reviewed | Avantika route and behavior |
| --- | --- |
| Puja catalog, ceremony detail, participation and Sankalp | `#poojas/<ritual>` shows purpose, venue, fee estimate and fulfillment options. `/book` collects individual or family participation and opens the saved request. |
| Offering catalog, offering detail, named offering | `#chadhava/<offering>/book` stores the named offering with temple and Sankalp. |
| Scheduled service, date and participation | `#events/<event>/book` uses the published temple and event date. Staff can close a listing while previous requests retain their event details. |
| Temple directory and child sections | `#temples/<temple>/darshan` and `/events` display published media and upcoming events for that temple. |
| Store collection, product, cart, checkout and order | `#store/<product>` shows the current price and stock. `#cart/checkout` submits the saved cart and opens `#orders/<id>`. Operations coordinates payment and dispatch separately. |
| Guide categories and articles | `#library/<category>/<guide>` displays instructions and a device-local Samagri checklist. |
| Astrology, Daan and consultation services | Each service has a detail page and a shareable `/book` form. Astrology results still come from staff review. |

Sources for deeper comparisons include the [Sri Mandir puja listing](https://www.srimandir.com/epuja), [a puja detail and packages](https://www.srimandir.com/epuja/pitru-dosh-shanti-9th-aug-2026-1791885412-1793260985-1793866200-1793956539), [a Chadhava detail](https://www.srimandir.com/chadhava/b21105b2-b26e-4db4-b1df-4df89b1f9e38), [a retail collection](https://srimandir.store/collections/karungali), and [a product detail](https://srimandir.store/collections/new-blessed-collection/products/nazar-kavach). The comparison covers representative public item pages and their visible controls.
