import React, {useEffect} from 'react';
import { Box } from "@mui/material"

const NotFound = () => {
    useEffect(() => {
        localStorage.setItem("completed", "true")
    }, [])

  return (
    <Box sx={{ backgroundColor: "#202124", width: "100vw", height: "100vh", position: "relative" }}>
        <Box
  component="img"
  sx={{
    width: 300,
    position: "absolute",
    top: "40%",
    left: "35%",
    transform: "translate(-50%, -50%)"
  }}
  alt=""
  src="assets/not-found.png"
  onClick={() => {
    localStorage.setItem("completed", "false")
  }}
/>
    </Box>
  );
};

export default NotFound;