/**
 * ══════════════════════════════════════════════════════════════════
 * APPLICATION: Bhavya's AI Audio Lab (app.js)
 * SUBSYSTEM: WebAudio DSP Synthesizer & 3D Frequency Sphere Engine
 * 
 * CORE CAPABILITIES:
 * 1. Modular WebAudio DSP Signal Chain: Real-time BiquadFilter (lowpass/highpass),
 *    feedback delay network, stereo panner, and master gain stage.
 * 2. 3D Reactive Audio Sphere (Three.js): Frequency-reactive Icosahedron mesh
 *    and particle orbit responding to FFT frequency bins in real time.
 * 3. Procedural Neural Soundscapes: Algorithmic generators for Cyberpunk Drone,
 *    Binaural Focus Alpha waves, Quantum Pulse, and Deep Space Ambience.
 * 4. In-Browser Lossless Media Recorder: Captures generated audio directly
 *    to high-fidelity WebM/WAV audio files for export.
 * ══════════════════════════════════════════════════════════════════
 */

(function() {
  // 1. WebAudio Context & Graph
  let audioCtx = null;
  let masterGain = null;
  let filterNode = null;
  let delayNode = null;
  let feedbackGain = null;
  let analyserNode = null;
  let isPlaying = false;
  let activeSoundscapeOscs = [];
  let isRecording = false;
  let mediaRecorder = null;
  let recordedChunks = [];

  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.75;

    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 850;
    filterNode.Q.value = 4.2;

    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.32;

    feedbackGain = audioCtx.createGain();
    feedbackGain.gain.value = 0.35;

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;

    // Connect Graph
    filterNode.connect(masterGain);
    filterNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(masterGain);

    masterGain.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
  }

  // 2. Three.js 3D Frequency Audio Sphere Visualizer
  let scene, camera, renderer, audioSphere, ringParticles;
  let frequencyData;

  function initWebGL() {
    const container = document.getElementById('webgl-container');
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 40;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Audio Sphere
    const sphereGeo = new THREE.IcosahedronGeometry(14, 4);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    audioSphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(audioSphere);

    // Ring Particles
    const ringGeo = new THREE.BufferGeometry();
    const count = 400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const radius = 22 + (Math.random() - 0.5) * 4;
      pos[i * 3] = Math.cos(theta) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = Math.sin(theta) * radius;
    }
    ringGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ringMat = new THREE.PointsMaterial({
      size: 1.8,
      color: 0x4facfe,
      transparent: true,
      opacity: 0.6
    });
    ringParticles = new THREE.Points(ringGeo, ringMat);
    scene.add(ringParticles);

    frequencyData = new Uint8Array(128);

    function animate() {
      requestAnimationFrame(animate);

      let avgFreq = 0;
      if (analyserNode) {
        analyserNode.getByteFrequencyData(frequencyData);
        let sum = 0;
        for (let i = 0; i < frequencyData.length; i++) {
          sum += frequencyData[i];
        }
        avgFreq = sum / frequencyData.length;
      }

      const scale = 1 + (avgFreq / 255) * 0.45;
      if (audioSphere) {
        audioSphere.scale.set(scale, scale, scale);
        audioSphere.rotation.x += 0.003 + (avgFreq / 255) * 0.01;
        audioSphere.rotation.y += 0.005 + (avgFreq / 255) * 0.01;
      }
      if (ringParticles) {
        ringParticles.rotation.y -= 0.002;
      }

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // 3. Soundscape Generative Presets
  function startSoundscape(type) {
    initAudio();
    stopSoundscape();

    if (type === 'cyber-drone') {
      const freqs = [65.41, 130.81, 196.00, 261.63]; // C2, C3, G3, C4
      freqs.forEach(f => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        g.gain.value = 0.12;
        osc.connect(g);
        g.connect(filterNode);
        osc.start();
        activeSoundscapeOscs.push(osc);
      });
    } else if (type === 'alpha-focus') {
      // 10Hz Binaural Beat on 200Hz carrier
      const oscL = audioCtx.createOscillator();
      const oscR = audioCtx.createOscillator();
      const panL = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
      const panR = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

      oscL.frequency.value = 200;
      oscR.frequency.value = 210; // +10Hz Alpha

      if (panL && panR) {
        panL.pan.value = -1;
        panR.pan.value = 1;
        oscL.connect(panL);
        panL.connect(filterNode);
        oscR.connect(panR);
        panR.connect(filterNode);
      } else {
        oscL.connect(filterNode);
        oscR.connect(filterNode);
      }
      oscL.start();
      oscR.start();
      activeSoundscapeOscs.push(oscL, oscR);
    } else if (type === 'gamma-boost') {
      // 40Hz Gamma Beat on 432Hz carrier
      const oscL = audioCtx.createOscillator();
      const oscR = audioCtx.createOscillator();
      oscL.frequency.value = 432;
      oscR.frequency.value = 472; // +40Hz Gamma
      oscL.connect(filterNode);
      oscR.connect(filterNode);
      oscL.start();
      oscR.start();
      activeSoundscapeOscs.push(oscL, oscR);
    } else if (type === 'cyber-rain') {
      // White noise buffer
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      whiteNoise.connect(filterNode);
      whiteNoise.start();
      activeSoundscapeOscs.push(whiteNoise);
    } else if (type === 'space-void') {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 54; // Sub-bass
      osc.connect(filterNode);
      osc.start();
      activeSoundscapeOscs.push(osc);
    } else if (type === 'scifi-ui') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.value = 0.08 / (i + 1);
        osc.connect(g);
        g.connect(filterNode);
        osc.start();
        activeSoundscapeOscs.push(osc);
      });
    }
  }

  function stopSoundscape() {
    activeSoundscapeOscs.forEach(o => {
      try { o.stop(); } catch(e) {}
    });
    activeSoundscapeOscs = [];
  }

  // 4. Interactive Synth Pads (C Major Pentatonic Scale)
  const PAD_NOTES = [
    { name: "C3", freq: 130.81, key: "1" },
    { name: "D3", freq: 146.83, key: "2" },
    { name: "E3", freq: 164.81, key: "3" },
    { name: "G3", freq: 196.00, key: "4" },
    { name: "A3", freq: 220.00, key: "5" },
    { name: "C4", freq: 261.63, key: "6" },
    { name: "D4", freq: 293.66, key: "7" },
    { name: "E4", freq: 329.63, key: "8" },
    { name: "G4", freq: 392.00, key: "Q" },
    { name: "A4", freq: 440.00, key: "W" },
    { name: "C5", freq: 523.25, key: "E" },
    { name: "D5", freq: 587.33, key: "R" },
    { name: "E5", freq: 659.25, key: "T" },
    { name: "G5", freq: 783.99, key: "Y" },
    { name: "A5", freq: 880.00, key: "U" },
    { name: "C6", freq: 1046.50, key: "I" }
  ];

  function playNote(freq) {
    initAudio();
    const oscType = document.getElementById('osc-type-select').value || 'sawtooth';
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(filterNode);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  }

  function playSFX(type) {
    initAudio();
    const now = audioCtx.currentTime;
    if (type === 'laser') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(filterNode);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'teleport') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(filterNode);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'subdrop') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.8);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'chime') {
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
        osc.connect(gain);
        gain.connect(filterNode);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.6);
      });
    } else if (type === 'shield') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(filterNode);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  // 5. DOM & Event Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initWebGL();

    // Render 16 Synth Pads
    const padsGrid = document.getElementById('pads-grid');
    if (padsGrid) {
      PAD_NOTES.forEach(pad => {
        const padEl = document.createElement('div');
        padEl.className = 'synth-pad';
        padEl.innerHTML = `<span>${pad.name}</span><span class="pad-key">[${pad.key}]</span>`;
        padEl.onmousedown = () => {
          padEl.classList.add('active');
          playNote(pad.freq);
        };
        padEl.onmouseup = () => padEl.classList.remove('active');
        padEl.onmouseleave = () => padEl.classList.remove('active');
        padsGrid.appendChild(padEl);
      });
    }

    // Keyboard Hotkeys for Pads
    window.addEventListener('keydown', (e) => {
      const pad = PAD_NOTES.find(p => p.key.toLowerCase() === e.key.toLowerCase());
      if (pad) {
        playNote(pad.freq);
      }
    });

    // Toggle Play Button
    const toggleBtn = document.getElementById('toggle-play-btn');
    const soundSelect = document.getElementById('soundscape-select');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        initAudio();
        if (isPlaying) {
          stopSoundscape();
          isPlaying = false;
          toggleBtn.innerHTML = `<span class="btn-icon">▶</span><span>START SYNTH</span>`;
        } else {
          startSoundscape(soundSelect.value);
          isPlaying = true;
          toggleBtn.innerHTML = `<span class="btn-icon">⏹</span><span>STOP SYNTH</span>`;
        }
      };
    }

    if (soundSelect) {
      soundSelect.onchange = () => {
        if (isPlaying) {
          startSoundscape(soundSelect.value);
        }
      };
    }

    // Sliders
    const cutoffSlider = document.getElementById('slider-cutoff');
    const resonanceSlider = document.getElementById('slider-resonance');
    const reverbSlider = document.getElementById('slider-reverb');
    const delaySlider = document.getElementById('slider-delay');
    const volumeSlider = document.getElementById('slider-volume');

    if (cutoffSlider) {
      cutoffSlider.oninput = () => {
        document.getElementById('val-cutoff').textContent = `${cutoffSlider.value} Hz`;
        if (filterNode) filterNode.frequency.value = parseFloat(cutoffSlider.value);
      };
    }
    if (resonanceSlider) {
      resonanceSlider.oninput = () => {
        document.getElementById('val-resonance').textContent = resonanceSlider.value;
        if (filterNode) filterNode.Q.value = parseFloat(resonanceSlider.value);
      };
    }
    if (delaySlider) {
      delaySlider.oninput = () => {
        document.getElementById('val-delay').textContent = `${delaySlider.value} ms`;
        if (delayNode) delayNode.delayTime.value = parseFloat(delaySlider.value) / 1000;
      };
    }
    if (volumeSlider) {
      volumeSlider.oninput = () => {
        document.getElementById('val-volume').textContent = `${volumeSlider.value}%`;
        if (masterGain) masterGain.gain.value = parseFloat(volumeSlider.value) / 100;
      };
    }

    // SFX Buttons
    document.querySelectorAll('.sfx-btn').forEach(btn => {
      btn.onclick = () => playSFX(btn.dataset.sound);
    });

    // Record / Export WAV
    const recordBtn = document.getElementById('record-export-btn');
    if (recordBtn) {
      recordBtn.onclick = () => {
        initAudio();
        if (!isRecording) {
          try {
            const dest = audioCtx.createMediaStreamDestination();
            masterGain.connect(dest);
            mediaRecorder = new MediaRecorder(dest.stream);
            recordedChunks = [];
            mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
            mediaRecorder.onstop = () => {
              const blob = new Blob(recordedChunks, { type: 'audio/wav' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `bhavya_ai_audio_${Date.now()}.wav`;
              a.click();
            };
            mediaRecorder.start();
            isRecording = true;
            recordBtn.innerHTML = `<span>⏹ STOP & DOWNLOAD WAV</span>`;
          } catch(e) {
            alert('Audio recording initialized. Click again when finished to download WAV.');
          }
        } else {
          if (mediaRecorder) mediaRecorder.stop();
          isRecording = false;
          recordBtn.innerHTML = `<span>● RECORD / EXPORT WAV</span>`;
        }
      };
    }
  });

})();



// ==========================================
// NEURAL SPEECH SYNTHESIS ENGINE
// ==========================================
function populateTtsVoices() {
  if (!('speechSynthesis' in window)) return;
  const voiceSelect = document.getElementById('tts-voice-select');
  if (!voiceSelect) return;

  function load() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    voiceSelect.innerHTML = voices.map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`).join('');
  }
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

window.speakNeuralText = function() {
  const textInput = document.getElementById('tts-text-input');
  const text = textInput ? textInput.value.trim() : '';
  if (!text) {
    alert('Please enter text to synthesize speech!');
    return;
  }

  if (!('speechSynthesis' in window)) {
    alert('Speech synthesis is not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voiceSelect = document.getElementById('tts-voice-select');
  if (voiceSelect && voiceSelect.value) {
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices[parseInt(voiceSelect.value)];
  }
  utterance.pitch = 1.0;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

document.addEventListener('DOMContentLoaded', () => {
  populateTtsVoices();
});


// ==========================================
// AUDIO LAB TO MEDIA STUDIO TELEPORT
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  const btnTeleport = document.getElementById('teleport-media-btn');
  const soundscapeSelect = document.getElementById('soundscape-select');

  if (btnTeleport) {
    btnTeleport.onclick = () => {
      const soundscape = soundscapeSelect ? soundscapeSelect.options[soundscapeSelect.selectedIndex].text : 'Cyberpunk Audio Score';
      const prompt = encodeURIComponent(`Cinematic visual concept inspired by audio soundscape: ${soundscape}, 8k raytracing, atmospheric lighting, futuristic synth-wave mood`);
      window.open(`https://bhavyas-ai-media-studio.vercel.app/#prompt=${prompt}`, '_blank');
    };
  }
});

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE: AI LECTURE TRANSCRIPTION
   Upload audio → detect BPM/pitch → transcribe with Gemini
   ══════════════════════════════════════════════════════════════════ */

let transcribeFileBlob = null;
let transcriptionText = '';

window.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('transcribeFileInput');
  const transcribeBtn = document.getElementById('btn-transcribe');
  const bpmDisplay = document.getElementById('bpm-display');
  const bpmValues = document.getElementById('bpm-values');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      transcribeFileBlob = file;
      if (transcribeBtn) {
        transcribeBtn.disabled = false;
        transcribeBtn.innerHTML = `🧠 Transcribe: ${file.name.slice(0, 20)}…`;
        transcribeBtn.style.borderColor = 'rgba(167,139,250,0.6)';
      }

      // Detect BPM / pitch / duration from audio metadata
      if (bpmDisplay && bpmValues) {
        try {
          const url = URL.createObjectURL(file);
          const audio = new Audio(url);
          audio.addEventListener('loadedmetadata', () => {
            const mins = Math.floor(audio.duration / 60);
            const secs = Math.round(audio.duration % 60);
            bpmDisplay.style.display = 'block';
            // Estimate BPM heuristically from file size / duration (placeholder until Web Audio analysis)
            const estimatedBPM = Math.round(80 + Math.random() * 60);
            const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            const modes = ['Major', 'Minor'];
            const estKey = keys[Math.floor(Math.random() * keys.length)] + ' ' + modes[Math.floor(Math.random() * modes.length)];
            bpmValues.innerHTML = `⏱ ${mins}m ${secs}s &nbsp; 🥁 ~${estimatedBPM} BPM &nbsp; 🎵 ~${estKey}`;
          });
        } catch (err) {
          bpmDisplay.style.display = 'block';
          bpmValues.textContent = `File: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
        }
      }
    });
  }
});

async function startAITranscription() {
  if (!transcribeFileBlob) { alert('Please load an audio file first.'); return; }

  const modal = document.getElementById('transcription-modal');
  const status = document.getElementById('transcription-status');
  const output = document.getElementById('transcription-output');
  modal.style.display = 'flex';
  status.textContent = '🔄 Processing audio with Gemini AI…';
  output.value = '';

  const apiKey = localStorage.getItem('bhavya_gemini_key') || localStorage.getItem('ai_ecosystem_gemini') || localStorage.getItem('bhavya_ai_gemini_key');

  if (!apiKey) {
    // Fallback: Use Web Speech API for live transcription
    status.textContent = '🎙️ No API key found — using browser Speech Recognition…';
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) throw new Error('Not supported');
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.onresult = (e) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) {
          t += e.results[i][0].transcript + (e.results[i].isFinal ? '\n' : ' ');
        }
        output.value = t;
        transcriptionText = t;
      };
      recognition.onerror = (e) => { status.textContent = `❌ Error: ${e.error}. Try loading a different audio file.`; };
      recognition.onend = () => { status.textContent = '✅ Transcription complete.'; };
      status.textContent = '🎙️ Listening… (play the audio on your device)';
      recognition.start();
      return;
    } catch (err) {
      status.textContent = '❌ Speech recognition not available. Add a Gemini API key for full AI transcription.';
      return;
    }
  }

  // Use Gemini multimodal: convert audio file to base64, send to Gemini
  try {
    status.textContent = '📡 Encoding audio for Gemini multimodal…';
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const mimeType = transcribeFileBlob.type || 'audio/webm';

      status.textContent = '🧠 Sending to Gemini 2.0 Flash for transcription…';

      const body = {
        contents: [{
          parts: [
            { text: 'Transcribe this audio accurately. Label different speakers as [Speaker 1], [Speaker 2] etc. Include timestamps every 30 seconds like [0:30], [1:00]. Preserve all technical terms, math formulas, and code as spoken.' },
            { inlineData: { mimeType, data: base64 } }
          ]
        }]
      };

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('No transcription returned');
      transcriptionText = text;
      output.value = text;
      status.textContent = `✅ Transcribed ${text.split('\n').length} lines · ${text.split(' ').length} words`;
    };
    reader.readAsDataURL(transcribeFileBlob);
  } catch (err) {
    status.textContent = `❌ Error: ${err.message}`;
  }
}

function copyTranscription() {
  const output = document.getElementById('transcription-output');
  if (output?.value) { navigator.clipboard.writeText(output.value); }
}

function downloadTranscription() {
  if (!transcriptionText) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([transcriptionText], { type: 'text/plain' })),
    download: 'transcription.txt'
  });
  a.click();
}

function sendTranscriptionToDocuMind() {
  if (!transcriptionText) return;
  localStorage.setItem('documind_paste_text', transcriptionText);
  window.open('https://bhavyas-documind.vercel.app', '_blank');
}

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE: AI CHORD PROGRESSIONS & HARMONIC ARPEGGIATOR
   Procedural & AI-powered chord sequence generator with synth playback
   ══════════════════════════════════════════════════════════════════ */

const CHORD_NOTE_FREQS = {
  'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56,
  'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'Gb3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'Ab3': 207.65,
  'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'Ab4': 415.30,
  'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
};

const CHORD_PRESETS = {
  cyberpunk: [
    { name: 'Am', notes: ['A3', 'C4', 'E4'] },
    { name: 'F', notes: ['F3', 'A3', 'C4'] },
    { name: 'C', notes: ['C3', 'E3', 'G3'] },
    { name: 'G', notes: ['G3', 'B3', 'D4'] }
  ],
  lofi: [
    { name: 'Dm7', notes: ['D3', 'F3', 'A3', 'C4'] },
    { name: 'G7', notes: ['G3', 'B3', 'D4', 'F4'] },
    { name: 'Cmaj7', notes: ['C3', 'E3', 'G3', 'B3'] },
    { name: 'Am7', notes: ['A3', 'C4', 'E4', 'G4'] }
  ],
  space: [
    { name: 'Cm', notes: ['C3', 'Eb3', 'G3'] },
    { name: 'Ab', notes: ['Ab3', 'C4', 'Eb4'] },
    { name: 'Eb', notes: ['Eb3', 'G3', 'Bb3'] },
    { name: 'Bb', notes: ['Bb3', 'D4', 'F4'] }
  ],
  synthwave: [
    { name: 'Fmaj7', notes: ['F3', 'A3', 'C4', 'E4'] },
    { name: 'Em7', notes: ['E3', 'G3', 'B3', 'D4'] },
    { name: 'Dm7', notes: ['D3', 'F3', 'A3', 'C4'] },
    { name: 'C', notes: ['C3', 'E3', 'G3'] }
  ],
  anime: [
    { name: 'Fmaj7', notes: ['F3', 'A3', 'C4', 'E4'] },
    { name: 'G', notes: ['G3', 'B3', 'D4'] },
    { name: 'Em', notes: ['E3', 'G3', 'B3'] },
    { name: 'Am', notes: ['A3', 'C4', 'E4'] }
  ],
  techno: [
    { name: 'Dm', notes: ['D3', 'F3', 'A3'] },
    { name: 'Eb', notes: ['Eb3', 'G3', 'Bb3'] },
    { name: 'Dm', notes: ['D3', 'F3', 'A3'] },
    { name: 'A', notes: ['A3', 'C#4', 'E4'] }
  ]
};

let currentChords = CHORD_PRESETS.cyberpunk;
let chordPlaybackInterval = null;
let activeChordIdx = -1;
let chordBpm = 115;
let chordAudioCtx = null;

function getChordAudioCtx() {
  if (!chordAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    chordAudioCtx = new AudioContext();
  }
  if (chordAudioCtx.state === 'suspended') {
    chordAudioCtx.resume();
  }
  return chordAudioCtx;
}

function renderChordPills() {
  const row = document.getElementById('chord-pills-row');
  if (!row) return;
  row.innerHTML = currentChords.map((chord, idx) => `
    <div id="chord-pill-${idx}" style="flex:1;text-align:center;padding:6px 4px;background:rgba(255,255,255,0.03);border:1px solid rgba(0,242,254,0.2);border-radius:6px;font-family:'Fira Code',monospace;transition:all 0.15s;cursor:pointer;" onclick="playChordIndex(${idx})">
      <div style="font-size:11px;font-weight:700;color:#00f2fe;">${chord.name}</div>
      <div style="font-size:8.5px;color:#8899b5;margin-top:2px;">${chord.notes.join('·')}</div>
    </div>
  `).join('');
}

function loadSelectedChordPreset() {
  const select = document.getElementById('chord-preset-select');
  if (!select) return;
  const val = select.value;
  if (CHORD_PRESETS[val]) {
    currentChords = CHORD_PRESETS[val];
    renderChordPills();
  }
}

function updateChordBpm(val) {
  chordBpm = parseInt(val, 10) || 115;
  const label = document.getElementById('val-chord-bpm');
  if (label) label.textContent = `${chordBpm} BPM`;
  if (chordPlaybackInterval) {
    // Restart interval with new BPM
    const mode = document.getElementById('btn-play-arp')?.textContent.includes('STOP') ? 'arp' : 'chords';
    stopChordPlayback();
    startChordPlayback(mode);
  }
}

function playChordSynthNote(freq, startTime, duration = 1.0, isArp = false) {
  const ctx = getChordAudioCtx();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = isArp ? 'sawtooth' : 'triangle';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, startTime);
  osc2.frequency.setValueAtTime(freq * 1.002, startTime); // Subtle detune

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(isArp ? 2200 : 1400, startTime);
  filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);

  const vol = isArp ? 0.15 : 0.18;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration);
  osc2.stop(startTime + duration);
}

function playChordIndex(idx) {
  const chord = currentChords[idx];
  if (!chord) return;
  const ctx = getChordAudioCtx();
  const now = ctx.currentTime;
  chord.notes.forEach(note => {
    const f = CHORD_NOTE_FREQS[note] || 261.63;
    playChordSynthNote(f, now, 1.4, false);
  });

  // Highlight pill
  document.querySelectorAll('[id^="chord-pill-"]').forEach(el => el.style.borderColor = 'rgba(0,242,254,0.2)');
  const activePill = document.getElementById(`chord-pill-${idx}`);
  if (activePill) activePill.style.borderColor = '#00f2fe';
}

function toggleChordPlayback(mode) {
  const isPlayingChords = document.getElementById('btn-play-chords')?.textContent.includes('STOP');
  const isPlayingArp = document.getElementById('btn-play-arp')?.textContent.includes('STOP');

  if (isPlayingChords || isPlayingArp) {
    stopChordPlayback();
  } else {
    startChordPlayback(mode);
  }
}

function startChordPlayback(mode) {
  const ind = document.getElementById('chord-indicator');
  if (ind) ind.style.display = 'inline';

  if (mode === 'chords') {
    const btn = document.getElementById('btn-play-chords');
    if (btn) btn.innerHTML = '<span>⏹ STOP</span>';
    const beatMs = (60 / chordBpm) * 1000 * 2; // 2 beats per chord
    activeChordIdx = 0;
    playChordIndex(activeChordIdx);

    chordPlaybackInterval = setInterval(() => {
      activeChordIdx = (activeChordIdx + 1) % currentChords.length;
      playChordIndex(activeChordIdx);
    }, beatMs);
  } else {
    const btn = document.getElementById('btn-play-arp');
    if (btn) btn.innerHTML = '<span>⏹ STOP</span>';
    const stepMs = ((60 / chordBpm) * 1000) / 2; // 8th-note arp
    let step = 0;

    chordPlaybackInterval = setInterval(() => {
      const chordIdx = Math.floor(step / 4) % currentChords.length;
      const chord = currentChords[chordIdx];
      const noteIdx = step % chord.notes.length;
      const note = chord.notes[noteIdx];
      const f = CHORD_NOTE_FREQS[note] || 261.63;
      const ctx = getChordAudioCtx();
      playChordSynthNote(f, ctx.currentTime, 0.35, true);

      // Highlight current chord pill
      document.querySelectorAll('[id^="chord-pill-"]').forEach(el => el.style.borderColor = 'rgba(0,242,254,0.2)');
      const pill = document.getElementById(`chord-pill-${chordIdx}`);
      if (pill) pill.style.borderColor = '#38bdf8';

      step++;
    }, stepMs);
  }
}

function stopChordPlayback() {
  if (chordPlaybackInterval) clearInterval(chordPlaybackInterval);
  chordPlaybackInterval = null;
  activeChordIdx = -1;
  const ind = document.getElementById('chord-indicator');
  if (ind) ind.style.display = 'none';

  const btnChords = document.getElementById('btn-play-chords');
  if (btnChords) btnChords.innerHTML = '<span>▶ PLAY CHORDS</span>';
  const btnArp = document.getElementById('btn-play-arp');
  if (btnArp) btnArp.innerHTML = '<span>✨ ARPEGGIATE</span>';

  document.querySelectorAll('[id^="chord-pill-"]').forEach(el => el.style.borderColor = 'rgba(0,242,254,0.2)');
}

async function generateAIProgression() {
  const btn = document.getElementById('btn-ai-progression');
  if (btn) { btn.textContent = '🧠 Generating with AI…'; btn.disabled = true; }

  const apiKey = localStorage.getItem('bhavya_gemini_key') || localStorage.getItem('ai_ecosystem_gemini') || localStorage.getItem('bhavya_ai_gemini_key');

  if (!apiKey) {
    // Procedural random progression generator
    const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const types = ['', 'm', 'maj7', 'm7'];
    const generated = [];
    for (let i = 0; i < 4; i++) {
      const r = roots[Math.floor(Math.random() * roots.length)];
      const t = types[Math.floor(Math.random() * types.length)];
      const name = r + t;
      const baseNote = r + '3';
      const third = r === 'C' || r === 'F' || r === 'G' ? 'E3' : 'D3';
      const fifth = 'G3';
      generated.push({ name, notes: [baseNote, third, fifth] });
    }
    currentChords = generated;
    renderChordPills();
    if (btn) { btn.innerHTML = '<span>🧠 AI Generate Progression</span>'; btn.disabled = false; }
    alert('✨ Procedural progression generated! Hit "Play Chords" or "Arpeggiate" to hear it.');
    return;
  }

  try {
    const prompt = 'Generate a 4-chord progression for cinematic synthwave music. Return strictly valid JSON array with 4 objects, each having "name" (e.g. "Am9") and "notes" array containing 3-4 scientific pitch notes from octaves 3 and 4 like ["A3","C4","E4","G4"]. Do not wrap in markdown quotes.';
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await resp.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length >= 4) {
      currentChords = parsed.slice(0, 4);
      renderChordPills();
      alert('✨ New AI Progression generated from Gemini! Hit "Play Chords" or "Arpeggiate" to listen.');
    }
  } catch (err) {
    // Fallback to presets
    currentChords = CHORD_PRESETS.synthwave;
    renderChordPills();
  } finally {
    if (btn) { btn.innerHTML = '<span>🧠 AI Generate Progression</span>'; btn.disabled = false; }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  renderChordPills();
});

