import React from "react";

import { VISUALIZERS, MEDIA_STATUS } from "../constants";

const PIXEL_DENSITY = 2;
const NUM_BARS = 20;
const BAR_WIDTH = 3 * PIXEL_DENSITY;
const BAR_PEAK_DROP_RATE = 0.01;
class VisualizerInner extends React.Component {
  componentDidMount() {
    this.barPeaks = new Array(NUM_BARS).fill(0);
    this.barPeakFrames = new Array(NUM_BARS).fill(0);
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvasCtx.imageSmoothingEnabled = false;

    this.setStyle();

    // Kick off the animation loop
    const loop = () => {
      if (this.props.status === MEDIA_STATUS.PLAYING) {
        if (this.props.dummyVizData) {
          Object.keys(this.props.dummyVizData).forEach((i) => {
            this.props.printBar(this.canvasCtx, i, this.props.dummyVizData[i]);
          });
        } else {
          this.paintFrame();
        }
      }
      this._animationRequest = window.requestAnimationFrame(loop);
    };
    loop();
  }

  componentWillUnmount() {
    if (this._animationRequest) {
      window.cancelAnimationFrame(this._animationRequest);
    }
  }

  componentDidUpdate() {
    this.setStyle();
    // Redraw the current frame, since the skin may have changed.
    this.paintFrame();
  }

  _renderWidth() {
    return this.props.width;
  }

  _renderHeight() {
    return this.props.height;
  }

  _height() {
    return this.props.height * PIXEL_DENSITY;
  }

  _width() {
    return this.props.width * PIXEL_DENSITY;
  }

  setStyle() {
    if (!this.props.colors) {
      return;
    }
    // TODO: Split this into to methods. One for skin update, one for style
    // update.
    this.props.analyser.fftSize = 2048;
  }

  paintFrame() {
    switch (this.props.style) {
      case VISUALIZERS.OSCILLOSCOPE:
        this.canvasCtx.drawImage(this.props.bgCanvas, 0, 0);
        this.props.paintOscilloscopeFrame(this.canvasCtx);
        break;
      case VISUALIZERS.BAR:
        this.canvasCtx.drawImage(this.props.bgCanvas, 0, 0);
        this._paintBarFrame();
        break;
      default:
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  _paintBarFrame() {
    this.props.analyser.getByteFrequencyData(this.props.dataArray);
    const heightMultiplier = this._renderHeight() / 256;
    const xOffset = BAR_WIDTH + PIXEL_DENSITY; // Bar width, plus a pixel of spacing to the right.
    for (let j = 0; j < NUM_BARS - 1; j++) {
      const start = this.props.octaveBuckets[j];
      const end = this.props.octaveBuckets[j + 1];
      let amplitude = 0;
      for (let k = start; k < end; k++) {
        amplitude += this.props.dataArray[k];
      }
      amplitude /= end - start;

      // The drop rate should probably be normalized to the rendering FPS, for now assume 60 FPS
      let barPeak =
        this.barPeaks[j] -
        BAR_PEAK_DROP_RATE * Math.pow(this.barPeakFrames[j], 2);
      if (barPeak < amplitude) {
        barPeak = amplitude;
        this.barPeakFrames[j] = 0;
      } else {
        this.barPeakFrames[j] += 1;
      }
      this.barPeaks[j] = barPeak;

      this.props.printBar(
        this.canvasCtx,
        j * xOffset,
        amplitude * heightMultiplier,
        barPeak * heightMultiplier
      );
    }
  }

  render() {
    const { width, height } = this.props;
    return (
      <canvas
        id="visualizer"
        ref={(node) => (this.canvas = node)}
        style={{ width, height }}
        width={width * PIXEL_DENSITY}
        height={height * PIXEL_DENSITY}
        onClick={this.props.toggleVisualizerStyle}
      />
    );
  }
}

export default VisualizerInner;