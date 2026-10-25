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

/**
 * Minimal, dependency-free WebView wrapper around the single-file game.
 * Uses SharedPreferences through a JS bridge so the progress survives app
 * restarts even though the page is loaded from a file:// URL.
 */
public class MainActivity extends Activity {

    private WebView web;

    /** Synchronous storage bridge exposed to JS as window.CKStorage. */
    public static final class StorageBridge {
        private final SharedPreferences prefs;

        StorageBridge(Context context) {
            prefs = context.getSharedPreferences("idle_rpg_save", Context.MODE_PRIVATE);
        }

        @JavascriptInterface
        public String load() {
            return prefs.getString("save", "");
        }

        @JavascriptInterface
        public void save(String value) {
            prefs.edit().putString("save", value).apply();
        }

        @JavascriptInterface
        public void clear() {
            prefs.edit().remove("save").apply();
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

        web.addJavascriptInterface(new StorageBridge(this), "CKStorage");
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        setContentView(web);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/index.html");
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
