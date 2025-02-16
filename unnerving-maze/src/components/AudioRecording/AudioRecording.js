import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [volumeData, setVolumeData] = useState([]);
    const [tooLoud, setTooLoud] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3);

    const mediaRecorder = useRef(null);
    const audioContext = useRef(null);
    const analyzer = useRef(null);
    const startTime = useRef(null);

    const WHISPER_THRESHOLD = -20; // dB threshold for whisper

    useEffect(() => {

    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up Web Audio API
            audioContext.current = new AudioContext();
            const source = audioContext.current.createMediaStreamSource(stream);
            analyzer.current = audioContext.current.createAnalyser();
            analyzer.current.fftSize = 256;
            source.connect(analyzer.current);

            // Set up MediaRecorder
            mediaRecorder.current = new MediaRecorder(stream);
            mediaRecorder.current.start();

            setIsRecording(true);
            setVolumeData([]);
            setTooLoud(false);
            startTime.current = Date.now();

            // Start volume monitoring
            requestAnimationFrame(monitorVolume);
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    };

    const monitorVolume = () => {

        const dataArray = new Uint8Array(analyzer.current.frequencyBinCount);
        analyzer.current.getByteFrequencyData(dataArray);

        // Calculate average volume in dB
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const db = 20 * Math.log10(average / 255);

        const timestamp = (Date.now() - startTime.current) / 1000;

        setVolumeData(prev => [...prev, {
            time: timestamp,
            volume: Math.max(db, -100)
        }]);

        if (db > WHISPER_THRESHOLD) {
            setTooLoud(true);
        }

        requestAnimationFrame(monitorVolume);
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
            if (audioContext.current) {
                audioContext.current.close();
            }
            setIsRecording(false);
        }
    };

    return (
        <div className="w-full max-w-2xl p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-4 rounded-full ${isRecording
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                >
                    {isRecording ? <Square size={24} /> : <Mic size={24} />}
                </button>
                {isRecording && (
                    <div className="text-lg font-semibold">
                        {timeLeft} seconds remaining
                    </div>
                )}
            </div>

            {tooLoud && (
                <p>
                    Volume too loud! Please speak more quietly (whisper level).
                </p>
            )}

            {volumeData.length > 0 && (
                <div style={{
                    width: '100%',
                    height: '400px',
                }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={volumeData}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 20,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                label={{ value: 'Time (seconds)', position: 'bottom' }}
                            />
                            <YAxis
                                label={{ value: 'Volume (dB)', angle: -90, position: 'left' }}
                                domain={[-100, 0]}
                            />
                            <Tooltip
                                formatter={(value) => [`${value.toFixed(2)} dB`, 'Volume']}
                                labelFormatter={(value) => `Time: ${value}s`}
                            />
                            <Line
                                type="monotone"
                                dataKey="volume"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};


export default AudioRecorder;