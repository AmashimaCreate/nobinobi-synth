// のびのびシンセ (nobineko) — なでると鳴く、体ののびる動物たちの Web 楽器。自己完結・CDN依存なし
// 実機での調整は下記 CONFIG のみで完結させる（マジックナンバー禁止）。
// 通常スクリプト（ESモジュールではない）: index.html をダブルクリック(file://)で開ける。

const CONFIG = {
  // --- 音域 ---
  stemSemitones: 24,            // おなか1本ぶんの音域（半音数）
  octaves: [
    { key: 'lo',  label: 'LO',  baseMidi: 48 },   // C3 (baseMidi = おなかの低音端)
    { key: 'mid', label: 'MID', baseMidi: 60 },   // C4
    { key: 'hi',  label: 'HI',  baseMidi: 72 },   // C5
  ],
  a4Hz: 440,
  lowAtTop: false,              // false: 上ほど高い声（顔に近いほど高音）

  // --- 発音（声に依らない共通設定） ---
  voiceGain: 0.5,
  glideTau: 0.006,              // なぞった時のピッチ追従（秒, setTargetAtTime の時定数）
  snapGlideTau: 0.02,           // スナップ時は少しポルタメントを残す
  volumeDefault: 0.7,
  volumeTau: 0.02,
  inTuneCents: 10,              // これ以内なら「合ってる」表示
  voiceParamTau: 0.02,          // 声を切り替えた時のなじませ
  lowpassQ: 0.7,
  lowpassKeyTrack: 1.5,         // カットオフの下限 = 音程 × この倍率（高音が口閉じで消えないように）
  noiseSeconds: 2,
  jitterSeconds: 4,             // 声のふるえ（ループ長）
  jitterCurveRate: 1000,        // ふるえのカーブを計算する細かさ（細かすぎると動物を選んだ時に画面が止まる）
  jitterBufferRate: 8000,       // 再生用に引き伸ばした後の細かさ
  jitterSeed: 20260929,         // ふるえの乱数の種。固定なので毎回同じカーブになり、計測が再現する
  shimmerLoopOffset: 0.5,       // 音量のふるえは、音程のふるえと同じカーブをループのこの割合だけずらして使う
  idleFormantQ: 1,              // 使っていない共鳴フィルタの仮の値（強さ 0 なので音には出ない）
  sourceHarmonics: 256,         // 音源の波形を作る時の倍音の本数（本数を変えても音量は変わらない）
  limiterKnee: 0.8,             // 出力の安全弁: これより小さい音はそのまま、大きい音だけ丸めて 1.0 を超えさせない
  limiterPoints: 1025,          // 安全弁のカーブの点数
  patternBufferRate: 8000,      // 震えパターンの解像度

  // --- 声（どうぶつ） ---
  // 母音は共鳴の山の周波数 [F1, F2, ...]（本数は声ごとに自由）。
  //   口が開いていく時は Front→Open、閉じていく時は Open→Back を通る。
  // formantQ: 山の鋭さ / formantGain: 口を開けた時の山の強さ / formantGainClosed: 口を閉じた時の強さ
  //   隣り合う山は逆相（符号を交互）で足す。同相だと山の間に深い谷ができる。
  // lowpass: 基音だけ通す経路。[口閉じ, 全開]
  // autoMouth: なでるだけで自動的に開く口の大きさ（顔を押すと 1.0）
  // mouthOpenTau / mouthCloseTau: 口の開閉の滑らかさ(秒)
  // scoop: 鳴き始めに下からしゃくる / fall: 鳴き終わりに下がる
  //   触れ直すたびにしゃくり直す（離さずになぞるだけならしゃくらない）。
  //   表示の音程まで ±20¢ に近づく時間 ≒ scoopTau × ln(scoopCents / 20)。音名の表示は指の位置で、しゃくり中の実音ではない。
  // sourceTilt: 音源の倍音の減り方。1=のこぎり波、小さいほど高い倍音が残る鋭い波形（低い声のパルス的な発声）
  //   1 ちょうどの時だけブラウザ標準の のこぎり波を使う。標準の波は理想の のこぎり波より約1.4dB 小さいので、
  //   1 から少しでも動かすとその分だけ音量が上がる。変えたら level を測り直すこと（鋭い波形ほどピークも高い）
  // jitter: 音程の不規則なふるえ / shimmer: 音量の不規則なふるえ
  //   BandHz=ふるえの速さの範囲 / Tilt=速いふるえの減り方（1=ゆっくり主体、0=速いふるえも同じ強さ＝ざらつく）
  // breath: 息ノイズの量 / breathHighpassHz: 息ノイズの下限の高さ
  // pattern: 規則的な震え（none=なし / sine=メェ〜の震え）
  //   Hz=1秒あたりの回数 / Dip=音量の谷の深さ / Cents=谷で音程が下がる量
  // level: 声ごとの音量合わせ（オフライン実測で決めた値）
  // octave: その動物を選んだ時の音域 / transpose: 音域全体を半音単位でずらす（表示も実音に合う）
  voiceDefault: 'cat',
  voices: [
    {
      // 家猫の実測（Nicastro 2004: 平均F0 609Hz・最大880Hz、鳴き声中央で F1 1458Hz / F2 3053Hz、
      // 音程は山なり、フォルマントが動いて二重母音的）に合わせている。
      key: 'cat', label: 'ねこ', face: 'cat', octave: 'mid', transpose: 0,
      sawMix: 1.0, squareMix: 0, sourceTilt: 1, attackTau: 0.03, releaseTau: 0.1,
      vowelFront: [600, 3900, 5200],         // み
      vowelOpen:  [1800, 2950, 4800],        // ゃ（autoMouth の位置でほぼ実測値 約1370/3160Hz）
      vowelBack:  [600, 1700, 4200],         // ぉぅ
      formantQ: [3.5, 5, 6],
      formantGain: [1.0, -1.0, 0.5], formantGainClosed: [1.0, -1.0, 0.5],
      lowpassHz: [600, 800], lowpassGain: [-0.5, -0.15],
      mouthLevel: [0.35, 1.0], level: 1.8,
      autoMouth: 0.75, mouthOpenTau: 0.06, mouthCloseTau: 0.09,
      scoopCents: 300, scoopTau: 0.06, fallCents: 400,
      jitterCents: 14, jitterBandHz: [1, 9], jitterTilt: 1, shimmer: 0,
      breath: 0.06, breathHighpassHz: 2000,
      patternShape: 'none', patternHz: 1, patternDip: 0, patternCents: 0,
    },
    {
      // メェ〜。低めの声で、規則的に細かく震える。フォルマントと震えの速さは推定値（実測を取得できず）。
      key: 'sheep', label: 'ヒツジ', face: 'sheep', octave: 'lo', transpose: 0,
      sawMix: 1.0, squareMix: 0, sourceTilt: 1, attackTau: 0.03, releaseTau: 0.09,
      vowelFront: [300, 1500, 2600],         // ん(m)
      vowelOpen:  [700, 1750, 2600],         // ぇ
      vowelBack:  [300, 1300, 2500],
      formantQ: [4, 6, 7],
      formantGain: [1.0, -1.0, 0.5], formantGainClosed: [1.0, -1.0, 0.5],
      lowpassHz: [400, 600], lowpassGain: [-0.5, -0.2],
      mouthLevel: [0.35, 1.0], level: 2.0,
      autoMouth: 0.9, mouthOpenTau: 0.06, mouthCloseTau: 0.09,
      scoopCents: 80, scoopTau: 0.05, fallCents: 150,
      jitterCents: 18, jitterBandHz: [1, 9], jitterTilt: 1, shimmer: 0,
      breath: 0.05, breathHighpassHz: 2000,
      patternShape: 'sine', patternHz: 14, patternDip: 0.6, patternCents: 50,
    },
    {
      // モー。成牛の実測（Padilla de la Torre 2015）に合わせている。
      //   口を閉じた「ンー」: F0 約81Hzでほぼ平坦、とても小さい、一番低い山(F1)は弱くて測れない。
      //   口を開けた「モー」: F0 平均153Hz。低く始まり(94Hz)、終盤でピーク(199Hz)、少し下がって終わる(145Hz)。
      //   共鳴の山は8本が約420Hz間隔（声道 約41cm）。口の開閉では山はほとんど動かない。
      //   エネルギーの半分は約290Hzより下、4分の3は約600Hzより下。声はざらつく。
      key: 'cow', label: 'ウシ', face: 'cow', octave: 'lo', transpose: -12,
      sawMix: 1.0, squareMix: 0, sourceTilt: 0.67, attackTau: 0.05, releaseTau: 0.14,
      vowelFront: [228, 634, 1064, 1513, 1930, 2384, 2819, 3224],
      vowelOpen:  [228, 645, 1073, 1478, 1889, 2319, 2743, 3181],
      vowelBack:  [228, 634, 1064, 1513, 1930, 2384, 2819, 3224],
      formantQ: [2.1, 5.1, 7.5, 9.3, 10.7, 12, 13, 14],
      // 強さの配分は計算モデルで探索した値。口を開けた時は実測のエネルギー四分位（173/291/596Hz）に合わせた。
      // 口を閉じた時は、実測で言える「F1 は測れないほど弱い・全体に小さい」だけを反映し、F2 以上の配分は開いた時と同じ
      // （閉じた時の四分位 113/353/1227Hz は録音の背景雑音を含む疑いがあるため、強くは合わせていない）。
      // 閉じた時の基音はローパス経路が運ぶ。F1(228Hz) と重なる高さなので、打ち消し合わないよう F1 と同じ符号にしている。
      formantGain:       [1.0, -0.86, 0.77, -0.68, 0.61, -0.54, 0.48, -0.43],
      formantGainClosed: [0, -0.61, 0.55, -0.48, 0.43, -0.38, 0.34, -0.3],
      lowpassHz: [200, 300], lowpassGain: [0.2, 0],
      // 鋭い波形はピークが高いので、平均音量は他の動物よりやや小さい。
      // 音量最大・最低音・顔を押したまま、の条件でピークが安全弁(limiterKnee)付近に収まるよう決めた
      mouthLevel: [0.2, 1.0], level: 0.75,
      autoMouth: 0.85, mouthOpenTau: 0.18, mouthCloseTau: 0.15,
      // しゃくりは実測の「始まり ÷ 平均」(0.62倍 = 約-830¢) に合わせた。
      // 下降は実測の「終わり ÷ ピーク」(0.73倍 = 約-540¢) が、音がまだ聞こえているうち（-20〜-30dB）に出るよう、
      // 行き先(fallCents)をそれより深くしてある。伸ばしている高さを、しゃくりでは平均、下降ではピークとみなしている。
      scoopCents: 800, scoopTau: 0.18, fallCents: 900,
      // ざらつきは HNR 約10dB（実測 4〜15dB）を優先。Praat 式の jitter は約1.2%、shimmer は約10% で、
      // 文献の範囲（1.1〜4% / 10〜17%）の下側。これ以上ふるえを増やすと HNR が下がりすぎる。高い音域ほど声は澄む。
      jitterCents: 90, jitterBandHz: [2, 70], jitterTilt: 0, shimmer: 0.35,
      breath: 0.1, breathHighpassHz: 400,
      patternShape: 'none', patternHz: 1, patternDip: 0, patternCents: 0,
    },
    {
      key: 'synth', label: 'シンセ', face: 'cat', octave: 'mid', transpose: 0,
      sawMix: 0.6, squareMix: 0.4, sourceTilt: 1, attackTau: 0.008, releaseTau: 0.03,
      vowelFront: [380, 950, 3000],
      vowelOpen:  [900, 1750, 3000],
      vowelBack:  [380, 950, 3000],
      formantQ: [4, 6, 6],
      formantGain: [1.0, 0.6, 0], formantGainClosed: [1.0, 0.6, 0],
      lowpassHz: [750, 4500], lowpassGain: [0.5, 0.5],
      mouthLevel: [0.7, 1.0], level: 1.0,
      autoMouth: 0, mouthOpenTau: 0.06, mouthCloseTau: 0.09,
      scoopCents: 0, scoopTau: 0.05, fallCents: 0,
      jitterCents: 0, jitterBandHz: [1, 9], jitterTilt: 1, shimmer: 0,
      breath: 0, breathHighpassHz: 2000,
      patternShape: 'none', patternHz: 1, patternDip: 0, patternCents: 0,
    },
  ],

  // --- 口 (0=閉じ / 1=全開) ---
  mouthParamTau: 0.01,
  vowelTurnTau: 0.06,           // 開く向き/閉じる向きで母音の通り道を切り替える滑らかさ
  vowelTurnEps: 0.0005,         // これ以上口が動いたら向きが変わったとみなす
  vowelResetMouth: 0.15,        // 口がほぼ閉じた状態で鳴き始めたら「み」から始める
  mouthSlideEnabled: true,      // 弾きながら横にずらすと口が開く
  mouthSlideRangePx: 110,       // 不感帯の外側、この距離で全開

  // --- 顔の描画 (SVG viewBox 単位) ---
  // mouthOffsetY: 顔の中心から口までの距離 / mouthOpenDown: 全開時の下あごの下がり
  // mouthWidenW: 開くと口幅が広がる割合
  faces: {
    cat:   { mouthOffsetY: 24, mouthHalfW: 15, mouthOpenDown: 70, mouthWidenW: 0.25 },
    sheep: { mouthOffsetY: 34, mouthHalfW: 14, mouthOpenDown: 56, mouthWidenW: 0.2 },
    cow:   { mouthOffsetY: 43, mouthHalfW: 16, mouthOpenDown: 36, mouthWidenW: 0.25 },
  },
  mouthFadeIn: 0.12,            // この開きまでに口の中が見えてくる（閉じ時は口の線だけ）
  eyeSquint: 0.6,               // 全開で目が細くなる割合
  headSqueezeX: 0.03, headSqueezeY: 0.04,
  blushMaxOpacity: 0.6,

  // --- ガイド ---
  guideLabels: 'doremi',        // 'doremi' | 'abc'
  guideLabelX: 114,

  storageKey: 'nobineko.settings.v1',
};

// ============================================================
// 純ロジック（Node からもテスト可能）
// ============================================================
const NOTE_ABC    = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_DOREMI = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
const IS_NATURAL  = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpExp = (a, b, t) => a * Math.pow(b / a, t);   // 周波数は対数補間
const midiToHz = (midi) => CONFIG.a4Hz * Math.pow(2, (midi - 69) / 12);

// おなか上の位置 t (0=上端 … 1=下端) -> MIDI（連続値。snap で半音に吸着）
function posToMidi(t, baseMidi, snap) {
  const u = CONFIG.lowAtTop ? clamp01(t) : 1 - clamp01(t);
  const midi = baseMidi + u * CONFIG.stemSemitones;
  return snap ? Math.round(midi) : midi;
}

function midiToPos(midi, baseMidi) {
  const u = clamp01((midi - baseMidi) / CONFIG.stemSemitones);
  return CONFIG.lowAtTop ? u : 1 - u;
}

function describeMidi(midi) {
  const n = Math.round(midi);
  const pc = ((n % 12) + 12) % 12;
  const oct = Math.floor(n / 12) - 1;
  return {
    n, pc, oct,
    cents: Math.round((midi - n) * 100) || 0,   // -0 を 0 に
    abc: NOTE_ABC[pc] + oct,
    doremi: NOTE_DOREMI[pc] + oct,
  };
}

// おなかの中心からの横ずれ(px) -> 口の開き
function slideToMouth(dxPx, deadPx, rangePx) {
  return clamp01((Math.abs(dxPx) - deadPx) / rangePx);
}

function findVoice(key) {
  return CONFIG.voices.find((v) => v.key === key)
    || CONFIG.voices.find((v) => v.key === CONFIG.voiceDefault);
}

// back: 0=口を開けていく途中（Front 側）/ 1=閉じていく途中（Back 側）
function mouthParams(m, back, voice) {
  const t = clamp01(m), b = clamp01(back);
  return {
    f: voice.vowelOpen.map((open, i) =>
      lerpExp(lerpExp(voice.vowelFront[i], voice.vowelBack[i], b), open, t)),
    g: voice.formantGain.map((open, i) => lerp(voice.formantGainClosed[i], open, t)),
    lp: lerpExp(voice.lowpassHz[0], voice.lowpassHz[1], t),
    lpGain: lerp(voice.lowpassGain[0], voice.lowpassGain[1], t),
    level: lerp(voice.mouthLevel[0], voice.mouthLevel[1], t) * voice.level,
  };
}

// ローパスのカットオフ: 口の開きで決まる値と、音程追従の下限の高い方
function lowpassCutoff(m, hz, voice) {
  return Math.max(mouthParams(m, 0, voice).lp, hz * CONFIG.lowpassKeyTrack);
}

// 口の動き dm（1フレームぶん）から、母音の通り道 back を更新
function nextVowelBack(back, dm, dtSec) {
  if (Math.abs(dm) < CONFIG.vowelTurnEps) return back;
  return smoothToward(back, dm > 0 ? 0 : 1, dtSec, CONFIG.vowelTurnTau);
}

// 声のふるえ用の乱数カーブ（-1..1、つなぎ目なくループする）。bandHz が速いほどざらついた声になる
function makeJitterCurve(length, seconds, bandHz, tilt, rand) {
  const out = new Float32Array(length);
  const kMin = Math.max(1, Math.ceil(bandHz[0] * seconds)), kMax = Math.floor(bandHz[1] * seconds);
  for (let k = kMin; k <= kMax; k++) {
    const phase = rand() * 2 * Math.PI, amp = Math.pow(k, -tilt), w = (2 * Math.PI * k) / length;
    // amp * sin(w*i + phase) を回転で1点ずつ進める（1点ごとに Math.sin を呼ぶより速い）
    const cw = Math.cos(w), sw = Math.sin(w);
    let sn = amp * Math.sin(phase), cs = amp * Math.cos(phase);
    for (let i = 0; i < length; i++) {
      out[i] += sn;
      const next = sn * cw + cs * sw;
      cs = cs * cw - sn * sw;
      sn = next;
    }
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  for (let i = 0; i < length; i++) out[i] /= peak || 1;
  return out;
}

function smoothToward(cur, target, dtSec, tauSec) {
  return cur + (target - cur) * (1 - Math.exp(-dtSec / tauSec));
}

function mouthPath(cx, my, m, look) {
  const t = clamp01(m);
  const w = look.mouthHalfW * (1 + look.mouthWidenW * t);
  const down = my + look.mouthOpenDown * t;
  const f = (v) => v.toFixed(1);
  return `M${f(cx - w)} ${f(my)} Q${f(cx)} ${f(my)} ${f(cx + w)} ${f(my)} Q${f(cx)} ${f(down)} ${f(cx - w)} ${f(my)} Z`;
}

// 音源の波形（倍音 n の強さ = (2/π) n^-tilt、位相はのこぎり波と同じ）。PeriodicWave 用の係数を返す。
// 正規化なしで使うので、倍音の本数を変えても音量が変わらない。tilt=1 は理想の のこぎり波（振幅 ±1）で、
// ブラウザ標準の のこぎり波（ピークが 1 になるよう縮めてある）より約1.4dB 大きい
function makeSourceWave(tilt, harmonics) {
  const real = new Float32Array(harmonics + 1), imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) imag[n] = (n % 2 ? 1 : -1) * (2 / Math.PI) * Math.pow(n, -tilt);
  return { real, imag };
}

// 出力の安全弁（WaveShaper 用）。入力 -1..1 を points 個に刻む。
// knee までは入力そのまま、そこから先は tanh で丸め、入力がどれだけ大きくても出力は 1.0 未満
function makeLimiterCurve(knee, points) {
  const out = new Float32Array(points), room = 1 - knee;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1, a = Math.abs(x);
    out[i] = Math.sign(x) * (a <= knee ? a : knee + room * Math.tanh((a - knee) / room));
  }
  return out;
}

// ループするカーブを、長さ outLength に直線補間で引き伸ばす（最後の点は最初の点につながる）
function stretchLoop(curve, outLength) {
  const out = new Float32Array(outLength), n = curve.length;
  for (let i = 0; i < outLength; i++) {
    const x = (i * n) / outLength, k = Math.floor(x), t = x - k;
    out[i] = curve[k] * (1 - t) + curve[(k + 1) % n] * t;
  }
  return out;
}

// 種から決まる乱数（0..1）。同じ種なら同じ並びになる
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 規則的な震えの1周期ぶん。値は「谷の深さ」0..1（0=そのまま、1=無音）。パターンなしは null
function makePattern(voice, rate) {
  if (voice.patternShape !== 'sine') return null;
  const n = Math.max(2, Math.round(rate / voice.patternHz));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = voice.patternDip * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG, clamp01, midiToHz, posToMidi, midiToPos, describeMidi,
    slideToMouth, findVoice, mouthParams, lowpassCutoff, nextVowelBack, makeJitterCurve, makeSourceWave,
    stretchLoop, seededRandom, makeLimiterCurve,
    smoothToward, mouthPath, makePattern,
  };
}

// ============================================================
// オーディオ
// ============================================================
function createAudio(volume, initialVoice) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC({ latencyHint: 'interactive' });
  let voice = initialVoice;

  const gainNode = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filter = (type, hz, q) => {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = hz; f.Q.value = q;
    return f;
  };
  const osc = (type, hz) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = hz;
    return o;
  };

  // 音源: のこぎり波（sourceTilt が 1 以外なら倍音の減り方を変えた波形）+ 矩形波 + 息ノイズ
  const saw = osc('sawtooth', CONFIG.a4Hz), sq = osc('square', CONFIG.a4Hz);
  const waves = new Map();
  const loadSource = () => {
    if (voice.sourceTilt === 1) { saw.type = 'sawtooth'; return; }
    if (!waves.has(voice.sourceTilt)) {
      const w = makeSourceWave(voice.sourceTilt, CONFIG.sourceHarmonics);
      waves.set(voice.sourceTilt, ctx.createPeriodicWave(w.real, w.imag, { disableNormalization: true }));
    }
    saw.setPeriodicWave(waves.get(voice.sourceTilt));
  };
  loadSource();
  const sawG = gainNode(voice.sawMix), sqG = gainNode(voice.squareMix);
  const vca = gainNode(0);
  saw.connect(sawG).connect(vca);
  sq.connect(sqG).connect(vca);

  const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * CONFIG.noiseSeconds), ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf; noise.loop = true;
  const breathG = gainNode(voice.breath);
  const breathHp = filter('highpass', voice.breathHighpassHz, CONFIG.lowpassQ);
  noise.connect(breathHp).connect(breathG).connect(vca);

  // 声のふるえ: 同じ乱数カーブを、音程用と音量用でずらして再生する
  const jitterG = gainNode(voice.jitterCents), shimmerG = gainNode(voice.shimmer);
  jitterG.connect(saw.detune);
  jitterG.connect(sq.detune);
  let jitterSrcs = [], jitterBand = '';
  const jitterBufs = new Map();
  // 先にカーブを用意してから、鳴っている音源を差し替える（計算中に半分だけ切り替わった音が鳴らないように）
  const loadJitter = () => {
    const band = [...voice.jitterBandHz, voice.jitterTilt].join();
    if (jitterBand === band) return;
    if (!jitterBufs.has(band)) {
      const curve = makeJitterCurve(CONFIG.jitterCurveRate * CONFIG.jitterSeconds, CONFIG.jitterSeconds,
        voice.jitterBandHz, voice.jitterTilt, seededRandom(CONFIG.jitterSeed));
      const len = CONFIG.jitterBufferRate * CONFIG.jitterSeconds;
      const made = ctx.createBuffer(1, len, CONFIG.jitterBufferRate);
      made.getChannelData(0).set(stretchLoop(curve, len));
      jitterBufs.set(band, made);
    }
    jitterBand = band;
    for (const src of jitterSrcs) { src.stop(); src.disconnect(); }
    jitterSrcs = [jitterG, shimmerG].map((dest, i) => {
      const src = ctx.createBufferSource();
      src.buffer = jitterBufs.get(band); src.loop = true;
      src.connect(dest);
      src.start(0, i * CONFIG.shimmerLoopOffset * CONFIG.jitterSeconds);
      return src;
    });
  };
  loadJitter();

  // 口（共鳴の山 + 基音を通すローパス）。山の本数は声ごとに違うので、最大本数ぶん用意して余りは無音にする
  const p0 = mouthParams(0, 0, voice);
  const maxFormants = Math.max(...CONFIG.voices.map((v) => v.vowelOpen.length));
  const bps = [], bpGs = [];
  const lp = filter('lowpass', p0.lp, CONFIG.lowpassQ);
  const gl = gainNode(p0.lpGain);
  const mix = gainNode(p0.level);
  for (let i = 0; i < maxFormants; i++) {
    const used = i < p0.f.length;
    bps.push(filter('bandpass', used ? p0.f[i] : CONFIG.a4Hz, used ? voice.formantQ[i] : CONFIG.idleFormantQ));
    bpGs.push(gainNode(used ? p0.g[i] : 0));
    vca.connect(bps[i]).connect(bpGs[i]).connect(mix);
  }
  vca.connect(lp).connect(gl).connect(mix);

  // 規則的な震え: 音量 = 1 - 谷、音程 = -patternCents × 谷
  const am = gainNode(1);
  shimmerG.connect(am.gain);
  const patAm = gainNode(-1), patDetune = gainNode(-voice.patternCents);
  patAm.connect(am.gain);
  patDetune.connect(saw.detune);
  patDetune.connect(sq.detune);
  let patternBuf = null, patternSrc = null;
  const loadPattern = () => {
    const curve = makePattern(voice, CONFIG.patternBufferRate);
    patternBuf = curve && ctx.createBuffer(1, curve.length, CONFIG.patternBufferRate);
    if (patternBuf) patternBuf.getChannelData(0).set(curve);
  };
  // 鳴き始めをパターンの頭（谷のない位置）にそろえる
  const restartPattern = (now) => {
    if (patternSrc) { patternSrc.stop(now); patternSrc.disconnect(); patternSrc = null; }
    if (!patternBuf) return;
    patternSrc = ctx.createBufferSource();
    patternSrc.buffer = patternBuf; patternSrc.loop = true;
    patternSrc.connect(patAm);
    patternSrc.connect(patDetune);
    patternSrc.start(now);
  };
  loadPattern();

  const master = gainNode(volume);
  const comp = ctx.createDynamicsCompressor();
  const limiter = ctx.createWaveShaper();
  limiter.curve = makeLimiterCurve(CONFIG.limiterKnee, CONFIG.limiterPoints);
  mix.connect(am).connect(master).connect(comp).connect(limiter).connect(ctx.destination);

  for (const n of [saw, sq, noise]) n.start();

  const oscs = [saw, sq];
  let curHz = 0, curMouth = 0, curBack = 0;
  const trackLowpass = (now) =>
    lp.frequency.setTargetAtTime(lowpassCutoff(curMouth, curHz, voice), now, CONFIG.mouthParamTau);
  const applyMouth = (now) => {
    const p = mouthParams(curMouth, curBack, voice), tau = CONFIG.mouthParamTau;
    bps.forEach((bp, i) => {
      if (i < p.f.length) bp.frequency.setTargetAtTime(p.f[i], now, tau);
      bpGs[i].gain.setTargetAtTime(i < p.g.length ? p.g[i] : 0, now, tau);
    });
    trackLowpass(now);
    gl.gain.setTargetAtTime(p.lpGain, now, tau);
    mix.gain.setTargetAtTime(p.level, now, tau);
  };
  return {
    ctx,
    noteOn(hz) {
      const now = ctx.currentTime;
      curHz = hz;
      for (const o of oscs) {
        o.frequency.setValueAtTime(hz, now);
        o.detune.setValueAtTime(-voice.scoopCents, now);
        o.detune.setTargetAtTime(0, now, voice.scoopTau);
      }
      trackLowpass(now);
      restartPattern(now);
      vca.gain.setTargetAtTime(CONFIG.voiceGain, now, voice.attackTau);
    },
    glide(hz, tau) {
      const now = ctx.currentTime;
      curHz = hz;
      for (const o of oscs) o.frequency.setTargetAtTime(hz, now, tau);
      trackLowpass(now);
    },
    noteOff() {
      const now = ctx.currentTime;
      vca.gain.setTargetAtTime(0, now, voice.releaseTau);
      for (const o of oscs) o.detune.setTargetAtTime(-voice.fallCents, now, voice.releaseTau * 2);
    },
    setMouth(m, back) {
      curMouth = m; curBack = back;
      applyMouth(ctx.currentTime);
    },
    setVoice(v) {
      const now = ctx.currentTime;
      const set = (param, value) => param.setTargetAtTime(value, now, CONFIG.voiceParamTau);
      voice = v;
      loadJitter();
      loadPattern();
      loadSource();
      set(sawG.gain, v.sawMix); set(sqG.gain, v.squareMix);
      set(breathG.gain, v.breath); set(breathHp.frequency, v.breathHighpassHz);
      bps.forEach((bp, i) => { if (i < v.formantQ.length) set(bp.Q, v.formantQ[i]); });
      set(jitterG.gain, v.jitterCents); set(shimmerG.gain, v.shimmer);
      set(patDetune.gain, -v.patternCents);
      restartPattern(now);
      applyMouth(now);
    },
    setVolume(v) {
      master.gain.setTargetAtTime(v, ctx.currentTime, CONFIG.volumeTau);
    },
    resume() {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
    },
  };
}

// ============================================================
// UI
// ============================================================
function initApp() {
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = {
    svg: $('animal'), ribbon: $('ribbon'), marks: $('ribbonMarks'), guide: $('guide'),
    dot: $('touchDot'), head: $('head'),
    stemHit: $('stemHit'), headHit: $('headHit'),
    roName: $('roName'), roSub: $('roSub'),
    voice: $('voice'), octaveSeg: $('octaveSeg'), guideBtn: $('guideBtn'), snapBtn: $('snapBtn'), volume: $('volume'),
    overlay: $('startOverlay'), startBtn: $('startBtn'), startMsg: $('startMsg'),
    app: $('app'), fullBtn: $('fullBtn'),
    debug: $('debug'),
  };

  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

  const loadSettings = () => {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {}; } catch (e) { return {}; }
  };
  const saved = loadSettings();
  const savedVoiceOk = CONFIG.voices.some((v) => v.key === saved.voice);
  const savedOctaveOk = CONFIG.octaves.some((o) => o.key === saved.octave);
  const state = {
    voice: findVoice(saved.voice).key,
    // 保存された動物がもう無い時は、音域も代わりの動物のものにする
    octave: savedVoiceOk && savedOctaveOk ? saved.octave : findVoice(saved.voice).octave,
    guide: typeof saved.guide === 'boolean' ? saved.guide : true,
    snap: typeof saved.snap === 'boolean' ? saved.snap : false,
    volume: typeof saved.volume === 'number' ? clamp01(saved.volume) : CONFIG.volumeDefault,
    full: saved.full === true,    // 文字と操作部をしまって、どうぶつを画面いっぱいにする
    mouth: 0,                     // 平滑化済みの口の開き
    vowelBack: 0,                 // 母音の通り道 (0=開く向き / 1=閉じる向き)
    slide: 0,                     // 横スライド由来の開き
    spaceHeld: false,
    headPointers: new Set(),
    stemPointers: new Map(),      // pointerId -> {x, y}（後勝ちモノフォニック）
    activeId: null,
    midi: null,                   // 発音中の MIDI（連続値）、無音は null
  };
  const saveSettings = () => {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        voice: state.voice, octave: state.octave, guide: state.guide, snap: state.snap, volume: state.volume,
        full: state.full,
      }));
    } catch (e) { /* private mode 等では保存しない */ }
  };

  const rib = {
    x: el.ribbon.x.baseVal.value, y: el.ribbon.y.baseVal.value,
    w: el.ribbon.width.baseVal.value, h: el.ribbon.height.baseVal.value,
  };
  const head = { cx: el.headHit.cx.baseVal.value, cy: el.headHit.cy.baseVal.value };

  // 動物ごとの見た目: data-for が一致する部品だけ表示し、顔の可動部品を拾い直す
  let face = null;
  function applyLook() {
    const key = findVoice(state.voice).face;
    el.svg.dataset.animal = key;
    for (const part of el.svg.querySelectorAll('[data-for]')) {
      part.style.display = part.dataset.for === key ? '' : 'none';
    }
    const group = el.svg.querySelector(`.face[data-for="${key}"]`);
    const role = (name) => group.querySelector(`[data-role="${name}"]`);
    face = {
      look: CONFIG.faces[key],
      mouth: role('mouth'),
      eyes: [role('eyeL'), role('eyeR')].filter(Boolean),
      blush: [role('blushL'), role('blushR')].filter(Boolean),
    };
    for (const eye of face.eyes) {
      if (!eye.dataset.ry) eye.dataset.ry = eye.getAttribute('ry');
    }
    drawnMouth = -1;
  }
  const baseMidi = () =>
    CONFIG.octaves.find((o) => o.key === state.octave).baseMidi + findVoice(state.voice).transpose;

  let audio = null;
  let drawnMouth = -1;

  // ---------- ガイド ----------
  function renderGuide() {
    el.guide.textContent = '';
    el.marks.textContent = '';
    el.svg.classList.toggle('guide-off', !state.guide);
    const names = CONFIG.guideLabels === 'abc' ? NOTE_ABC : NOTE_DOREMI;
    const base = baseMidi();
    for (let i = 0; i <= CONFIG.stemSemitones; i++) {
      const midi = base + i;
      const pc = midi % 12;
      const y = rib.y + midiToPos(midi, base) * rib.h;
      const isC = pc === 0;
      const line = document.createElementNS(SVG_NS, 'line');
      const inset = IS_NATURAL[pc] ? 0 : rib.w * 0.3;
      line.setAttribute('x1', rib.x + inset);
      line.setAttribute('x2', rib.x + rib.w - inset);
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('class', 'mark' + (isC ? ' mark-c' : IS_NATURAL[pc] ? '' : ' mark-sharp'));
      el.marks.appendChild(line);
      if (!IS_NATURAL[pc]) continue;
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', CONFIG.guideLabelX);
      text.setAttribute('y', y);
      text.setAttribute('class', 'guide-label' + (isC ? ' guide-c' : ''));
      text.textContent = isC ? names[pc] + (Math.floor(midi / 12) - 1) : names[pc];
      el.guide.appendChild(text);
    }
  }

  // ---------- コントロール ----------
  function renderControls() {
    for (const b of el.octaveSeg.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(b.dataset.key === state.octave));
    }
    el.guideBtn.setAttribute('aria-pressed', String(state.guide));
    el.guideBtn.querySelector('.tg-state').textContent = state.guide ? 'ON' : 'OFF';
    el.snapBtn.setAttribute('aria-pressed', String(state.snap));
    el.snapBtn.querySelector('.tg-state').textContent = state.snap ? 'ON' : 'OFF';
    el.volume.value = String(Math.round(state.volume * 100));
    el.voice.value = state.voice;
    el.app.classList.toggle('full', state.full);
    el.fullBtn.setAttribute('aria-pressed', String(state.full));   // ラベルは固定（HTML）。状態は押されているかどうかで伝える
  }

  // 文字と操作部をしまう／もどす。画面の大きさが変わるので、鳴っている音は止める
  function setFull(on) {
    if (state.full === on) return;
    allOff();
    state.full = on;
    saveSettings(); renderControls();
  }

  function setOctave(key) {
    if (!CONFIG.octaves.some((o) => o.key === key)) return;
    state.octave = key;
    saveSettings(); renderControls(); renderGuide();
    updatePitch(true);
  }

  for (const v of CONFIG.voices) {
    const opt = document.createElement('option');
    opt.value = v.key; opt.textContent = v.label;
    el.voice.appendChild(opt);
  }
  el.voice.addEventListener('change', () => {
    const v = findVoice(el.voice.value);
    state.voice = v.key;
    state.octave = v.octave;
    if (audio) audio.setVoice(v);
    applyLook();
    saveSettings(); renderControls(); renderGuide();
    updatePitch(false);
  });

  for (const o of CONFIG.octaves) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.key = o.key; b.textContent = o.label;
    b.addEventListener('click', () => setOctave(o.key));
    el.octaveSeg.appendChild(b);
  }
  el.guideBtn.addEventListener('click', () => {
    state.guide = !state.guide; saveSettings(); renderControls(); renderGuide();
  });
  el.snapBtn.addEventListener('click', () => {
    state.snap = !state.snap; saveSettings(); renderControls(); updatePitch(false);
  });
  el.fullBtn.addEventListener('click', (e) => {
    setFull(!state.full);
    if (e.detail > 0) el.fullBtn.blur();   // マウスで押した時はフォーカスを残さない（あとでキーを押すと枠が出たままになる）
  });
  // タッチでは、ほかの指が画面に乗っている間は click が来ない（Chrome）。ボタンの上で指を離した時に切り替え、あとの click は出さない
  el.fullBtn.addEventListener('touchend', (e) => {
    if (!e.cancelable) return;
    e.preventDefault();
    const t = e.changedTouches[0], r = el.fullBtn.getBoundingClientRect();
    if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) setFull(!state.full);
  });
  el.volume.addEventListener('input', () => {
    state.volume = clamp01(Number(el.volume.value) / 100);
    if (audio) audio.setVolume(state.volume);
    saveSettings();
  });

  // ---------- おなか（ピッチ） ----------
  function updatePitch(immediate) {
    const p = state.stemPointers.get(state.activeId);
    if (!p) return;
    const r = el.ribbon.getBoundingClientRect();
    if (!r.height) return;
    state.midi = posToMidi((p.y - r.top) / r.height, baseMidi(), state.snap);
    if (CONFIG.mouthSlideEnabled) {
      const dead = el.stemHit.getBoundingClientRect().width / 2;
      state.slide = slideToMouth(p.x - (r.left + r.width / 2), dead, CONFIG.mouthSlideRangePx);
    }
    if (!audio) return;
    const hz = midiToHz(state.midi);
    if (immediate) audio.noteOn(hz);
    else audio.glide(hz, state.snap ? CONFIG.snapGlideTau : CONFIG.glideTau);
  }

  function releaseStem(id) {
    if (!state.stemPointers.delete(id)) return;
    if (state.activeId !== id) return;
    const rest = [...state.stemPointers.keys()];
    if (rest.length) {
      state.activeId = rest[rest.length - 1];
      updatePitch(false);
    } else {
      state.activeId = null; state.midi = null; state.slide = 0;
      if (audio) audio.noteOff();
    }
  }

  function capture(target, id) {
    try { target.setPointerCapture(id); } catch (e) { /* 既に離れている */ }
  }

  el.stemHit.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (audio) audio.resume();
    capture(el.stemHit, e.pointerId);
    state.stemPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    state.activeId = e.pointerId;
    if (state.mouth < CONFIG.vowelResetMouth) state.vowelBack = 0;
    updatePitch(true);
  });
  el.stemHit.addEventListener('pointermove', (e) => {
    const p = state.stemPointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (e.pointerId === state.activeId) updatePitch(false);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    el.stemHit.addEventListener(type, (e) => releaseStem(e.pointerId));
  }

  // ---------- 顔（口パク） ----------
  el.headHit.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (audio) audio.resume();
    capture(el.headHit, e.pointerId);
    state.headPointers.add(e.pointerId);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    el.headHit.addEventListener(type, (e) => state.headPointers.delete(e.pointerId));
  }

  // なでている間は声ごとの autoMouth まで自動で開き、顔・Space・横ずらしでさらに開く
  const mouthTarget = () => {
    const manual = (state.headPointers.size || state.spaceHeld) ? 1 : state.slide;
    const auto = state.midi != null ? findVoice(state.voice).autoMouth : 0;
    return Math.max(manual, auto);
  };

  // ---------- キーボード ----------
  // Space は Tab でフォーカスを移したコントロール上では通常どおり（ボタン操作）に譲る。
  // :focus-visible は使えない: select はマウスで選んだ後も真になり、Space が口に届かなくなる
  let keyboardNav = false;
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') keyboardNav = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardNav = false; }, true);
  const yieldsToControl = (t) =>
    keyboardNav && t instanceof Element && t.matches('button, input, select, textarea');

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!el.overlay.hidden) return;
    if (e.code === 'Space') {
      if (yieldsToControl(e.target)) return;
      e.preventDefault();
      state.spaceHeld = true;
      return;
    }
    const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (idx >= 0 && CONFIG.octaves[idx] && !e.repeat) setOctave(CONFIG.octaves[idx].key);
    // F で文字をしまう／もどす、Esc でもどす（入力中のコントロールでは効かせない）
    const typing = yieldsToControl(e.target) && e.target.matches('input, select, textarea');   // Tab で選んだ時だけ譲る
    if (e.code === 'KeyF' && !e.repeat && !typing) setFull(!state.full);
    if (e.code === 'Escape' && state.full) setFull(false);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    if (state.spaceHeld) e.preventDefault();   // マウスでフォーカスしたボタンの誤作動を防ぐ
    state.spaceHeld = false;
  });

  function allOff() {
    state.stemPointers.clear(); state.headPointers.clear();
    state.activeId = null; state.midi = null; state.slide = 0; state.spaceHeld = false;
    if (audio) audio.noteOff();
  }
  window.addEventListener('blur', allOff);
  document.addEventListener('visibilitychange', () => { if (document.hidden) allOff(); });
  el.svg.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- 描画ループ ----------
  let lastTs = 0, sentMouth = -1, sentBack = -1, drawnReadout = '';

  function renderFace() {
    if (Math.abs(state.mouth - drawnMouth) < 0.001) return;
    drawnMouth = state.mouth;
    const m = state.mouth;
    face.mouth.setAttribute('d', mouthPath(head.cx, head.cy + face.look.mouthOffsetY, m, face.look));
    face.mouth.setAttribute('opacity', clamp01(m / CONFIG.mouthFadeIn).toFixed(3));
    for (const eye of face.eyes) {
      eye.setAttribute('ry', (Number(eye.dataset.ry) * (1 - CONFIG.eyeSquint * m)).toFixed(2));
    }
    const sx = 1 - CONFIG.headSqueezeX * m, sy = 1 + CONFIG.headSqueezeY * m;
    el.head.setAttribute('transform',
      `translate(${head.cx} ${head.cy}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-head.cx} ${-head.cy})`);
    for (const b of face.blush) b.setAttribute('opacity', (CONFIG.blushMaxOpacity * m).toFixed(3));
  }

  function renderReadout() {
    if (state.midi == null) {
      if (drawnReadout === '') return;
      drawnReadout = '';
      el.roName.textContent = '—';
      el.roSub.textContent = 'おなかをタッチ';
      el.dot.setAttribute('visibility', 'hidden');
      return;
    }
    const d = describeMidi(state.midi);
    const inTune = Math.abs(d.cents) <= CONFIG.inTuneCents;
    const sign = d.cents > 0 ? '+' : d.cents < 0 ? '−' : '±';
    const sub = `${d.abc} ${sign}${Math.abs(d.cents)}¢${inTune ? ' ぴったり' : ''}`;
    const y = rib.y + midiToPos(state.midi, baseMidi()) * rib.h;
    el.dot.setAttribute('cy', y.toFixed(1));
    el.dot.setAttribute('visibility', 'visible');
    el.dot.classList.toggle('intune', inTune);
    const key = d.doremi + sub;
    if (key === drawnReadout) return;
    drawnReadout = key;
    el.roName.textContent = d.doremi;
    el.roSub.textContent = sub;
  }

  function renderDebug() {
    if (!DEBUG) return;
    el.debug.textContent = [
      `ctx: ${audio ? audio.ctx.state : 'none'} / voice: ${state.voice}`,
      `midi: ${state.midi == null ? '-' : state.midi.toFixed(2)}`,
      `hz: ${state.midi == null ? '-' : midiToHz(state.midi).toFixed(1)}`,
      `mouth: ${state.mouth.toFixed(2)} (target ${mouthTarget().toFixed(2)}, slide ${state.slide.toFixed(2)}, back ${state.vowelBack.toFixed(2)})`,
      `pointers: stem ${state.stemPointers.size} / head ${state.headPointers.size}`,
    ].join('\n');
  }

  function frame(ts) {
    const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    const target = mouthTarget();
    const voice = findVoice(state.voice);
    const tau = target > state.mouth ? voice.mouthOpenTau : voice.mouthCloseTau;
    const prevMouth = state.mouth;
    state.mouth = smoothToward(state.mouth, target, dt, tau);
    if (Math.abs(state.mouth - target) < 0.001) state.mouth = target;
    state.vowelBack = nextVowelBack(state.vowelBack, state.mouth - prevMouth, dt);
    if (audio && (Math.abs(state.mouth - sentMouth) >= 0.002 || Math.abs(state.vowelBack - sentBack) >= 0.01)) {
      sentMouth = state.mouth; sentBack = state.vowelBack;
      audio.setMouth(state.mouth, state.vowelBack);
    }
    renderFace(); renderReadout(); renderDebug();
    requestAnimationFrame(frame);
  }

  // ---------- 開始 ----------
  el.startBtn.addEventListener('click', () => {
    if (!audio) audio = createAudio(state.volume, findVoice(state.voice));
    if (!audio) {
      el.startMsg.textContent = 'このブラウザは Web Audio に対応していないため音が出ません。';
      return;
    }
    audio.resume();
    el.overlay.hidden = true;
  });

  if (DEBUG) el.debug.hidden = false;
  applyLook();
  renderControls();
  renderGuide();
  renderFace();
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
  else initApp();
}
