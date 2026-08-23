
var dec;
self.addEventListener('message', (e) => {
  if (e.data.channels > 0) {
    if (dec) dec.destroy();
    dec = new Decoder(e.data.channels, e.data.sampleRate);
  } else {
    if (!dec) return;
    dec.input(e.data);
    self.postMessage(dec.output().slice(0));
  }
});
