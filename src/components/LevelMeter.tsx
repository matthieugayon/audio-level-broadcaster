import { useEffect, useRef } from 'react';
import { useVizualizerApi } from '../VizualizerApi';
import { BOLD_MARKERS, MEDIUM_MAKERS, dbNormal } from '../helpers/decibel';

const LevelMeter: React.FC = () => {
  const levelsCanvasRef = useRef<HTMLCanvasElement>(null);
  const markersCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const vizualizerApi = useVizualizerApi.getState();
    vizualizerApi.initSharedWorker();

    if (markersCanvasRef?.current) {
      const canvas = markersCanvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        vizualizerApi.setMarkersCanvasContext(context);
        vizualizerApi.drawMarkers()
      }
    }

    if (levelsCanvasRef?.current) {
      const canvas = levelsCanvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        vizualizerApi.setLevelsCanvasContext(context);
        vizualizerApi.drawLevels();
      }
    }
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="flex justify-center space-x-1">
        <canvas ref={levelsCanvasRef} width={30} height={401} />
        <canvas ref={markersCanvasRef} width={6} height={401} />

        {/* CANVAS is extremely slow at drawing text so we display it with html and css */}
        <div className="relative" style={{ width: 13, padding: 1 }}>
          {BOLD_MARKERS.map(dbValue => (
            <div
              key={dbValue}
              className="absolute w-full text-right text-markers"
              style={{ bottom: Math.round(dbNormal(dbValue) * 400) - 3.5 }}
            >
              {Math.abs(dbValue)}
            </div>
          ))}

          {MEDIUM_MAKERS.filter(val => val !== -66 && val !== 6).map(dbValue => (
            <div
              key={dbValue}
              className="absolute w-full text-right text-markers gray-300"
              style={{ bottom: Math.round(dbNormal(dbValue) * 400) - 3.5 }}
            >
              {Math.abs(dbValue)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelMeter;
