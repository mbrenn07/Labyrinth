import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import "./facialDetection.css"

function EmotionDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [emotions, setEmotions] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load models and initialize webcam
    useEffect(() => {
        async function initialize() {
            try {
                // Load face detection and emotion models
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                await faceapi.nets.faceExpressionNet.loadFromUri('/models');

                // Get webcam access
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 }
                });
                videoRef.current.srcObject = stream;

                setLoading(false);
                detectEmotions();
            } catch (error) {
                console.error('Error initializing:', error);
                setLoading(false);
            }
        }

        initialize();

        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const detectEmotions = async () => {
        if (!videoRef.current) return;

        // Create canvas for face-api.js processing
        const canvas = canvasRef.current;
        const displaySize = { width: 640, height: 480 };
        faceapi.matchDimensions(canvas, displaySize);

        // Detect emotions in real-time
        setInterval(async () => {
            if (videoRef.current.readyState !== 4) return;

            // Detect faces with expressions
            const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceExpressions();

            // Resize detected faces to display size
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Clear previous drawings
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // Draw detections to canvas
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

            // Update emotions state
            if (resizedDetections.length > 0) {
                setEmotions(resizedDetections[0].expressions);
            } else {
                setEmotions(null);
            }
        }, 500); // Process every 500ms
    };

    return (
        <div className="container">
            <h1>Real-time Emotion Detection</h1>
            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '640px', height: '480px' }}
                />
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', left: 0, top: 0 }}
                />
            </div>

            {loading && <p>Loading models and camera...</p>}

            {emotions && (
                <div className="emotion-results">
                    <h2>Detected Emotions:</h2>
                    {Object.entries(emotions).map(([emotion, score]) => (
                        <div key={emotion} className="emotion-bar">
                            <span className="emotion-label">{emotion}:</span>
                            <div className="meter">
                                <div
                                    style={{
                                        width: `${score * 100}%`,
                                        backgroundColor: emotion === 'angry' ? '#ff4444' : '#2196F3'
                                    }}
                                />
                                <span className="score">{(score * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EmotionDetector;