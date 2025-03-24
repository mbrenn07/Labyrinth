import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import "./facialDetection.css";
import { useNavigate } from "react-router-dom";
import { Stack, Box, Typography } from "@mui/material"

function EmotionDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [videoSize, setVideoSize] = useState({ width: 640, height: 480 })
    //const [emotionRatio, setEmotionRatio] = useState(1)
    //const [capturedImage, setCapturedImage] = useState(null); // New state for captured image

    const navigate = useNavigate();

    // Load models and initialize webcam
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true });
        async function initialize() {
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
                await faceapi.nets.faceExpressionNet.loadFromUri('./models');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoSize
                });
                videoRef.current.srcObject = stream;
                detectEmotions();
            } catch (error) {
                console.error('Error initializing:', error);
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


        // Define aspect ratio (height = width * ASPECT_RATIO)
        const ASPECT_RATIO = 1.5; // Change this to control the oval's aspect ratio

        // Define zoom factor (>1 to zoom in, <1 to zoom out, 1 for no zoom)
        const ZOOM_FACTOR = 1.5; // Increase to zoom in, decrease to zoom out

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
        const padding = 0 * Math.max(scaleX, scaleY);
        const adjX = Math.max(0, x - padding);
        const adjWidth = Math.min(videoWidth - adjX, width + 2 * padding);

        // Adjust height based on the aspect ratio while keeping the center the same
        const adjHeight = adjWidth * ASPECT_RATIO;
        const centerX = adjX + adjWidth / 2;
        const centerY = y + height / 2;

        // Apply zoom by shrinking the crop area around the center
        const zoomedWidth = adjWidth / ZOOM_FACTOR;
        const zoomedHeight = adjHeight / ZOOM_FACTOR;
        const zoomedX = Math.max(0, centerX - zoomedWidth / 2);
        const zoomedY = Math.max(0, centerY - zoomedHeight / 2);
        const finalZoomedWidth = Math.min(videoWidth - zoomedX, zoomedWidth);
        const finalZoomedHeight = Math.min(videoHeight - zoomedY, zoomedHeight);

        // Set canvas dimensions to match the adjusted region
        canvas.width = adjWidth;
        canvas.height = adjHeight;

        // Clear the canvas and create an oval clipping mask
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        context.ellipse(
            canvas.width / 2, canvas.height / 2, // Center of the oval
            canvas.width / 2, canvas.height / 2, // Radii (half of width & height)
            0, 0, Math.PI * 2 // Rotation and full ellipse
        );
        context.clip();

        // Draw the zoomed-in region from the original video stream inside the oval mask
        context.drawImage(
            video,
            zoomedX, zoomedY, finalZoomedWidth, finalZoomedHeight, // Source coordinates (original video)
            0, 0, adjWidth, adjHeight // Destination (canvas)
        );


        // Convert to base64 and store
        const base64Image = canvas.toDataURL('image/png');
        localStorage.setItem("picture", base64Image)
        navigate("/game")
        //setCapturedImage(base64Image)
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
                //setEmotionRatio((99 * Math.min(Math.round(currentEmotions.surprised * 100), 80)) / 80 + 1)

                if (currentEmotions.surprised > 0.8) {
                    captureFaceImage(detections[0]); // Pass raw detection, not resized
                }
            }
        }, 500);
    };

    return (
        <Box sx={{ height: "100vh", width: "100vw" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-evenly" sx={{ height: "100%" }}>
                <Typography sx={{ fontSize: 100 }}>😨</Typography>
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
                <Typography sx={{ fontSize: 100 }}>😨</Typography>
            </Stack>

            {/* Display the captured image for debugging */}
            {/* {capturedImage && (
                <div className="debug-image-container">
                    <h3>Captured Face Image</h3>
                    <img
                        src={capturedImage}
                        alt="Captured Face"
                        style={{ width: '200px', height: 'auto', border: '2px solid red' }}
                    />
                </div>
            )} */}
        </Box>
    );
}

export default EmotionDetector;
