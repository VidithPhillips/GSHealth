import React from 'react';
import { getRouteInstructions } from '../services/osrmService';
import '../styles/routing.css';

const RouteInstructions = ({ route }) => {
  if (!route || !route.legs) {
    return null;
  }

  const instructions = getRouteInstructions(route);

  if (instructions.length === 0) {
    return null;
  }

  return (
    <div className="route-instructions">
      <h4>Turn-by-Turn Directions</h4>
      {instructions.map((step, index) => (
        <div key={index} className="instruction-step">
          <div className="instruction-icon">
            {getDirectionIcon(step.instruction)}
          </div>
          <div className="instruction-content">
            <div className="instruction-text">
              {step.instruction}
            </div>
            <div className="instruction-distance">
              {formatDistance(step.distance)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to get appropriate icon based on instruction
const getDirectionIcon = (instruction) => {
  const lowerInstruction = instruction.toLowerCase();
  
  if (lowerInstruction.includes('turn right')) {
    return '➡️';
  } else if (lowerInstruction.includes('turn left')) {
    return '⬅️';
  } else if (lowerInstruction.includes('continue')) {
    return '⬆️';
  } else if (lowerInstruction.includes('arrive')) {
    return '🏁';
  } else if (lowerInstruction.includes('roundabout')) {
    return '🔄';
  } else if (lowerInstruction.includes('u-turn')) {
    return '↩️';
  } else if (lowerInstruction.includes('merge')) {
    return '↗️';
  } else if (lowerInstruction.includes('exit')) {
    return '↘️';
  } else {
    return '•';
  }
};

// Helper function to format distance
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

export default RouteInstructions; 