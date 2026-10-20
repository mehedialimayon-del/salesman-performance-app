package com.fieldforcehub.mobile;
import static org.junit.Assert.*;
import org.junit.Test;
import java.io.*;
import java.nio.file.Files;
public class ChatVoiceRecorderTest {
 static class Fake implements ChatVoiceRecorder.Driver {File file;boolean released;boolean failStart,failStop;public void start(File f)throws Exception{file=f;if(failStart)throw new IOException("busy");Files.write(f.toPath(),new byte[64]);}public void stop(){if(failStop)throw new RuntimeException("short");}public void release(){released=true;}}
 @Test public void successfulFinishReleasesAndDeletesPrivateAudio()throws Exception{Fake d=new Fake();File dir=Files.createTempDirectory("ffh-test").toFile();ChatVoiceRecorder r=new ChatVoiceRecorder(dir,()->d);r.start();assertEquals(64,r.finish().length);assertTrue(d.released);assertFalse(d.file.exists());}
 @Test public void cancelOnNavigationReleasesAndDeletes()throws Exception{Fake d=new Fake();ChatVoiceRecorder r=new ChatVoiceRecorder(Files.createTempDirectory("ffh-test").toFile(),()->d);r.start();r.cancel();r.cancel();assertTrue(d.released);assertFalse(d.file.exists());}
 @Test public void tooShortRecordingNeverReturnsBrokenAudio()throws Exception{Fake d=new Fake();d.failStop=true;ChatVoiceRecorder r=new ChatVoiceRecorder(Files.createTempDirectory("ffh-test").toFile(),()->d);r.start();try{r.finish();fail();}catch(IOException e){assertTrue(e.getMessage().contains("too short"));}assertTrue(d.released);assertFalse(d.file.exists());}
 @Test public void busyMicrophoneFailureCleansUpAndAllowsRetry()throws Exception{Fake d=new Fake();d.failStart=true;ChatVoiceRecorder r=new ChatVoiceRecorder(Files.createTempDirectory("ffh-test").toFile(),()->d);try{r.start();fail();}catch(IOException e){assertTrue(e.getMessage().contains("microphone"));}assertTrue(d.released);assertFalse(d.file.exists());d.failStart=false;r.start();r.cancel();}
}
