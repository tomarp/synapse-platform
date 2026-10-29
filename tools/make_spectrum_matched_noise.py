"""Make a loopable noise signal with the same long-term spectrum and level as a recording.

Used for the two SYNAPSE soundscapes, whose original recordings cannot be redistributed: the substitute keeps the
long-term average spectrum (1/8192-band resolution), the per-channel RMS level and the interaural level difference
of the original, but none of its content (speech, events, temporal structure). It is stationary noise and is not
a perceptual equivalent of the original.

    python3 tools/make_spectrum_matched_noise.py original.wav media/audio/out.wav --seconds 45 --seed 1

Needs numpy, scipy, soundfile. The output loops without a click (generated circularly in the frequency domain).
"""
from __future__ import annotations

import argparse

import numpy as np
import soundfile as sf
from scipy import signal


def matched_noise(x: np.ndarray, fs: int, seconds: float, seed: int) -> np.ndarray:
    n = int(round(seconds * fs))
    rng = np.random.default_rng(seed)
    out = np.empty((n, x.shape[1]))
    freqs = np.fft.rfftfreq(n, 1 / fs)
    for ch in range(x.shape[1]):
        f, pxx = signal.welch(x[:, ch], fs=fs, nperseg=8192)
        mag = np.sqrt(np.interp(freqs, f, pxx))
        spec = mag * np.exp(2j * np.pi * rng.random(len(freqs)))
        spec[0] = 0
        y = np.fft.irfft(spec, n)
        out[:, ch] = y * np.sqrt(np.mean(x[:, ch] ** 2)) / np.sqrt(np.mean(y ** 2))
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source")
    ap.add_argument("out")
    ap.add_argument("--seconds", type=float, default=45)
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    x, fs = sf.read(a.source, always_2d=True)
    y = matched_noise(x, fs, a.seconds, a.seed)
    peak = np.max(np.abs(y))
    if peak >= 1:
        raise SystemExit(f"output would clip (peak {peak:.2f})")
    sf.write(a.out, y, fs, subtype="PCM_16")
    rms = lambda v: 20 * np.log10(np.sqrt(np.mean(v ** 2)))          # noqa: E731
    print(f"{a.out}: {a.seconds:g} s, {fs} Hz, {x.shape[1]} ch; level {rms(y):.1f} dBFS (source {rms(x):.1f} dBFS)")


if __name__ == "__main__":
    main()
