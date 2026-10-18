package com.fieldforcehub.mobile;
import static org.junit.Assert.*;
import org.junit.Test;
public class DownloadNameTest {
 @Test public void repeatedReportsHaveDifferentNamesAndKeepExtension(){String first=MainActivity.uniqueDownloadName("FieldForce-Full-2026-10-19.xlsx"),second=MainActivity.uniqueDownloadName("FieldForce-Full-2026-10-19.xlsx");assertNotEquals(first,second);assertTrue(first.startsWith("FieldForce-Full-2026-10-19-"));assertTrue(first.endsWith(".xlsx"));}
 @Test public void pdfAndExtensionlessNamesRemainValid(){assertTrue(MainActivity.uniqueDownloadName("claim.pdf").endsWith(".pdf"));assertTrue(MainActivity.uniqueDownloadName("report").startsWith("report-"));}
}
