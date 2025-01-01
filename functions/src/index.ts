import express, {Response} from "express";
import {createServer} from "http";
import {Server} from "socket.io";
import cors from "cors";
import {
  credential,
  GoogleOAuthAccessToken,
  // initializeApp,
} from "firebase-admin";

import {onRequest, Request} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// const serviceAccount = (() => require("./../firebase-cred.json"))();

// initializeApp({credential: credential.cert(JSON.stringify(serviceAccount))});

/**
 * Generates access token
 * @return {Promise<GoogleOAuthAccessToken>} token
 */
function generateAccessToken(): Promise<GoogleOAuthAccessToken> {
  return credential.applicationDefault().getAccessToken();
}

// Create an Express app and wrap it with an HTTP server
const app = express();
app.use(cors({origin: ["http://localhost:4200"]}));
const httpServer = createServer(app);

// Initialize Socket.IO on the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:4200",
  },
});

// Listen for Socket.IO connections
io.on("connection", (socket) => {
  // Listen for the 'upscale' event
  socket.on("upscale", async (data) => {
    const payload = {
      "instances": [
        {
          "prompt": "Make Image Clearer, Increase Image Quality",
          "image": {
            "bytesBase64Encoded": data,
          },
        },
      ],
      "parameters": {
        "sampleCount": 1,
        "mode": "upscale",
        "upscaleConfig": {
          "upscaleFactor": "x2",
        },
      },
    };


    const accessToken = await generateAccessToken();
    const resp = await fetch(process.env.GOOGLE_CLOUD_IMAGEGEN_API as string, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "authorization": `Bearer ${accessToken.access_token}`,
      },
    });

    if (!resp.ok) {
      const err = await resp.json();
      logger.error(err);
      socket.emit("upscale-failure", err);
      return;
    }

    const prediction = await resp.json();
    const mimeType = prediction.predictions[0].mimeType;
    const bytesEncoded = prediction.predictions[0].bytesBase64Encoded;
    socket.emit("upscale-result", `data:${mimeType};base64,${bytesEncoded}`);
  });

  socket.on("disconnect", () => {
    logger.info("Client disconnected");
  });
});

let isServerRunning = false;
const PORT = 3000;

/**
 * Firebase HTTP function that starts the Socket.IO server
 * (only if it isn't already running) and responds to the HTTP request.
 */
export const upscaleImage = onRequest((req: Request, res: Response) => {
  logger.info("HTTP request received at /upscaleImage");

  if (!isServerRunning) {
    httpServer.listen(PORT, () => {
      logger.info(`Socket.IO server listening on port ${PORT}`);
    });
    isServerRunning = true;
  }

  res.status(200).json({message: "Server is up and running"});
});
