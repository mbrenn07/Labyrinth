import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import axios from 'axios';
import {
    ResponsiveContainer,
    ReferenceLine,
    Bar,
    YAxis,
    Cell,
    Tooltip,
    ComposedChart
} from 'recharts';

const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [volumeData, setVolumeData] = useState([]);
    const [tooLoud, setTooLoud] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3);

    const mediaRecorder = useRef(null);
    const audioContext = useRef(null);
    const analyzer = useRef(null);
    const startTime = useRef(null);
    const audioChunks = useRef([]);

    const WHISPER_THRESHOLD = -20; // dB threshold for whisper

    const instance = axios.create({
        baseURL: "https://labyrinth-backend-1095352764453.us-east4.run.app",
        timeout: undefined,
    });

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (mediaRecorder.current) {
                mediaRecorder.current.stop();
            }
            if (audioContext.current) {
                audioContext.current.close();
            }
        };
    }, []);

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
            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                audioChunks.current = [];
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result.split(',')[1];
                    instance.post("/player", {
                        "picture": localStorage.getItem("picture"),
                        "path": localStorage.getItem("path"),
                        "sound": base64data
                    })
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.current.start();

            setIsRecording(true);
            setVolumeData([]);
            setTooLoud(false);
            startTime.current = Date.now();

            // Start volume monitoring
            requestAnimationFrame(monitorVolume);

            setTimeout(() => {
                stopRecording();
            }, 3000);
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

        if (timestamp > 3) return;

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
        if (mediaRecorder.current) {
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
                        <ComposedChart
                            data={volumeData.map((item) => {
                                return {
                                    time: item.time,
                                    volume: Math.max(100 - Math.abs(item.volume), 40)
                                }
                            })}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 20,
                            }}
                        >
                            <YAxis
                                domain={[40, 100]}
                                scale={"log"}
                                hide
                            />
                            <Tooltip
                                formatter={(value) => [`${value.toFixed(2)} dB`, 'Volume']}
                                labelFormatter={(value) => `Time: ${value}s`}
                            />
                            <ReferenceLine
                                y={80} // Draw a horizontal line at y = -40
                                stroke="red"
                                strokeWidth={2}
                            />
                            <Bar
                                dataKey="volume"
                            >
                                {volumeData.map((entry) => (
                                    <Cell key={entry.time} fill={entry.volume > WHISPER_THRESHOLD ? 'red' : 'green'} />
                                ))}
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;