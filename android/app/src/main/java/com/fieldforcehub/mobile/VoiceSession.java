package com.fieldforcehub.mobile;
import android.content.*;import android.os.*;import android.speech.*;import java.util.*;
/** Explicit, foreground-only dictation. Stops on navigation/background or after ten minutes. */
public final class VoiceSession implements RecognitionListener {
 interface Finished {void done(String text,String error);}
 private final SpeechRecognizer speech;private final Handler timer=new Handler(Looper.getMainLooper());private final Finished finished;private final Intent intent;private final boolean continuous;private final ArrayList<String> parts=new ArrayList<>();private boolean closed;private int failures;
 VoiceSession(Context c,String language,Finished callback){this(c,language,true,callback);}
 VoiceSession(Context c,String language,boolean keepListening,Finished callback){continuous=keepListening;finished=callback;speech=SpeechRecognizer.createSpeechRecognizer(c);speech.setRecognitionListener(this);intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,language).putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,language).putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,3).putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);}
 void start(){timer.postDelayed(()->stop(null),600000);listen();}
 private void listen(){if(closed)return;try{speech.startListening(intent);}catch(Exception e){stop("Voice service unavailable; use the keyboard microphone");}}
 void stop(String error){if(closed)return;closed=true;timer.removeCallbacksAndMessages(null);speech.cancel();speech.destroy();finished.done(String.join("\n",parts),error);}
 @Override public void onResults(Bundle b){if(closed)return;ArrayList<String> text=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);if(text!=null&&!text.isEmpty()&&String.join("\n",parts).length()<50000)parts.add(text.stream().filter(t->!intent.getStringExtra(RecognizerIntent.EXTRA_LANGUAGE).startsWith("bn")||t.matches("(?s).*[\\u0980-\\u09ff].*")).findFirst().orElse(text.get(0)));failures=0;if(continuous)timer.postDelayed(this::listen,250);else stop(null);}
 @Override public void onError(int error){if(closed)return;if(error==SpeechRecognizer.ERROR_NO_MATCH||error==SpeechRecognizer.ERROR_SPEECH_TIMEOUT||(error==SpeechRecognizer.ERROR_RECOGNIZER_BUSY&&++failures<=3)){timer.postDelayed(this::listen,500);return;}stop("Voice service error "+error+"; any captured text is retained");}
 @Override public void onReadyForSpeech(Bundle p){}@Override public void onBeginningOfSpeech(){}@Override public void onRmsChanged(float r){}@Override public void onBufferReceived(byte[] b){}@Override public void onEndOfSpeech(){}@Override public void onPartialResults(Bundle b){}@Override public void onEvent(int type,Bundle b){}
}
