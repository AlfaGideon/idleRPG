package ru.idlerpg.corona;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Minimal, dependency-free WebView wrapper around the single-file game.
 *
 * Two jobs beyond showing the page:
 *  - persist progress in SharedPreferences through window.CKStorage;
 *  - support over-the-air updates: a newer HTML bundle downloaded from GitHub
 *    is written to internal storage and loaded instead of the shipped asset,
 *    so the APK itself never has to be reinstalled.
 */
public class MainActivity extends Activity {

    private static final String PREFS = "idle_rpg_save";
    private static final String KEY_SAVE = "save";
    private static final String KEY_BACKUP = "backup";
    private static final String KEY_VERSION = "bundle_version";
    private static final String OTA_FILE = "ota/game.html";

    private WebView web;

    /** Synchronous storage + OTA bridge exposed to JS as window.CKStorage. */
    public final class StorageBridge {
        private final SharedPreferences prefs;

        StorageBridge(Context context) {
            prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        }

        @JavascriptInterface public String load() { return prefs.getString(KEY_SAVE, ""); }

        @JavascriptInterface public void save(String value) {
            prefs.edit().putString(KEY_SAVE, value).apply();
        }

        @JavascriptInterface public void clear() {
            prefs.edit().remove(KEY_SAVE).apply();
        }

        @JavascriptInterface public void backup(String value) {
            prefs.edit().putString(KEY_BACKUP, value).apply();
        }

        @JavascriptInterface public String restore() {
            return prefs.getString(KEY_BACKUP, "");
        }

        /** Write a fresh game bundle. Returns true on success. */
        @JavascriptInterface public boolean saveBundle(String html, String version) {
            if (html == null || html.length() < 20000) return false;
            File dir = new File(getFilesDir(), "ota");
            if (!dir.exists() && !dir.mkdirs()) return false;
            File tmp = new File(dir, "game.html.tmp");
            File out = new File(dir, "game.html");
            try (FileOutputStream fos = new FileOutputStream(tmp)) {
                fos.write(html.getBytes(StandardCharsets.UTF_8));
                fos.flush();
            } catch (IOException e) {
                return false;
            }
            if (!tmp.renameTo(out)) return false;
            prefs.edit().putString(KEY_VERSION, version == null ? "" : version).apply();
            return true;
        }

        @JavascriptInterface public String bundleVersion() {
            return prefs.getString(KEY_VERSION, "");
        }

        /** Reload the WebView with the downloaded bundle. */
        @JavascriptInterface public void applyUpdate() {
            web.post(new Runnable() {
                @Override public void run() {
                    web.clearCache(true);
                    loadGame();
                }
            });
        }

        /** Emergency rollback to the shipped asset. */
        @JavascriptInterface public void clearBundle() {
            File out = new File(getFilesDir(), OTA_FILE);
            if (out.exists()) out.delete();
            prefs.edit().remove(KEY_VERSION).apply();
        }

        @JavascriptInterface public String appVersion() {
            return prefs.getString(KEY_VERSION, "");
        }
    }

    private void loadGame() {
        File bundle = new File(getFilesDir(), OTA_FILE);
        if (bundle.exists() && bundle.length() > 20000) {
            web.loadUrl("file://" + bundle.getAbsolutePath() + "#v=" + bundle.lastModified());
        } else {
            web.loadUrl("file:///android_asset/index.html");
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0a0c14"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMediaPlaybackRequiresUserGesture(false);
        // Allow the file:// page to fetch the update manifest from GitHub.
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);

        web.addJavascriptInterface(new StorageBridge(this), "CKStorage");
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        setContentView(web);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            loadGame();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
