import { useState } from 'react';

export default function Home() {
  const [color, setColor] = useState("#ffffff");
  const [rgb, setRgb] = useState("rgb(255, 255, 255)");
  const [hsl, setHsl] = useState("hsl(0, 0%, 100%)");

  // Function to generate random color in HEX, RGB, and HSL
  const generateRandomColor = () => {
    // Random color in HEX
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    // Convert HEX to RGB
    const r = parseInt(randomColor.slice(1, 3), 16);
    const g = parseInt(randomColor.slice(3, 5), 16);
    const b = parseInt(randomColor.slice(5, 7), 16);
    const rgbColor = `rgb(${r}, ${g}, ${b})`;

    // Convert RGB to HSL
    const hslColor = rgbToHsl(r, g, b);

    setColor(randomColor);
    setRgb(rgbColor);
    setHsl(hslColor);
  };

  // Helper function to convert RGB to HSL
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  // Function to copy color code to clipboard
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Copied ${code} to clipboard!`);
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Random Color Generator</h1>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={generateRandomColor}>Generate Random Color</button>
      </div>
      <div style={{ marginBottom: '10px', backgroundColor: color, padding: '20px' }}>
        <h2>{color}</h2>
        <button onClick={() => copyToClipboard(color)}>Copy Hex Code</button>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <h3>RGB: {rgb}</h3>
        <button onClick={() => copyToClipboard(rgb)}>Copy RGB Code</button>
      </div>
      <div>
        <h3>HSL: {hsl}</h3>
        <button onClick={() => copyToClipboard(hsl)}>Copy HSL Code</button>
      </div>
    </div>
  );
}
