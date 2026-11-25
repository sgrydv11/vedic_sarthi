package in.avantika.vedic;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

public final class MainActivity extends Activity {
    private static final String OFFLINE = "https://appassets.androidplatform.net";
    private static final String HOSTED = "https://avantika-ujjain.trh072026.chatgpt.site";
    private static final Pattern IPV4 = Pattern.compile("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}");
    private static final int WINE = Color.rgb(87, 30, 54);
    private static final Map<String, String> ASSETS;
    static {
        Map<String, String> assets = new HashMap<>();
        assets.put("/", "text/html");
        assets.put("/ui.js", "text/javascript");
        assets.put("/style.css", "text/css");
        assets.put("/catalog.json", "application/json");
        assets.put("/library-gita.json", "application/json");
        assets.put("/panchang.js", "text/javascript");
        assets.put("/panchang-engine.js", "text/javascript");
        assets.put("/panchang-licenses.txt", "text/plain");
        assets.put("/jyotish.js", "text/javascript");
        assets.put("/jyotish-engine.js", "text/javascript");
        assets.put("/jyotish-licenses.txt", "text/plain");
        assets.put("/hero.webp", "image/webp");
        assets.put("/pandit-arvind.jpg", "image/jpeg");
        assets.put("/pandit-madhav.jpg", "image/jpeg");
        ASSETS = Collections.unmodifiableMap(assets);
    }
    private WebView web;
    private TextView status;
    private String server;
    private String origin = OFFLINE;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(WINE);
        getWindow().setNavigationBarColor(WINE);
        server = getPreferences(MODE_PRIVATE).getString("server", HOSTED);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(14), 0, dp(8), 0);
        toolbar.setBackgroundColor(WINE);
        status = new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(14);
        toolbar.addView(status, new LinearLayout.LayoutParams(0, dp(44), 1));
        status.setGravity(Gravity.CENTER_VERTICAL);
        Button settings = new Button(this);
        settings.setText("Connection");
        settings.setAllCaps(false);
        settings.setTextColor(Color.WHITE);
        settings.setBackgroundColor(WINE);
        settings.setOnClickListener(view -> connection());
        toolbar.addView(settings, new LinearLayout.LayoutParams(dp(110), dp(44)));
        layout.addView(toolbar, new LinearLayout.LayoutParams(-1, dp(44)));

        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new Client());
        layout.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(layout);
        load(server.isEmpty() ? OFFLINE : server);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void load(String destination) {
        origin = destination;
        status.setText(OFFLINE.equals(origin) ? "Offline library" : HOSTED.equals(origin) ? "Avantika online" : "Local PC server");
        web.loadUrl(origin + "/");
    }

    private void connection() {
        EditText entry = new EditText(this);
        entry.setSingleLine(true);
        entry.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        entry.setHint(HOSTED);
        entry.setText(server);

        LinearLayout contents = new LinearLayout(this);
        contents.setOrientation(LinearLayout.VERTICAL);
        contents.setPadding(dp(22), dp(8), dp(22), 0);
        TextView message = new TextView(this);
        message.setText("Use the hosted Avantika address or enter your PC server address on trusted Wi-Fi.");
        contents.addView(message);
        contents.addView(entry);

        AlertDialog prompt = new AlertDialog.Builder(this)
            .setTitle("Connect to Avantika")
            .setView(contents)
            .setPositiveButton("Connect", null)
            .setNegativeButton("Use hosted site", (dialog, which) -> {
                server = HOSTED;
                getPreferences(MODE_PRIVATE).edit().putString("server", server).apply();
                load(server);
            })
            .setNeutralButton("Use offline", (dialog, which) -> {
                server = "";
                getPreferences(MODE_PRIVATE).edit().remove("server").apply();
                load(OFFLINE);
            }).create();
        prompt.setOnShowListener(dialog -> prompt.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
            String address = validateAddress(entry.getText().toString().trim());
            if (address == null) {
                entry.setError("Use the hosted address or a local IPv4 address and port.");
                return;
            }
            server = address;
            getPreferences(MODE_PRIVATE).edit().putString("server", server).apply();
            prompt.dismiss();
            load(server);
        }));
        prompt.show();
    }

    static String validateAddress(String value) {
        try {
            if (value.equals(HOSTED) || value.equals(HOSTED + "/")) return HOSTED;
            URI uri = new URI(value);
            String host = uri.getHost();
            int port = uri.getPort();
            if (!"http".equals(uri.getScheme()) || host == null || !IPV4.matcher(host).matches()
                || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || (!uri.getPath().isEmpty() && !"/".equals(uri.getPath())) || port < 1 || port > 65535) return null;
            String[] parts = host.split("\\.");
            for (String part : parts) if (Integer.parseInt(part) > 255) return null;
            int first = Integer.parseInt(parts[0]);
            int second = Integer.parseInt(parts[1]);
            if (!(first == 10 || first == 127 || (first == 172 && second >= 16 && second <= 31)
                || (first == 192 && second == 168))) return null;
            return "http://" + host + ":" + port;
        } catch (Exception invalid) {
            return null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private static WebResourceResponse json(int code, String status, String value) {
        return new WebResourceResponse("application/json", "UTF-8", code, status,
            Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8)));
    }

    private final class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (url.toString().startsWith(origin + "/")) return false;
            if (request.hasGesture() && "https".equals(url.getScheme())) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException unavailable) {
                    Toast.makeText(MainActivity.this, "No browser available.", Toast.LENGTH_SHORT).show();
                }
            }
            return true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (!url.toString().startsWith(OFFLINE + "/")) return null;
            String path = url.getPath();
            if ("/api/session".equals(path)) return json(200, "OK", "{\"user\":null}");
            if (path != null && path.startsWith("/api/")) {
                return json(503, "Offline", "{\"error\":\"Use Connection to open Avantika online before signing in or booking.\"}");
            }
            if (path == null || !ASSETS.containsKey(path)) return json(404, "Not Found", "{}");
            String file = "/".equals(path) ? "index.html" : path.substring(1);
            try {
                return new WebResourceResponse(ASSETS.get(path), ASSETS.get(path).startsWith("image/") ? null : "UTF-8",
                    200, "OK", Collections.singletonMap("Content-Security-Policy",
                        "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"),
                    getAssets().open("web/" + file));
            } catch (IOException missing) {
                return json(404, "Not Found", "{}");
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && !OFFLINE.equals(origin) && request.getUrl().toString().startsWith(origin + "/")) {
                Toast.makeText(MainActivity.this, "Server unavailable. Opening the offline library.", Toast.LENGTH_LONG).show();
                load(OFFLINE);
            }
        }
    }
}
