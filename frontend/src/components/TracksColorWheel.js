import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';

const TracksColorWheel = ({ visible, onHide, tracks, playlistName, loading, fullPage = true }) => {
  const canvasRef = useRef(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [trackDetailsVisible, setTrackDetailsVisible] = useState(false);

  // Convert RGB to HSV - we'll use this to position items on the color wheel
  const rgbToHsv = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : Math.round((delta / max) * 100);
    const v = Math.round(max * 100);

    return { h, s, v };
  };

  // Draw the color wheel whenever tracks or canvas reference changes
  useEffect(() => {
    if (!visible || loading || !tracks || !tracks.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2.5;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // De-duplicate tracks by album to ensure each album cover is only shown once
    // Create a Map to group tracks by album ID
    const albumMap = new Map();

    tracks.forEach(item => {
      if (!item.track || !item.commonColor || !item.track.album.images.length) {
        return;
      }

      const albumId = item.track.album.id;

      // If we haven't seen this album before, or if this track should replace the previous one
      if (!albumMap.has(albumId)) {
        albumMap.set(albumId, item);
      }
    });

    // console.log('DRAWING!')
    // console.log('tracks', tracks);

    // Convert Map values to array for processing
    const uniqueTracks = Array.from(albumMap.values());

    // Calculate initial positions for unique album covers
    const positionInfo = uniqueTracks.map(item => {
      const { R, G, B } = item.avgColor;
      const { h, s, v } = rgbToHsv(R, G, B);

      // Convert HSV to position
      const angle = h * Math.PI / 180;
      const distance = (s / 100) * maxRadius;

      // Calculate position on canvas
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);

      // Album image size (make it proportional to value/brightness)
      // const size = 30 + (v / 100) * 40;
      const size = 100;

      return {
        track: item,
        originalX: x,
        originalY: y,
        x: x,
        y: y,
        size: size,
        angle: angle,
        distance: distance,
        hsv: { h, s, v }
      };
    });

    // Function to check if two circles overlap
    const checkOverlap = (circle1, circle2) => {
      const distanceSquared = Math.pow(circle1.x - circle2.x, 2) + Math.pow(circle1.y - circle2.y, 2);
      const rSum = 2 * Math.sqrt(2) * circle1.size;
      return distanceSquared < Math.pow(rSum, 2);
    };

    // Preload images before starting animation
    const preloadImages = async (tracks) => {
      const loadImage = (url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = url;
        });
      };

      const imagePromises = tracks.map(item =>
        loadImage(item.track.album.images[0].url)
      );

      return Promise.all(imagePromises);
    };

    // Animate position adjustments with preloaded images
    const animatePositions = (startPositions, endPositions, preloadedImages, duration = 8000) => {
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease function (cubic easing)
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Interpolate positions and draw
        startPositions.forEach((pos, index) => {
          const endPos = endPositions[index];

          const x = pos.x + (endPos.x - pos.x) * easeProgress;
          const y = pos.y + (endPos.y - pos.y) * easeProgress;

          // Draw album cover using preloaded image
          const img = preloadedImages[index];
          ctx.save();
          ctx.beginPath();
          ctx.rect(x - positionInfo[index].size / 2, y - positionInfo[index].size / 2, positionInfo[index].size, positionInfo[index].size);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x - positionInfo[index].size / 2, y - positionInfo[index].size / 2, positionInfo[index].size, positionInfo[index].size);
          ctx.restore();
        });

        // Draw counter
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    };

    // Draw initial state
    const drawState = (positions, images) => {
      ctx.clearRect(0, 0, width, height);

      positions.forEach((info, index) => {
        const img = images[index];
        ctx.save();
        ctx.beginPath();
        ctx.rect(info.x - info.size / 2, info.y - info.size / 2, info.size, info.size);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, info.x - info.size / 2, info.y - info.size / 2, info.size, info.size);
        ctx.restore();
      });

      // Draw counter
      ctx.font = '14px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`Displaying ${positions.length} unique albums`, 10, 20);
      ctx.fillText('Click anywhere to arrange albums', 10, 40);
    };

    let isAnimating = true; // Flag to track animation state

    // Modified resolveOverlaps to handle both animation and track selection
    const resolveOverlaps = async () => {
      const maxIterations = 50;
      const repulsionFactor = 1;
      let iterations = 0;
      let hasOverlap = true;

      // Store initial positions
      const startPositions = positionInfo.map(info => ({
        x: info.x,
        y: info.y
      }));

      // Preload images
      const preloadedImages = await preloadImages(uniqueTracks);

      // Draw initial state
      drawState(positionInfo, preloadedImages);

      // Create a promise that resolves on canvas click
      const waitForClick = new Promise(resolve => {
        const clickHandler = (event) => {
          canvas.removeEventListener('click', clickHandler);
          resolve();
        };
        canvas.addEventListener('click', clickHandler);
      });

      // Wait for click before continuing
      // await waitForClick;

      // Resolve overlaps
      while (hasOverlap && iterations < maxIterations) {
        hasOverlap = false;

        for (let i = 0; i < positionInfo.length; i++) {
          for (let j = i + 1; j < positionInfo.length; j++) {
            const circleA = positionInfo[i];
            const circleB = positionInfo[j];

            if (checkOverlap(circleA, circleB)) {
              hasOverlap = true;

              // Calculate vector between centers
              const dx = circleB.x - circleA.x;
              const dy = circleB.y - circleA.y;

              // Calculate distance between centers
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Minimum distance to prevent overlap
              const minDistance = 1 * Math.sqrt(2) * circleA.size;

              if (distance < minDistance) {
                // Calculate normalized direction vector
                const dirX = dx / distance;
                const dirY = dy / distance;

                // Calculate how much to move each circle
                const moveDistance = (minDistance - distance) / 2;

                // Move circles apart slightly, but try to maintain their original relative positions
                // by applying less movement to larger circles
                const sizeRatioA = circleB.size / (circleA.size + circleB.size);
                const sizeRatioB = circleA.size / (circleA.size + circleB.size);

                // Move apart but also try to stay close to original position
                circleA.x -= dirX * moveDistance * sizeRatioA * repulsionFactor;
                circleA.y -= dirY * moveDistance * sizeRatioA * repulsionFactor;
                circleB.x += dirX * moveDistance * sizeRatioB * repulsionFactor;
                circleB.y += dirY * moveDistance * sizeRatioB * repulsionFactor;
              }
            }
          }
        }

        iterations++;
      }

      // Store final positions
      const endPositions = positionInfo.map(info => ({
        x: info.x,
        y: info.y
      }));

      // Animate from start to end positions with preloaded images
      animatePositions(startPositions, endPositions, preloadedImages, 8000);

      // Update track positions
      positionInfo.forEach(circle => {
        circle.track.position = { x: circle.x, y: circle.y, size: circle.size };
      });

      // Set up track selection click handler after animation starts
      setTimeout(() => {
        isAnimating = false;
        canvas.addEventListener('click', handleTrackClick);
      }, 8000); // Same duration as animation
    };

    // Add click event listener for track selection
    const handleTrackClick = (event) => {
      if (isAnimating) return; // Ignore clicks during animation

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Check if any album cover was clicked
      for (const item of tracks) {
        if (!item.position) continue;

        const { x, y, size } = item.position;
        const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));

        if (distance <= size / 2) {
          setSelectedTrack(item);
          setTrackDetailsVisible(true);
          break;
        }
      }
    };

    // Run overlap resolution algorithm
    resolveOverlaps();

    // Cleanup function
    const cleanup = () => {
      canvas.removeEventListener('click', handleTrackClick);
      isAnimating = true;
    };

    return cleanup;
  }, [visible, loading, tracks]);

  const renderContent = () => (
    <div className="color-wheel-container" style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        width={2400}
        height={2400}
        style={{
          maxWidth: '100%',
          height: 'auto',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#121212'
        }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-content-center p-5">
        <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="5" />
      </div>
    );
  }

  if (!tracks || !tracks.length) {
    return;
  }

  return (
    <>
      <div className="p-3 text-center">
        <span style={{ color: '#777', fontSize: '0.9rem' }}>
          {tracks.length} album covers
        </span>
      </div>
      {renderContent()}
    </>
  );
};

export default TracksColorWheel;