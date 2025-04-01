import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';

const TracksColorWheel = ({ visible, onHide, tracks, playlistName, loading }) => {
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
    
    // Convert Map values to array for processing
    const uniqueTracks = Array.from(albumMap.values());
    
    // Calculate initial positions for unique album covers
    const positionInfo = uniqueTracks.map(item => {
      const { R, G, B } = item.commonColor;
      const { h, s, v } = rgbToHsv(R, G, B);
      
      // Convert HSV to position
      const angle = h * Math.PI / 180;
      const distance = (s / 100) * maxRadius;
      
      // Calculate position on canvas
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);
      
      // Album image size (make it proportional to value/brightness)
      const size = 30 + (v / 100) * 40;
      
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
      const radiusSum = (circle1.size / 2) + (circle2.size / 2);
      return distanceSquared < Math.pow(radiusSum, 2);
    };
    
    // Resolve overlaps - adjust positions while minimizing movement
    const resolveOverlaps = () => {
      const maxIterations = 50;
      const repulsionFactor = 1;
      let iterations = 0;
      let hasOverlap = true;
      
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
              const minDistance = (circleA.size / 2) + (circleB.size / 2);
              
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
      
      // Slight additional adjustment to make sure no covers are off the canvas
      for (const circle of positionInfo) {
        const radius = circle.size / 2;
        
        // Keep covers inside canvas bounds
        circle.x = Math.max(radius, Math.min(width - radius, circle.x));
        circle.y = Math.max(radius, Math.min(height - radius, circle.y));
        
        // Update track position reference
        circle.track.position = { x: circle.x, y: circle.y, size: circle.size };
      }
    };
    
    // Run overlap resolution algorithm
    resolveOverlaps();
    
    // Draw album covers with resolved positions
    positionInfo.forEach(info => {
      const img = new Image();
      img.src = info.track.track.album.images[0].url;
      img.onload = () => {
        // Draw at calculated position
        ctx.save();
        ctx.beginPath();
        ctx.arc(info.x, info.y, info.size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, info.x - info.size / 2, info.y - info.size / 2, info.size, info.size);
        ctx.restore();
      };
    });
    
    // Add counter showing how many unique albums are displayed
    ctx.font = '14px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Displaying ${positionInfo.length} unique albums`, 10, 20);
    
    // Add click event listener for track selection
    const handleCanvasClick = (event) => {
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
    
    canvas.addEventListener('click', handleCanvasClick);
    
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [visible, loading, tracks]);
  
  if (loading) {
    return (
      <Dialog
        header={`Loading tracks for ${playlistName || 'playlist'}...`}
        visible={visible}
        style={{ width: '80vw', maxWidth: '800px' }}
        onHide={onHide}
        modal
        dismissableMask
      >
        <div className="flex justify-content-center">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="5" />
        </div>
      </Dialog>
    );
  }
  
  if (!tracks || !tracks.length) {
    return (
      <Dialog
        header={`Tracks for ${playlistName || 'playlist'}`}
        visible={visible}
        style={{ width: '80vw', maxWidth: '800px' }}
        onHide={onHide}
        modal
        dismissableMask
      >
        <div className="p-3">
          <p>No tracks found or there was an error loading the tracks.</p>
        </div>
      </Dialog>
    );
  }
  
  return (
    <>
      <Dialog
        header={`Color Wheel View: ${playlistName || 'playlist'} (${tracks.length} tracks)`}
        visible={visible}
        style={{ width: '90vw', maxWidth: '900px' }}
        onHide={onHide}
        modal
        dismissableMask
      >
        <div className="color-wheel-container" style={{ textAlign: 'center' }}>
          <p>Album covers are arranged by color. The angle represents hue, distance from center represents saturation, and size represents brightness.</p>
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={800} 
            style={{ 
              maxWidth: '100%', 
              height: 'auto', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              backgroundColor: '#121212'
            }}
          />
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
            Click on an album cover to view track details
          </p>
        </div>
      </Dialog>
      
      {/* Track details dialog */}
      {selectedTrack && (
        <Dialog
          visible={trackDetailsVisible}
          onHide={() => setTrackDetailsVisible(false)}
          header={selectedTrack.track.name}
          style={{ width: '400px' }}
          modal
          dismissableMask
        >
          <div className="flex flex-column align-items-center" style={{ gap: '10px' }}>
            {selectedTrack.track.album.images[0].url && (
              <img
                src={selectedTrack.track.album.images[0].url}
                alt={selectedTrack.track.album.name}
                style={{ width: '200px', height: '200px', borderRadius: '8px' }}
              />
            )}
            
            <h4 style={{ margin: '10px 0 5px 0' }}>{selectedTrack.track.name}</h4>
            <p style={{ margin: '0' }}>
              {selectedTrack.track.artists?.map(artist => artist.name).join(', ')}
            </p>
            <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
              {selectedTrack.track.album?.name}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: `rgb(${selectedTrack.commonColor.R}, ${selectedTrack.commonColor.G}, ${selectedTrack.commonColor.B})`,
                  display: 'inline-block',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <p style={{ margin: '0' }}>
                Common Color: RGB({selectedTrack.commonColor.R}, {selectedTrack.commonColor.G}, {selectedTrack.commonColor.B})
              </p>
            </div>
            
            <button
              onClick={() => window.open(selectedTrack.track.external_urls.spotify, '_blank', 'noopener,noreferrer')}
              style={{
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Open in Spotify
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default TracksColorWheel;