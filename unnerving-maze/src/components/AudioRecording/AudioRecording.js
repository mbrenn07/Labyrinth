import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography } from "@mui/material"
import axios from "axios"

const WhisperDetector = () => {
  const [status, setStatus] = useState('idle'); // idle, calibrating, recording, processing, success, error
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const backgroundNoiseLevel = useRef(0);
  const userAudioChunks = useRef([]);

  const instance = axios.create({
    baseURL: "https://labyrinth-backend-1095352764453.us-east4.run.app",
    timeout: undefined,
  });

  useEffect(() => {
    getBackground().then(() => {
      startRecording()
    })
  }, [])

  const getBackground = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Measure background noise for 1 second
      await new Promise(resolve => {
        const intervalId = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          backgroundNoiseLevel.current = Math.max(backgroundNoiseLevel.current, average);
          setProgress(prev => {
            if (prev >= 25) {
              clearInterval(intervalId);
              resolve();
            }
            return prev + 1;
          });
        }, 40); // 25 * 40ms = 1 second
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Now record the user
      setStatus('recording');

      // Create a new MediaRecorder for the user's audio
      mediaRecorderRef.current = new MediaRecorder(stream);
      userAudioChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          userAudioChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        processAudio();
      };

      // Start recording user audio
      mediaRecorderRef.current.start();

      // Record for 3 seconds
      await new Promise(resolve => {
        const intervalId = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(intervalId);
              resolve();
            }
            return prev + 1;
          });
        }, 40); // 75 * 40ms = 3 seconds
      });

      // Stop recording
      mediaRecorderRef.current.stop();

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const processAudio = async () => {
    try {
      setStatus("playback")
      // Create a blob from the recorded chunks
      const audioBlob = new Blob(userAudioChunks.current, { type: 'audio/webm' });

      // Create an audio element to analyze the recorded audio
      const audioElement = new Audio(URL.createObjectURL(audioBlob));

      // Set up an analyzer to check the audio level
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioElement);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      //analyser.connect(audioContext.destination);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let maxUserVolume = 0;

      audioElement.play();

      // Analyze the user's audio
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        maxUserVolume = Math.max(maxUserVolume, average);

        if (audioElement.ended) {
          // Compare with background noise
          const threshold = backgroundNoiseLevel.current * 1.25; // Allow 50% louder than background
          if (maxUserVolume > threshold) {
            // User spoke too loudly
            setStatus('loud');
            setTimeout(() => {
              resetRecording()
              startRecording()
            }, 3000);
          } else {
            // Success - user whispered appropriately
            setStatus('success');
            // Call your function here
            handleSuccessfulWhisper(audioBlob);
          }
        } else {
          requestAnimationFrame(checkAudio);
        }
      };

      requestAnimationFrame(checkAudio);

    } catch (error) {
      console.error('Error processing audio:', error);
    }
  };

  const handleSuccessfulWhisper = async (audioBlob) => {
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // Get base64 part
        reader.onerror = reject;
      });
    };

    const base64Audio = await blobToBase64(audioBlob);

    instance.post("/player", {
      "picture": localStorage.getItem("picture"),
      "path": localStorage.getItem("path"),
      "sound": base64Audio
    }).catch((e) => console.error(e))
  };

  const resetRecording = () => {
    setProgress(0);
    userAudioChunks.current = [];
  };

  const getBackgroundColor = () => {
    if (status === "recording") {
      return "grey"
    } else if (status === "loud") {
      return "red"
    } else if (status === "success") {
      return "green"
    } else if (status === "playback") {
      return "darkgrey"
    } else {
      return "black";
    }
  }

  const getEmoji = () => {
    if (status === "recording") {
      return "👂"
    } else if (status === "loud") {
      return "🤫"
    } else if (status === "success") {
      return "✅"
    } else if (status === "playback") {
      return "🤔"
    } else {
      return "🤐";
    }
  }


  return (
    <Box sx={{ backgroundColor: getBackgroundColor(), width: "100vw", height: "100vh" }}>
      <Box sx={{ position: "relative", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "fit-content" }}>
        <Typography sx={{ fontSize: 200 }}>{getEmoji()}</Typography>
      </Box>
    </Box>
  );
};

export default WhisperDetector;