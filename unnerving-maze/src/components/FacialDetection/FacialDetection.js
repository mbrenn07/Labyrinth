import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import "./facialDetection.css";
import { useNavigate } from "react-router-dom";

function EmotionDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [emotions, setEmotions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [videoSize, setVideoSize] = useState({ width: 640, height: 480 })

    const navigate = useNavigate();

    // Load models and initialize webcam
    useEffect(() => {
        async function initialize() {
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                await faceapi.nets.faceExpressionNet.loadFromUri('/models');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoSize
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

    const captureFaceImage = (detection) => {
        if (videoRef.current === null) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        setVideoSize({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight })


        // Use the original detection (not resized) to get accurate coordinates
        const box = detection.detection.box;

        // Get the actual video dimensions (not the displayed size)
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Calculate scaling factors if video is displayed at a different size
        const scaleX = videoWidth / video.offsetWidth;
        const scaleY = videoHeight / video.offsetHeight;

        // Adjust bounding box to match the original video stream
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const width = box.width * scaleX;
        const height = box.height * scaleY;

        // Add padding (scaled appropriately)
        const padding = 20 * Math.max(scaleX, scaleY);
        const adjX = Math.max(0, x - padding);
        const adjY = Math.max(0, y - padding);
        const adjWidth = Math.min(videoWidth - adjX, width + 2 * padding);
        const adjHeight = Math.min(videoHeight - adjY, height + 2 * padding);

        // Set canvas dimensions to match the adjusted face region
        canvas.width = adjWidth;
        canvas.height = adjHeight;

        // Draw the face region from the original video stream
        context.drawImage(
            video,
            adjX, adjY, adjWidth, adjHeight, // Source coordinates (original video)
            0, 0, adjWidth, adjHeight       // Destination (canvas)
        );

        // Convert to base64 and store
        const base64Image = canvas.toDataURL('image/png');
        localStorage.setItem("picture", base64Image)
        navigate("/game")
    };

    const detectEmotions = async () => {
        if (!videoRef.current) return;

        const canvas = canvasRef.current;
        const displaySize = { width: 640, height: 480 };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
            if (videoRef.current === null || videoRef.current.readyState !== 4) return;

            // Get raw detections (not resized)
            const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceExpressions();

            if (detections.length > 0) {
                const currentEmotions = detections[0].expressions;
                setEmotions(currentEmotions);

                if (currentEmotions.angry > 0.8) {
                    captureFaceImage(detections[0]); // Pass raw detection, not resized
                }
            } else {
                setEmotions(null);
            }
        }, 500);
    };

    return (
        <div className="container">
            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={videoSize}
                />
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', left: 0, top: 0, width: videoSize.width, height: videoSize.height }}
                />
            </div>

            {emotions && (
                <div className="emotion-results">
                    <div className="emotion-bar">
                        <div className="meter">
                            <div
                                style={{
                                    width: `${emotions.angry * 100}%`,
                                    backgroundColor: '#ff4444'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmotionDetector;