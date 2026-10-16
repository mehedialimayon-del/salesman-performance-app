package com.fieldforcehub.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Intent;
import android.net.Uri;

import org.robolectric.RuntimeEnvironment;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class PdfAutoOpenIntentTest {
    @Test
    public void savedPdfOpensWithReadPermission() {
        Uri uri = Uri.parse("content://downloads/my_downloads/42");
        Intent intent = MainActivity.pdfOpenIntent(
            RuntimeEnvironment.getApplication(), uri, "Buyer-Catalogue.pdf");

        assertEquals(Intent.ACTION_VIEW, intent.getAction());
        assertEquals(uri, intent.getData());
        assertEquals("application/pdf", intent.getType());
        assertTrue((intent.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0);
        assertNotNull(intent.getClipData());
        assertEquals(uri, intent.getClipData().getItemAt(0).getUri());
    }
}