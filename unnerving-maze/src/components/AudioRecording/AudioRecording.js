import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, AlertCircle, CheckCircle } from 'lucide-react';

const WhisperDetector = () => {
  const [status, setStatus] = useState('idle'); // idle, calibrating, recording, processing, success, error
  const [message, setMessage] = useState('Click to start recording');
  const [progress, setProgress] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const backgroundNoiseLevel = useRef(0);
  const userAudioChunks = useRef([]);

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
        
        // First record background noise
        setStatus('calibrating');
        setMessage('Recording background noise...');
        
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
        setStatus('error');
        setMessage('Error accessing microphone. Please check permissions.');
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
      setMessage('Now whisper something...');
      
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
      setStatus('processing');
      setMessage('Processing your audio...');
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('error');
      setMessage('Error accessing microphone. Please check permissions.');
    }
  };
  
  const processAudio = async () => {
    try {
      // Create a blob from the recorded chunks
      const audioBlob = new Blob(userAudioChunks.current, { type: 'audio/webm' });
      
      // Create an audio element to analyze the recorded audio
      const audioElement = new Audio(URL.createObjectURL(audioBlob));
      
      // Set up an analyzer to check the audio level
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioElement);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
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
          const threshold = backgroundNoiseLevel.current * 1.5; // Allow 50% louder than background
          
          if (maxUserVolume > threshold) {
            // User spoke too loudly
            setStatus('loud');
            setTimeout(() => {
                if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                  }
                startRecording()
              }, 1000); 
            setMessage('You spoke too loudly. Please whisper more quietly.');
          } else {
            // Success - user whispered appropriately
            setStatus('success');
            setMessage('Perfect whisper! Processing your request...');
            // Call your function here
            handleSuccessfulWhisper();
          }
        } else {
          requestAnimationFrame(checkAudio);
        }
      };
      
      requestAnimationFrame(checkAudio);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus('error');
      setMessage('Error processing audio.');
    }
  };
  
  const handleSuccessfulWhisper = () => {
    // This is the function that would be called when the whisper is successful
    console.log('Whisper detected successfully - calling your function');
    // Replace with your actual function call
  };
  
  const resetRecording = () => {
    setStatus('idle');
    setMessage('Click to start recording');
    setProgress(0);
    backgroundNoiseLevel.current = 0;
    userAudioChunks.current = [];
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Whisper Detector</h2>
      
      <div className="w-full mb-6 bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-center w-24 h-24 rounded-full mb-4">
        {status === 'idle' && (
          <button 
            onClick={startRecording}
            className="w-full h-full flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full"
          >
            <Mic size={36} />
          </button>
        )}
        
        {status === 'calibrating' && (
          <div className="w-full h-full flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full animate-pulse">
            <Volume2 size={36} />
          </div>
        )}
        
        {status === 'recording' && (
          <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-700 rounded-full animate-pulse">
            <Mic size={36} />
          </div>
        )}
        
        {status === 'processing' && (
          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 rounded-full">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-700 rounded-full">
            <AlertCircle size={36} />
          </div>
        )}
        
        {status === 'success' && (
          <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-700 rounded-full">
            <CheckCircle size={36} />
          </div>
        )}
      </div>
      
      <p className="text-center mb-4">{message}</p>
      
      {(status === 'error' || status === 'success') && (
        <button 
          onClick={resetRecording}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default WhisperDetector;