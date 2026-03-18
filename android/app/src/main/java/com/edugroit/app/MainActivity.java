package com.edugroit.app;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebSettings settings = getBridge().getWebView().getSettings();
        String userAgent = settings.getUserAgentString();
        if (userAgent == null) {
            userAgent = "";
        }
        if (!userAgent.contains("EdugroitApp/1")) {
            settings.setUserAgentString(userAgent + " EdugroitApp/1");
        }
    }
}
