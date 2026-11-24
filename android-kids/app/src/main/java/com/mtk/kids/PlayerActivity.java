package com.mtk.kids;

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
    private boolean ended, failed, upCancel, goNext;
    private String upNext;
    private android.widget.TextView upView, skipView;
    private static final float[] RATES = {1f, 1.25f, 1.5f, 0.75f};
    private static final int[] SLEEPS = {0, 30, 60, 90};
    private int rateI, sleepI;
    private final Runnable sleepR = () -> { if (this.player != null) this.player.pause(); finish(); };
    private final Runnable skipTick = new Runnable() {
        @Override
        public void run() {
            if (player == null || skipView == null) return;
            long p = player.getCurrentPosition();
            skipView.setVisibility(upNext != null && p > 3000 && p < 240000 ? View.VISIBLE : View.GONE);
            ui.postDelayed(this, 1000);
        }
    };

    private void toast(String t) { Toast.makeText(this, t, Toast.LENGTH_SHORT).show(); }

    private void skipIntro() {
        player.seekTo(player.getCurrentPosition() + 85000);
        skipView.setVisibility(View.GONE);
        toast("تخطّينا المقدمة");
    }
    private final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable upTick = new Runnable() {
        @Override
        public void run() {
            if (player == null) return;
            long d = player.getDuration(), p = player.getCurrentPosition();
            if (upNext != null && !upCancel && d > 60000 && d - p <= 15000) {
                long left = Math.max(1, (d - p + 999) / 1000);
                upView.setText(upNext + "\nبعد " + left + " ث  •  OK شغّل الآن  •  رجوع إلغاء");
                upView.setVisibility(View.VISIBLE);
            } else upView.setVisibility(View.GONE);
            ui.postDelayed(this, 500);
        }
    };

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
        @SuppressWarnings("unchecked")
        Map<String, String> extra = (Map<String, String>) getIntent().getSerializableExtra("hdr");
        if (extra != null) hdr.putAll(extra);
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
        upNext = getIntent().getStringExtra("next");
        if (upNext != null && upNext.isEmpty()) upNext = null;
        float dp = getResources().getDisplayMetrics().density;
        upView = new android.widget.TextView(this);
        upView.setTextColor(0xFFFFFFFF);
        upView.setTextSize(16);
        upView.setLineSpacing(0, 1.2f);
        upView.setPadding((int) (18 * dp), (int) (12 * dp), (int) (18 * dp), (int) (12 * dp));
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setColor(0xF00A0A10);
        bg.setCornerRadius(16 * dp);
        bg.setStroke((int) (2 * dp), 0xFFFF2D55);
        upView.setBackground(bg);
        upView.setVisibility(View.GONE);
        upView.setOnClickListener(v -> { goNext = true; finish(); });
        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.addView(view);
        android.widget.FrameLayout.LayoutParams lp = new android.widget.FrameLayout.LayoutParams(-2, -2, android.view.Gravity.BOTTOM | android.view.Gravity.END);
        lp.setMargins(0, 0, (int) (28 * dp), (int) (90 * dp));
        root.addView(upView, lp);
        skipView = new android.widget.TextView(this);
        skipView.setText("تخطّي المقدمة  ▼");
        skipView.setTextColor(0xFFFFFFFF);
        skipView.setTextSize(16);
        skipView.setPadding((int) (18 * dp), (int) (10 * dp), (int) (18 * dp), (int) (10 * dp));
        android.graphics.drawable.GradientDrawable sbg = new android.graphics.drawable.GradientDrawable();
        sbg.setColor(0xD0141414);
        sbg.setCornerRadius(6 * dp);
        sbg.setStroke((int) (2 * dp), 0xFFFFFFFF);
        skipView.setBackground(sbg);
        skipView.setVisibility(View.GONE);
        skipView.setOnClickListener(v -> skipIntro());
        android.widget.FrameLayout.LayoutParams sp = new android.widget.FrameLayout.LayoutParams(-2, -2, android.view.Gravity.BOTTOM | android.view.Gravity.START);
        sp.setMargins((int) (28 * dp), 0, 0, (int) (90 * dp));
        root.addView(skipView, sp);
        setContentView(root);
        ui.post(upTick);
        ui.postDelayed(skipTick, 1000);
        Toast.makeText(this, "▲ السرعة    ▼ تخطّي المقدمة    ☰ مؤقّت النوم", Toast.LENGTH_LONG).show();

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int st) {
                if (st == Player.STATE_ENDED) { ended = true; goNext = upNext != null && !upCancel; finish(); }
            }

            @Override
            public void onPlayerError(PlaybackException e) {
                if (retries++ < 2) {
                    long pos = player.getCurrentPosition();
                    player.prepare();
                    player.seekTo(pos);
                    player.play();
                } else {
                    failed = true;
                    Toast.makeText(PlayerActivity.this, "رجعنا للمشغّل العادي", Toast.LENGTH_SHORT).show();
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
        if (upView != null && upView.getVisibility() == View.VISIBLE) {
            int k = e.getKeyCode();
            if (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER) {
                if (e.getAction() == KeyEvent.ACTION_UP) { goNext = true; finish(); }
                return true;
            }
            if (k == KeyEvent.KEYCODE_BACK) {
                if (e.getAction() == KeyEvent.ACTION_UP) { upCancel = true; upView.setVisibility(View.GONE); }
                return true;
            }
        }
        if (e.getAction() == KeyEvent.ACTION_DOWN && player != null && !view.isControllerFullyVisible()) {
            switch (e.getKeyCode()) {
                case KeyEvent.KEYCODE_DPAD_LEFT: player.seekBack(); view.showController(); return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT: player.seekForward(); view.showController(); return true;
                case KeyEvent.KEYCODE_DPAD_UP:
                    rateI = (rateI + 1) % RATES.length;
                    player.setPlaybackSpeed(RATES[rateI]);
                    toast("السرعة " + RATES[rateI] + "x");
                    return true;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    if (player.getCurrentPosition() < 300000) skipIntro(); else view.showController();
                    return true;
                case KeyEvent.KEYCODE_MENU:
                case KeyEvent.KEYCODE_INFO:
                case KeyEvent.KEYCODE_PROG_RED:
                    sleepI = (sleepI + 1) % SLEEPS.length;
                    ui.removeCallbacks(sleepR);
                    if (SLEEPS[sleepI] > 0) { ui.postDelayed(sleepR, SLEEPS[sleepI] * 60000L); toast("بيوقف بعد " + SLEEPS[sleepI] + " دقيقة"); } else toast("مؤقّت النوم مطفي");
                    return true;
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
                    .putExtra("err", failed)
                    .putExtra("goNext", goNext && !failed)
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
        ui.removeCallbacks(upTick);
        ui.removeCallbacks(skipTick);
        ui.removeCallbacks(sleepR);
        if (player != null) { player.release(); player = null; }
        super.onDestroy();
    }
}
