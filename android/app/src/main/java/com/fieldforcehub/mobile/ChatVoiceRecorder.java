package com.fieldforcehub.mobile;
import android.media.MediaRecorder;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
/** Foreground chat audio; every exit releases the microphone and deletes the private temporary file. */
final class ChatVoiceRecorder {
 interface Driver {void start(File file) throws Exception;void stop() throws Exception;void release();}
 interface Factory {Driver create();}
 private final File directory;private final Factory factory;private Driver driver;private File file;
 ChatVoiceRecorder(File directory){this(directory,()->new Driver(){private final MediaRecorder r=new MediaRecorder();public void start(File f)throws Exception{r.setAudioSource(MediaRecorder.AudioSource.MIC);r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);r.setAudioChannels(1);r.setAudioSamplingRate(44100);r.setAudioEncodingBitRate(64000);r.setMaxDuration(185000);r.setMaxFileSize(10*1024*1024);r.setOutputFile(f.getAbsolutePath());r.prepare();r.start();}public void stop(){r.stop();}public void release(){r.release();}});}
 ChatVoiceRecorder(File directory,Factory factory){this.directory=directory;this.factory=factory;}
 synchronized void start()throws Exception{if(driver!=null)throw new IllegalStateException("A voice recording is already active");directory.mkdirs();file=File.createTempFile("ffh-chat-",".m4a",directory);driver=factory.create();try{driver.start(file);}catch(Exception e){cancel();throw new IOException("Could not start microphone. Close any other voice recorder, check microphone permission and retry.",e);}}
 synchronized byte[] finish()throws Exception{if(driver==null)throw new IllegalStateException("No active chat recording");try{driver.stop();if(file.length()<32)throw new IOException("Hold the microphone for at least one second and retry.");if(file.length()>10*1024*1024)throw new IOException("Voice recording is too large");return Files.readAllBytes(file.toPath());}catch(RuntimeException e){throw new IOException("Recording was too short. Hold the microphone and speak, then release.",e);}finally{cleanup();}}
 synchronized void cancel(){if(driver!=null)try{driver.stop();}catch(Exception ignored){}cleanup();}
 private void cleanup(){if(driver!=null)try{driver.release();}catch(Exception ignored){}driver=null;if(file!=null)file.delete();file=null;}
}
