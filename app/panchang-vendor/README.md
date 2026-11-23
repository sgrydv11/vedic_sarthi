The daily Panchang uses @ishubhamx/panchangam-js 3.0.0 with Astronomy Engine.
Rebuild the browser module from this directory with:

    npm ci
    npx esbuild engine.mjs --bundle --minify --format=esm --platform=browser --legal-comments=inline --outfile=../public/panchang-engine.js

The engine uses both Amanta and Purnimanta calendars. The directory uses city centers
and displays all calculations in IST. Third-party notices are in public/panchang-licenses.txt.
