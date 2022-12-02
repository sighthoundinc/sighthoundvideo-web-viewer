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
import CamerasScrollingList from './CamerasScrollingList';
import MessageOverlay from './MessageOverlay';
import {Camera, Rule} from './../sighthound';

const videojs = require('video.js');
import {Link} from 'react-router-dom';
import 'whatwg-fetch';

require('../styles/LiveViewer.scss');

interface Props {
    cameras: Map<string, Camera>;
    selectedCameraName: string;
    getRulesForCamera: (cameraName: string) => void;
    onTurnRuleOnOff?: (ruleName: string, turnOn: boolean, cameraName: string) => void;
    onTurnCameraOnOff?: (cameraName: string, turnOn: boolean) => void;
    refreshCamera: (cameraName: string)=>{};
    svHost: string;
}

interface State {
    rulesRequested: boolean;
    m3u8ReadyUri?: string;
    showPlayButton: boolean;
}

class LiveViewer extends React.Component<Props, State> {
    htmlVideoElement: HTMLVideoElement;
    videoPlayer: any;
    m3u8Requested: boolean;
    m3u8Retry: number;
    cameraRefreshTimeout: number;
    isSafari: boolean;

    constructor(props: Props) {
        super(props);
        console.log("Live Viewer props", this.props);

        let rulesRequested = false;

        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        if (camera) {
            rulesRequested = true;
            this.props.getRulesForCamera(camera.name);
        }

        this.state = {
            rulesRequested: rulesRequested,
            showPlayButton: false
        };

        this.m3u8Requested = false;
        this.isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    }

    componentWillReceiveProps(nextProps: Props) {
        const nextCamera = this.getSelectedCamera(nextProps.cameras, nextProps.selectedCameraName);
        const currentCamera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("LiveViewer - ComponentWillReceiveProps", this.props.selectedCameraName, nextProps.selectedCameraName, currentCamera, nextCamera, currentCamera === nextCamera);

        if (currentCamera && nextCamera && !this.areCamerasDetailsTheSame(currentCamera, nextCamera)) {
            console.log("LiveViewer - ComponentWillReceiveProps. inside of if. set state");
            if (this.videoPlayer) this.disposeVideoPlayer();
            this.setState({
                m3u8ReadyUri: undefined
            });
        }

        if (currentCamera && nextCamera && nextCamera.name !== currentCamera.name) {
            clearTimeout(this.cameraRefreshTimeout);
            this.props.refreshCamera(nextCamera.name);
        } else if (nextCamera && nextCamera.enabled && nextCamera.liveH264Uri === '') {
            clearTimeout(this.cameraRefreshTimeout);
            this.cameraRefreshTimeout = window.setTimeout(()=> {
                console.log("cameraRefreshTimeout - Refreshing CAmera", nextCamera.name);
                this.props.refreshCamera(nextCamera.name);
            }, 2500);
        }
    }

    areCamerasDetailsTheSame(cam1: Camera, cam2: Camera) {
        return cam1.enabled === cam2.enabled && cam1.name === cam2.name &&
               cam1.status === cam2.status && cam1.liveH264Uri === cam2.liveH264Uri;
    }

    getSelectedCamera(cameras: Map<string, Camera>, selectedCameraName: string) {
        if (cameras && selectedCameraName &&
            cameras.has(selectedCameraName)) {
                return cameras.get(selectedCameraName);
        }

        return;
    }

    preloadM3u8(uri: string) {
        clearTimeout(this.cameraRefreshTimeout);
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("preload M3U8. checking for props.", uri, camera);
        if (!camera || !camera.liveH264Uri) return;
        if (this.state.m3u8ReadyUri === camera.liveH264Uri) {
            console.log("m3u8ReadyUri already exists. skipping preload", this.state.m3u8ReadyUri);
            return;
        }
        if (this.m3u8Retry) clearTimeout(this.m3u8Retry);
        console.warn("preloadM3U8", this.props.svHost, camera.liveH264Uri);
        this.m3u8Requested = true;

        fetch(this.props.svHost + uri, {credentials: 'same-origin'})
            .then((res) => {
                console.log("preload - fetch m3u8 response:", res);
                this.m3u8Requested = false;
                if (res.status !== 200) {
                    // retry in 3 seconds
                    console.warn("M3U8 NOT READY. Reloading in 3 seconds");
                    this.m3u8Retry = window.setTimeout(() => {this.preloadM3u8(uri + '/?retry');}, 3000);
                } else {
                    this.setState({ m3u8ReadyUri: camera.liveH264Uri });
                }
            })
            .catch((err)=> {
                console.error("Fetch error for m3u8. Retrying.", err);
                this.m3u8Requested = false;
                this.m3u8Retry = window.setTimeout(() => {this.preloadM3u8(uri + '/?retry');}, 3000);
            });
    }

    componentDidMount() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        if (camera && camera.liveH264Uri) {
            this.preloadM3u8(camera.liveH264Uri);
        }
    }

    componentWillUpdate(nextProps: Props, nextState: State) {
        console.log("LiveViewer - ComponentWillUpdate");
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        // Update VJS with any changes here
        console.log("LiveViewer - CDU", JSON.stringify(this.props.selectedCameraName), JSON.stringify(prevProps.selectedCameraName));
        if (!camera) return;
        if (this.state.m3u8ReadyUri === camera.liveH264Uri) {
            this.playVideo(Date.now().toString());
        }

        if (camera && camera.liveH264Uri && this.state.m3u8ReadyUri !== camera.liveH264Uri && !this.m3u8Requested) {
            if (this.videoPlayer) this.disposeVideoPlayer();
            this.preloadM3u8(camera.liveH264Uri);
        }

        this.getCameraRules();
    }

    componentWillMount() {
        console.log("LiveViewer - ComponentWillMount", this.props.selectedCameraName);
        clearTimeout(this.cameraRefreshTimeout);
    }

    componentWillUnmount() {
        console.log("LiveViewer - ComponentWillUnmount");
        // Unmount VJS and cleanup
        if (this.videoPlayer) this.disposeVideoPlayer();
        if (this.m3u8Retry) clearTimeout(this.m3u8Retry);
        this.htmlVideoElement = undefined;
        this.videoPlayer = undefined;

    }

    disposeVideoPlayer() {
        console.log("Disposing of video player");
        this.videoPlayer.dispose();
        this.videoPlayer = undefined;
    }

    initVideoJs() {
        console.log("Initializing Video JS");
        // Initialize VJS
        const vjsOptions= {
            plugins: {
                reloadSourceOnError: {}
            },
            controls: true,
            techOrder: ['html5', 'flash'],
            flash: {
                swf: '/videojs/video-js.swf'
            },
            autoplay: true
        };

        this.videoPlayer = videojs(this.htmlVideoElement, vjsOptions, ()=>{
            console.log("VJS Ready");
        });

        /**
         * Safari 11 stopped auto-playing videos. The following will show
         * VideoJS's big play button if the video player is paused.
         */
        if (this.isSafari) {
            this.videoPlayer.on('timeupdate', () => {
                if (this.videoPlayer.paused()) {
                    this.setState({ showPlayButton: true });
                } else if (this.state.showPlayButton) {
                    this.setState({ showPlayButton: false });
                }
            });
        }
    }

    getCameraRules() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);

        if (!camera || !camera.name || this.state.rulesRequested) return;

        console.log("LiveViewer - GetCameraRules called");
        this.setState({
            rulesRequested: true
        }, () => this.props.getRulesForCamera(camera.name));
    }

    turnOffCamera() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("LIveViewer - turn off camera");
        this.props.onTurnCameraOnOff(camera.name, false);
    }

    turnOnCamera() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("LIveViewer - turn On camera");
        this.props.onTurnCameraOnOff(camera.name, true);
    }

    turnOffRule(ruleName: string) {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("turning off rule", ruleName);
        this.props.onTurnRuleOnOff(ruleName, false, camera.name);
    }

    turnOnRule(ruleName: string) {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("turning on rule", ruleName);
        this.props.onTurnRuleOnOff(ruleName, true, camera.name);
    }

    playVideo(message: string) {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("Playvideo(" + message + ") called", this.props, this.state.m3u8ReadyUri);
        if (!camera || !camera.liveH264Uri) {
            console.log("PlayVideo() Not ready", JSON.stringify(camera));
            return;
        }

        if (camera.liveH264Uri === this.state.m3u8ReadyUri) {
            console.log("videoUrl source set. playing now", this.videoPlayer);
            if (!this.videoPlayer) {
                console.log("!this.videoPlayer. init and play");
                this.initVideoJs();
                this.videoPlayer.src({src: this.state.m3u8ReadyUri, type: "application/x-mpegURL"});
                this.videoPlayer.play();
            }
        }
    }

    getCameraName() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        if (!camera) return '';
        return camera.name;
    }

    renderRules() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);

        if (!camera || !camera.rules) return;

        return camera.rules.map((rule: Rule) => {
            return (
                <div id="cameraRuleList" className="rules" key={rule.name}>
                    <div className="rule">

                        <div className="ruleIcon">
                            <img src="img/iconRule.png" />
                        </div>

                        <div className="ruleDescription">
                            <strong>{rule.name}</strong>
                            <br />
                            {rule.schedule}
                        </div>
                        <Link to={`/clips/rule/${rule.name}`}>
                            <Link to={`/clips/${camera.name}/${rule.name}`}><span className="view-clips">View Clips ></span></Link>
                        </Link>
                    </div>
                    <div className="on-off buttonBar enableRule"
                        data-rule-name=""
                        data-rule-index="">
                    <a onClick={()=> this.turnOffRule(rule.name) } className={rule.enabled ? 'button' : 'button active'}>Off</a>
                    <a onClick={()=> this.turnOnRule(rule.name)} className={rule.enabled ? 'button active' : 'button'}>On</a>
                    </div>
                </div>
            );
        });
    }

    renderCameraOnOffButton() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);

        let offClass = 'button';
        let onClass = 'button';

        if (camera) {
            if (camera.enabled) {
                onClass += ' active';
            } else {
                offClass += ' active';
            }
        }

        return (
            <div className="on-off buttonBar">
                <a onClick={this.turnOffCamera.bind(this)}  id="camera_off" className={offClass}>Off</a>
                <a onClick={this.turnOnCamera.bind(this)}  id="camera_on" className={onClass}>On</a>
            </div>
        );
    }

    renderVideoPlayer() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        console.log("render videoPlayer camera", camera);
        if (!camera) return;

        const wrapperClass = this.state.showPlayButton ? "paused" : "";
        console.log("if camera.liveH264Uri === this.state.m3u8ReadyUri", camera.liveH264Uri, this.state.m3u8ReadyUri, camera.liveH264Uri === this.state.m3u8ReadyUri);
        if (camera.liveH264Uri === this.state.m3u8ReadyUri) {
            return (
                <div className={wrapperClass}>
                    <video id="liveVideo" ref={(c) => this.htmlVideoElement = c } controls className="video-js vjs-default-skin"></video>
                </div>
            );
        }

        if (this.videoPlayer) this.videoPlayer.dispose();
        console.warn("Not rendering video player");
        return;
    }

    renderMessageOverlay() {
        const messageProps = this.getMessageOverlayContents();
        if (!messageProps) return;
        return <MessageOverlay {...messageProps} />;

    }

    getMessageOverlayContents(): {title: string, message?: string, showSpinner?: boolean} {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);
        if (!camera) return {title: 'Loading Camera', message: '', showSpinner: true};
        if (!camera.enabled) return {title: 'Camera is Off'};
        if (camera.status === 'failed') return {title: 'Could Not Connect'};
        if (camera.status === 'on' || camera.status === 'off') return {title: 'No Active Rules', message: 'Make sure at least one rule is enabled below and scheduled to run.'};
        if (camera.liveH264Uri === this.state.m3u8ReadyUri) return;
        return {title: 'Connecting', showSpinner: true};
    }


    render() {
        const camera = this.getSelectedCamera(this.props.cameras, this.props.selectedCameraName);

        console.log("LiveViewer rendered", JSON.stringify(this.props));
        return (

            <div id="liveViewer">
                <div className="content LiveViewer">
                    <div className="clipsMenu">
                        <div className="clipsNavigation">
                            <div className="clipsNavigationContainer">
                                <div className="clipsDate">
                                    <span id="clipDay">Cameras</span>
                                </div>
                            </div>
                        </div>

                        <CamerasScrollingList
                            cameras={this.props.cameras}
                            selectedCamera={camera} />

                    </div>
                    <div className="vp-content">
                        <div className="contextMenu">
                            <div className="title">
                                <a id="cameraName" className="ellipsis">{this.getCameraName()}</a>
                            </div>

                            <div id="live_right_time">
                                <div id="liveTime" className="date"></div>

                                {this.renderCameraOnOffButton()}

                            </div>
                        </div>

                        <div className="liveVideoContainer">
                            {this.renderMessageOverlay()}
                            {this.renderVideoPlayer()}

                        </div>

                        {this.renderRules()}
                    </div>
                </div>
            </div>
        );
    }
}

export default LiveViewer;
