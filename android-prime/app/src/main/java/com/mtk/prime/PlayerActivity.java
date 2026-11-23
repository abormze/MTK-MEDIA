package com.mtk.prime;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.SubtitleView;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class PlayerActivity extends Activity {
    private ExoPlayer player;
    private PlayerView view;
    private int retries;
    private boolean ended;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);

        String url = getIntent().getStringExtra("url");
        String sub = getIntent().getStringExtra("sub");
        String ua = getIntent().getStringExtra("ua");
        if (url == null) { finish(); return; }

        Map<String, String> hdr = new HashMap<>();
        hdr.put("Referer", "https://cinesrc.st/");
        hdr.put("Origin", "https://cinesrc.st");
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(20000)
                .setDefaultRequestProperties(hdr);
        if (ua != null) http.setUserAgent(ua);

        DefaultRenderersFactory rf = new DefaultRenderersFactory(this).setEnableDecoderFallback(true);
        player = new ExoPlayer.Builder(this, rf)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(http))
                .setSeekBackIncrementMs(10000)
                .setSeekForwardIncrementMs(10000)
                .build();
        player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                .setPreferredTextLanguage("ar")
                .setSelectUndeterminedTextLanguage(true)
                .build());

        MediaItem.Builder mb = new MediaItem.Builder().setUri(url).setMimeType(MimeTypes.APPLICATION_M3U8);
        if (sub != null) {
            mb.setSubtitleConfigurations(Collections.singletonList(
                    new MediaItem.SubtitleConfiguration.Builder(Uri.parse(sub))
                            .setMimeType(MimeTypes.APPLICATION_SUBRIP)
                            .setLanguage("ar")
                            .setLabel("العربية")
                            .setSelectionFlags(C.SELECTION_FLAG_DEFAULT | C.SELECTION_FLAG_FORCED)
                            .build()));
        }

        view = new PlayerView(this);
        view.setKeepScreenOn(true);
        view.setControllerShowTimeoutMs(3000);
        view.setShowSubtitleButton(true);
        view.setShowNextButton(false);
        view.setShowPreviousButton(false);
        view.setPlayer(player);
        SubtitleView sv = view.getSubtitleView();
        if (sv != null) sv.setFractionalTextSize(SubtitleView.DEFAULT_TEXT_SIZE_FRACTION * 1.25f);
        setContentView(view);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int st) {
                if (st == Player.STATE_ENDED) { ended = true; finish(); }
            }

            @Override
            public void onPlayerError(PlaybackException e) {
                if (retries++ < 2) {
                    long pos = player.getCurrentPosition();
                    player.prepare();
                    player.seekTo(pos);
                    player.play();
                } else {
                    Toast.makeText(PlayerActivity.this, "ما قدر يشغّل الفيديو", Toast.LENGTH_LONG).show();
                    finish();
                }
            }
        });
        long start = getIntent().getLongExtra("start", 0);
        if (start > 30) player.setMediaItem(mb.build(), start * 1000); else player.setMediaItem(mb.build());
        player.prepare();
        player.setPlayWhenReady(true);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getAction() == KeyEvent.ACTION_DOWN && player != null && !view.isControllerFullyVisible()) {
            switch (e.getKeyCode()) {
                case KeyEvent.KEYCODE_DPAD_LEFT: player.seekBack(); view.showController(); return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT: player.seekForward(); view.showController(); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    if (player.isPlaying()) player.pause(); else player.play();
                    view.showController();
                    return true;
                default: break;
            }
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public void finish() {
        if (player != null) {
            long d = player.getDuration();
            long p = ended && d > 0 ? d : player.getCurrentPosition();
            setResult(RESULT_OK, new android.content.Intent()
                    .putExtra("key", getIntent().getStringExtra("key"))
                    .putExtra("pos", p / 1000)
                    .putExtra("dur", d > 0 ? d / 1000 : 0));
        }
        super.finish();
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (player != null) player.pause();
    }

    @Override
    protected void onDestroy() {
        if (player != null) { player.release(); player = null; }
        super.onDestroy();
    }
}
