package eemeli.webview;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;

public class WebviewActivity extends Activity {

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_webview);

		WebView webview = (WebView) findViewById(R.id.webview);
		WebSettings settings = webview.getSettings();

		webview.setWebChromeClient(new WebChromeClient() {
			@Override
			public void onExceededDatabaseQuota(
				String url, String databaseIdentifier, long currentQuota, long estimatedSize,
				long totalUsedQuota, WebStorage.QuotaUpdater quotaUpdater
			) {
				quotaUpdater.updateQuota(estimatedSize * 2);
			}
		});

		settings.setJavaScriptEnabled(true);
		settings.setDomStorageEnabled(true);

		String appCachePath = getApplicationContext().getCacheDir().getAbsolutePath();
		settings.setAppCachePath(appCachePath);
		settings.setAppCacheMaxSize(1024*1024*8);
		settings.setAllowFileAccess(true);
		settings.setAppCacheEnabled(true);

		// makes LocalStorage persistent
		String databasePath = getApplicationContext().getDir("database", Context.MODE_PRIVATE).getPath();
		settings.setDatabasePath(databasePath);
		settings.setDatabaseEnabled(true);

		webview.loadUrl("http://aut-web.hut.fi/ea/ko/");

	}
	
}
