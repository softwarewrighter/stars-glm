# Star Quiz

[**Live Demo**](https://softwarewrighter.github.io/stars-glm/)

An interactive star field viewer with quiz mechanics, built with vanilla HTML, CSS, and JavaScript.

## Features

- **Interactive Star Field**: View 426 named stars with magnitudes ≤8
- **Draggable & Zoomable**: Pan around the star field and zoom in/out
- **Grid Overlay**: Toggle a coordinate grid for reference
- **Quiz Mechanic**: Click on any named star to test your knowledge
  - Multiple-choice questions with correct name + 3 nearby stars
  - Immediate feedback (✓ Correct or ✗ Incorrect with correct answer)
- **Success Rate Tracking**: Track your progress in real-time
- **Results Summary**: View your final score and start a new quiz

## Setup

1. Ensure you have Node.js installed
2. Prepare the star data:
   ```bash
   node prepare_data.js
   ```
   This extracts and processes the HYG star database, creating `stars.json` with only visible stars.

3. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

- **Pan**: Click and drag on the star field
- **Zoom**: Use mouse wheel or scroll to zoom in/out
- **Toggle Grid**: Click the "Show Grid" checkbox in the controls panel
- **Answer Quiz**: Click on any named star to see the quiz popup
- **Skip Question**: Click "Skip" if you don't know the answer
- **Finish Quiz**: Click "Done" to see your results
- **Restart**: Click "Start New Quiz" to reset and try again

## Data

The application uses the HYG (Hipparcos-Yale-Gliese) star database v4.2:
- **Source**: https://codeberg.org/wrightmikea/hyg
- **License**: CC-BY-SA 4.0
- **Stars included**: 426 named stars (magnitude ≤ 8) for quiz questions

## Technical Details

- **No build process**: Pure vanilla JavaScript
- **Canvas rendering**: Efficient rendering using HTML5 Canvas API
- **Coordinate system**: Right Ascension (0-24 hours) and Declination (-90° to +90°)
- **Star sizing**: Based on magnitude (brighter stars are larger)
- **Quiz logic**: Selects 3 nearby stars as distractors using 3D spatial distance

## File Structure

- `docs/index.html`: Main HTML structure
- `docs/style.css`: Application styling
- `docs/app.js`: Main application logic
- `docs/stars.json`: Processed star data (generated)
- `docs/.nojekyll`: GitHub Pages configuration
- `prepare_data.js`: Data preprocessing script
- `test.js`: Automated tests with Playwright
