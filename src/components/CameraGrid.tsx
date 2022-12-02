/******************************************************************************
  *
   *
 * Copyright 2013-2022 Sighthound, Inc.
 *
 * Licensed under the GNU GPLv3 license found at
 * https://www.gnu.org/licenses/gpl-3.0.txt
 *
 * Alternative licensing available from Sighthound, Inc.
 * by emailing opensource@sighthound.com
 *
 * This file is part of the Sighthound Video project which can be found at
 * https://github.com/sighthoundinc/SighthoundVideo
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; using version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02111, USA.
 *
  *
*******************************************************************************/

import * as React from 'react';
import CameraMJPG from './CameraMJPG';
import GridLayoutControls from './GridLayoutControls';
import {Camera} from './../sighthound';
import LiveTime from './LiveTime';
import { throttle } from 'underscore';


interface CameraGridProps {
    cameras: Map<string, Camera>;
    cameraGridSize: number;
    onCameraRefreshRequest: (name: string) => {};
    updateAppState: ({}) => void; // TODO improve definition
}
interface CameraGridState {
    videosContainerWidth: number | string;
}

const CAMERA_GRID_PADDING = 10; // Total of left and ride side padding for Camera
const BROWSER_SCROLLBAR_WIDTH = 40; // Hack to account for scrollbar width in browsers

class CameraGrid extends React.Component<CameraGridProps, CameraGridState> {
    cameraGridElement: HTMLElement;
    resizeThrottle: any;

    constructor(props: CameraGridProps) {
        super(props);
        this.state = {
            videosContainerWidth: 'auto'
        };
        this.setCameraGridElement = this.setCameraGridElement.bind(this);
    }

    componentDidMount() {
        this.resizeThrottle = throttle(this.handleWindowResize.bind(this), 100);
        window.addEventListener("resize", this.resizeThrottle.bind(this));
        this.handleWindowResize();
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.resizeThrottle.bind(this));
        this.resizeThrottle = undefined;
    }

    componentDidUpdate(prevProps: CameraGridProps, prevState: CameraGridState) {
        if (this.props.cameraGridSize !== prevProps.cameraGridSize || this.props.cameras.size !== prevProps.cameras.size) {
            this.handleWindowResize();
        }
    }

    renderCameras() {
        if (!this.props.cameras || this.props.cameras.size === 0) return;

        let cameras: JSX.Element[] = [];
        this.props.cameras.forEach((camera: Camera) => {

            cameras.push(
                <CameraMJPG
                    key={camera.name}
                    camera={camera}
                    imageRefreshTime={500}
                    onCameraRefreshRequest={this.props.onCameraRefreshRequest}
                    width={this.props.cameraGridSize}/>
            );
        });

        return cameras;
    }

    handleWindowResize() {
        let videosContainerWidth;

        if (this.cameraGridElement) {
            const elWidth = this.cameraGridElement.offsetWidth - BROWSER_SCROLLBAR_WIDTH;
            const cameraWidth = this.props.cameraGridSize + CAMERA_GRID_PADDING;
            const maxCamsThatFit = Math.floor(elWidth / cameraWidth);
            const numCamsPerRow = maxCamsThatFit >= this.props.cameras.size ? this.props.cameras.size : maxCamsThatFit;
            videosContainerWidth = numCamsPerRow * cameraWidth;
        } else {
            videosContainerWidth = 'auto';
        }

        this.setState({ videosContainerWidth });
    }


    getVideosContainerCSS() {
        return {
            width: this.state.videosContainerWidth
        };
    }

    /*
     * Using bound method vs inline to set cameraGridElement ref. Using inline in
     * render method below causes cameraGridElement to be set to null, and the the correct
     * value, on every render.
     * See: https://facebook.github.io/react/docs/refs-and-the-dom.html#caveats
     */
    setCameraGridElement(el: HTMLElement) {
        console.log("CameraGrid - setCameraGridElement", el);
        this.cameraGridElement = el;
    }

    render() {
        return (
            <div ref={this.setCameraGridElement} className="content CameraGrid">
                <div className="contextMenu">
                    <LiveTime formatString='dddd, MMMM Do YYYY, h:mm:ss a'/>
                    <GridLayoutControls
                        gridSize={this.props.cameraGridSize}
                        updateAppState={this.props.updateAppState} />
                </div>

                <div id="cameraGrid" className={`size-${this.props.cameraGridSize}`}>
                    <div className="videos" style={this.getVideosContainerCSS()}>
                        {this.renderCameras()}
                    </div>
                </div>
            </div>
        );
    }
}

export default CameraGrid;
