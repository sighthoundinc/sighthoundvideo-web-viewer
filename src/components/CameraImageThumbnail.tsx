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
import {Camera} from './../sighthound';
const md5 = require('md5');

interface Props {
    camera: Camera;
    width?: number;
    className?: string;
    pollingMs?: number;
    onError?: ()=>void;
}

interface State {
    imageUri: string;
    imageAspectRatio?: number;
}

class CameraImageThumbnail extends React.Component<Props, State> {
    retryTimout: number;
    imageElement: HTMLImageElement;

    constructor(props: Props) {
        super(props);
        this.state = {
            imageUri: this.props.camera.getThumbnailSrc(),
            imageAspectRatio: 4/3
        };

        if (this.props.pollingMs) {
            console.log("Constructor kicking off image polling", this.props.pollingMs);
            this.startImagePolling(this.props.pollingMs);
        }
    }

    componentWillReceiveProps(nextProps: Props) {
        console.log("CameraImageThumbnail - CWRP: nextProps.camera != this.props.camera", nextProps.camera != this.props.camera);
        if (nextProps.camera !== this.props.camera){
            console.log("CWRP - getting new uri");
            this.setState({
                imageUri: nextProps.camera.getThumbnailSrc()
            });
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        const cameraState = this.props.camera.getCameraState();
        if (this.props.pollingMs && (cameraState === Camera.STATES.CONNECTING || cameraState === Camera.STATES.CONNECTED)) {
            this.startImagePolling(this.props.pollingMs);
        }
    }

    componentWillUnmount() {
        console.log("CameraImageThumbnail - CWUN", this.retryTimout);
        clearTimeout(this.retryTimout);
    }

    startImagePolling(pollingMs: number) {
        console.log("CameraImageThumbnail - startImagePolling", this.props.camera.name);
        clearTimeout(this.retryTimout);
        this.retryTimout = window.setTimeout(() => {
            console.log("CameraImageThumbnail - startImagePolling - running setState", this.props.camera.name);
            this.setState({
                imageUri: this.props.camera.getThumbnailSrc() + '?' + Date.now()
            });
        }, pollingMs);
    }

    onImageError() {
        console.log("CameraImageThumbnail - onImageError", this.props.onError, this.props.pollingMs, this.props.camera.liveJpegUri);
        this.setState({
            imageUri: '/img/connecting.gif'
        }, () => {
            if (this.props.onError) {
                this.props.onError();
            } else if (!this.props.pollingMs) {
                this.startImagePolling(1000);
            }
        });
    }

    getImageClass() {
        const aspectRatioCSS = this.state.imageAspectRatio <= 4/3 ? "tall" : "wide";
        return this.props.className ? this.props.className + " " + aspectRatioCSS : aspectRatioCSS;
    }

    onImageLoad() {
        if (!this.imageElement || !this.imageElement.naturalHeight) return;
        const aspectRatio = this.imageElement.naturalWidth / this.imageElement.naturalHeight;
        if (aspectRatio === this.state.imageAspectRatio) return;
        this.setState({
            imageAspectRatio: aspectRatio
        });
    }

    render() {
        return (
            <img
                ref={el => this.imageElement = el}
                src={this.state.imageUri}
                className={this.getImageClass()}
                onError={this.onImageError.bind(this)}
                onLoad={this.onImageLoad.bind(this)} />
        );
    }
}

export default CameraImageThumbnail;
