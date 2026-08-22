// example: https://github.com/rgov/js-theora-decoder/blob/main/index.html
// https://github.com/brion/ogv.js/releases, yarn add has no simd
// dev: copy decoder files from node/ogv/dist/* to project dir
// dist: .... to dist
/*
  OGVDemuxerOggW: 'ogv-demuxer-ogg-wasm.js',
  OGVDemuxerWebMW: 'ogv-demuxer-webm-wasm.js',
  OGVDecoderAudioOpusW: 'ogv-decoder-audio-opus-wasm.js',
  OGVDecoderAudioVorbisW: 'ogv-decoder-audio-vorbis-wasm.js',
  OGVDecoderVideoTheoraW: 'ogv-decoder-video-theora-wasm.js',
  OGVDecoderVideoVP8W: 'ogv-decoder-video-vp8-wasm.js',
  OGVDecoderVideoVP8MTW: 'ogv-decoder-video-vp8-mt-wasm.js',
  OGVDecoderVideoVP9W: 'ogv-decoder-video-vp9-wasm.js',
  OGVDecoderVideoVP9SIMDW: 'ogv-decoder-video-vp9-simd-wasm.js',
  OGVDecoderVideoVP9MTW: 'ogv-decoder-video-vp9-mt-wasm.js',
  OGVDecoderVideoVP9SIMDMTW: 'ogv-decoder-video-vp9-simd-mt-wasm.js',
  OGVDecoderVideoAV1W: 'ogv-decoder-video-av1-wasm.js',
  OGVDecoderVideoAV1SIMDW: 'ogv-decoder-video-av1-simd-wasm.js',
  OGVDecoderVideoAV1MTW: 'ogv-decoder-video-av1-mt-wasm.js',
  OGVDecoderVideoAV1SIMDMTW: 'ogv-decoder-video-av1-simd-mt-wasm.js',
*/
import { simd } from "wasm-feature-detect";

export async function loadVp9(callback, onError) {
  if (!window.OGVLoader) {
    const err = new Error("OGVLoader not available");
    if (onError) onError(err);
    else console.error(err);
    return;
  }
  try {
    const isSIMD = await simd();
    console.log('isSIMD: ' + isSIMD);
    window.OGVLoader.loadClass(
      isSIMD ? "OGVDecoderVideoVP9SIMDW" : "OGVDecoderVideoVP9W",
      (videoCodecClass) => {
        window.videoCodecClass = videoCodecClass;
        videoCodecClass({ videoFormat: {} }).then((decoder) => {
          decoder.init(() => {
            callback(decoder);
          })
        }).catch((err) => {
          if (onError) onError(err);
          else console.error("VP9 decoder init failed:", err);
        });
      },
      { worker: true, threading: true }
    );
  } catch (err) {
    if (onError) onError(err);
    else console.error("VP9 load failed:", err);
  }
}