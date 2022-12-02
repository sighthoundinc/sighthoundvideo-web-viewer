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
import {Link} from 'react-router-dom';
import CameraImageThumbnail from './CameraImageThumbnail';
import {Camera} from './../sighthound';

interface Props {
    camera: Camera;
    imageRefreshTime: number; // How many milliseconds between refreshes
    onCameraRefreshRequest: (name: string) => {};
    width: number;
}

interface State {}

const MAX_REFRESH_RANDOMINZER = 400; // Max Milliseconds to add to image request
const CAMERA_PROPS_REFRESH_MS = 1000; // How often to request camera update from server when needed

class CameraMJPG extends React.Component<Props, State> {
    refreshTimeout: number;

    constructor(props: Props) {
        super(props);
        console.log("CameraMJPG contructor", this.props.camera);

        let initialImageUrl: string;
        const camera = this.props.camera;
        this.refreshCameraProps();
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        console.log("CameraMJPG CWRP - prevProps.camera === this.props.camera", prevProps.camera === this.props.camera);
        if (prevProps.camera === this.props.camera) return;
        this.refreshCameraProps();
    }

    componentWillUnmount() {
        console.log("CameraMJPG CWUN", this.refreshTimeout);
        clearTimeout(this.refreshTimeout);
    }

    refreshCameraProps() {
        clearTimeout(this.refreshTimeout);
        const cameraState = this.props.camera.getCameraState();
        console.log("CameraMJPG - refreshCameraProps - name, cameraState", this.props.camera.name, cameraState);
        if (cameraState === Camera.STATES.CONNECTING) {
            console.log("CameraMJPG - setting refreshCameraProps");
            this.refreshTimeout = window.setTimeout(() => {
                console.log("CameraMJPG - refreshCameraProps - Calling server now.");
                this.props.onCameraRefreshRequest(this.props.camera.name);
            }, CAMERA_PROPS_REFRESH_MS);
        }
    }

    onImageError() {
        this.props.onCameraRefreshRequest(this.props.camera.name);
    }

    render() {
        return (
            <div className={`cameraVideo`} style={{width: this.props.width}}>
                <Link to={`/live/${this.props.camera.name}`}>

                    <div
                        className="videoImgContainer"
                        style={{
                            height: this.props.width * 0.75,
                            width: this.props.width,
                            lineHeight: this.props.width * 0.75 + 'px',
                            textAlign: 'center'
                        }}>
                        <CameraImageThumbnail
                                camera={this.props.camera}
                                pollingMs={1000}
                                onError={this.onImageError.bind(this)} />
                    </div>
                    <div className="cameraTitle">
                        <span>{`${this.props.camera.name}`}</span>
                    </div>
                </Link>
            </div>
        );
    }
}

export default CameraMJPG;
