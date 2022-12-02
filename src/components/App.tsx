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

import CameraGrid from './CameraGrid';
import LiveViewer from './LiveViewer';
import ClipsViewer, {Clip, ClipsQueryDetail} from './ClipsViewer';
import {SighthoundRemoteXMLRPC} from './../sighthoundxmlrpc';
import {Camera, Rule} from './../sighthound';

import * as Promise from 'bluebird';
import * as _ from 'underscore';
import fecha from 'fecha';

import {
  HashRouter as Router,
  Route,
  Link,
  NavLink,
  Redirect,
  Switch
} from 'react-router-dom';

import * as url from 'url';

require('../styles/App.scss');
require('../styles/sighthound-desktop.scss');
console.log("done");

interface AppProps {}
interface AppState {
    cameras: Map<string, Camera>;
    clipList: Map<string, Map<string, Map<string, {
                    lastSearchTime: number,
                    lastClipIndex: number,
                    initialClipCount: number,
                    currentClipCount: number,
                    clips: Map<string, Clip>
                }>>>;
    temp?: Camera;
    layout: Layout;
    liveViewerHasURL: boolean;
    gridViewSortOrder: number | string[];
    svHost?: string;
}

interface SHWindow extends Window {
    sighthoundXMLRPC: SighthoundRemoteXMLRPC;
}

interface Layout {
    cameraGridSize: number; // what size camera image for grid view
}

const CAMERAS_RULES_REFRESH_MS = 30000; // How often to get cameras and rules from server
const NAME_DESCENDING = 0;
const NAME_ASCENDING = 1;

class App extends React.Component<AppProps, AppState> {
    sighthoundXMLRPC: SighthoundRemoteXMLRPC;
    camerasAndRulesRefreshInterval: number;

    constructor(props: AppProps) {
        super(props);
        this.state = {
            layout: this.getLayoutFromLocalStorage(),
            cameras: new Map(),

            clipList: new Map(),
            liveViewerHasURL: false,
            gridViewSortOrder: []
        };

        this.getRulesForCamera = this.getRulesForCamera.bind(this);
        this.getAllCamerasAndRules = this.getAllCamerasAndRules.bind(this);
        this.handleTurnCameraOnOff = this.handleTurnCameraOnOff.bind(this);
        this.handleTurnRuleOnOff = this.handleTurnRuleOnOff.bind(this);
        this.handleCameraRefreshRequest = this.handleCameraRefreshRequest.bind(this);
        this.turnAllCamerasOnOrOff = this.turnAllCamerasOnOrOff.bind(this);
    }

    componentDidMount() {
        const href = url.parse(document.location.href);
        const protocol = href.protocol.replace(':','');
        const hostname = href.hostname;
        const port = href.port || '443'; // href.port may be undefined if HTTPS

        this.sighthoundXMLRPC =  new SighthoundRemoteXMLRPC(protocol, '/xmlrpc/', hostname, parseInt(port));

        // For Debugging only
        (window as SHWindow).sighthoundXMLRPC = this.sighthoundXMLRPC;
        this.sighthoundXMLRPC.ping();
        this.getAllCamerasAndRules();
        this.setRootDomain(protocol, hostname, port);
        this.startRefreshIntervalForCamerasAndRules();
    }

    componentDidUpdate(prevProps: AppProps, prevState: AppState) {
        if (prevState.layout !== this.state.layout) {
            localStorage.setItem('layout', JSON.stringify(this.state.layout));
        }
    }

    startRefreshIntervalForCamerasAndRules() {
        console.log("App - refreshing cameras and rules");
        if (this.camerasAndRulesRefreshInterval) clearInterval(this.camerasAndRulesRefreshInterval);
        window.setInterval(() => {
            this.getAllCamerasAndRules();
        }, CAMERAS_RULES_REFRESH_MS);
    }

    setRootDomain(protocol: string, hostname: string, port: string) {
        this.setState(
            {svHost: `${protocol}://${hostname}:${port}`}
        );
    }

    getLayoutFromLocalStorage() {
        const layout = localStorage.getItem('layout');
        if (layout) return JSON.parse(layout);
        return { cameraGridSize: 303 };
    }

    getRulesForCamera(cameraName: string) {
        console.log("App - getRulesForCamera for camera", cameraName);
        this.sighthoundXMLRPC.getDetailedRulesForCamera(cameraName).then(
            (rules: Rule[]) => {
                this.setState((prevState)=>{
                    const cameras = new Map(prevState.cameras);
                    const camera = new Camera(this.sighthoundXMLRPC, cameras.get(cameraName));
                    camera.rules = rules;
                    cameras.set(cameraName, camera);
                    return {cameras};
                }, () => console.log("**** APP - done setting camera rules state", this.state.cameras));
            }
        );
    }

    getAllCamerasAndRules() {
        console.warn("getAllCamerasAndRules");
        this.sighthoundXMLRPC.getAllCamerasAndRules().then(
            (cameras: Camera[]) => {
                console.log("Cameras starting to process", cameras);
                const camerasKeyValue =
                        cameras.map((camera) => {
                            const cameraInstance = new Camera(this.sighthoundXMLRPC, camera);
                            console.log("camera state", cameraInstance.getCameraState());
                            console.log("APP - camera thumb uri", cameraInstance.getThumbnailSrc());
                            const temp = [camera.name, cameraInstance];
                            return temp;
                        });

                this.setState({
                    cameras: new Map(camerasKeyValue.sort() as [string, Camera][])
                }, () => console.log("**** APP - done setting cameras state"));
            }
        );
    }

    getActiveCameras() {
        const activeCameras = new Map();
        this.state.cameras.forEach((camera: Camera) => {
            if (!camera.active || camera.frozen) return;
            activeCameras.set(camera.name, camera);
        });

        return activeCameras;
    }

    getFirstLiveCameraName() {
        if (!this.state.cameras) return '';
        let firstActiveName = '';
        let firstLiveName = '';
        for (let camera of this.state.cameras.values()) {
            if (!camera.active) continue;
            if (!firstActiveName.length) firstActiveName = camera.name;
            if (!camera.liveH264Uri) continue;
            if (camera.status === 'failed') continue;
            firstLiveName = camera.name;
            break;
        }

        return firstLiveName.length ? firstLiveName : firstActiveName;
    }

    updateAppState(stateObj: AppState) {
        console.warn("updating app state", stateObj);
        this.setState(stateObj);
    }

    handleCameraRefreshRequest(cameraName: string) {
        // Get single camera details from server and update it's state
        console.log("app - handleCameraRefreshRequest for camera", cameraName);
        this.sighthoundXMLRPC.getCameraDetailsAndRules(cameraName).then((result: Camera)=>{
            console.log("app - handleCameraRefreshRequest result", result);
            this.setState((prev) => {
                return {cameras: new Map(([...prev.cameras, [result.name, new Camera(this.sighthoundXMLRPC, result)]] as [[string, Camera]]).sort())};
            });
            return;
        });

        return true;
    }

    handleTurnCameraOnOff(cameraName: string, turnOn: boolean) {
        console.log("app - handleTurnCameraOnOff", cameraName, turnOn);
        if (turnOn) {
            this.sighthoundXMLRPC.turnCameraOn(cameraName).then((result: any)=> {
                console.log("app turn camera on", result);
                this.handleCameraRefreshRequest(cameraName);
            });
        } else {
            this.sighthoundXMLRPC.turnCameraOff(cameraName).then((result: any)=> {
                console.log("app turn camera off", result);
                this.handleCameraRefreshRequest(cameraName);
            });
        }
    }

    handleTurnRuleOnOff(ruleName: string, turnOn: boolean, cameraName: string) {
        console.log("app - handleTurnRuleOnOff", ruleName, turnOn);
        this.sighthoundXMLRPC.enableRule(ruleName, turnOn).then(()=>{
            this.handleCameraRefreshRequest(cameraName);
        });
    }

    turnAllCamerasOnOrOff(turnOn: boolean) {
        let cameraPromises: any = [];

        for (let cameraName of this.state.cameras.keys()) {
            if (turnOn) {
                cameraPromises.push(this.sighthoundXMLRPC.turnCameraOn(cameraName));
            } else {
                cameraPromises.push(this.sighthoundXMLRPC.turnCameraOff(cameraName));
            }
        }

        Promise.all(cameraPromises).then(() => {
            console.log("all the cameras were turned", turnOn ? 'on.' : 'off.');
            this.getAllCamerasAndRules();
        });
    }

    getCameraByName(cameraName: string) {
        if (!this.state.cameras.size) return;
        return this.state.cameras.get(cameraName);
    }

    getCameraCount() {
        let cameraCount = {
            total: 0,
            turnedOn: 0
        };

        if (this.state.cameras.size > 0) {
            this.state.cameras.forEach((camera: Camera) => {
                if (!camera) return;
                if (camera.active && !camera.frozen)
                    cameraCount.total++;

                if (camera.active && camera.enabled)
                    cameraCount.turnedOn++;
            });
        }

        return cameraCount;
    }

    renderClipViewer(cameraName?: string, ruleName?: string, searchYYYYMMDD?: string, reactRouter?: any): JSX.Element {
        console.log("renderClipViewer", this.sighthoundXMLRPC);
        if (!this.sighthoundXMLRPC || !this.state.cameras || !this.state.clipList) {
            console.log("returning null");
            return null;
        }

        const activeCameras = this.getActiveCameras();

        if (!cameraName) {
            // If only one camera exists, use it instead of 'Any Camera'
            // TODO - wait until cameras exist before rendering ClipsViewer
            cameraName = this.getActiveCameras().size === 1 ? activeCameras.keys().next().value : 'Any camera';
        }
        if (!ruleName) ruleName = 'All objects';
        if (!searchYYYYMMDD) searchYYYYMMDD = fecha.format(Date.now(), 'YYYYMMDD');

        console.log("returning clipsviewer");
        return (
            <ClipsViewer
                    cameras={this.state.cameras}
                    cameraName={cameraName}
                    ruleName={ruleName}
                    searchYYYYMMDD={searchYYYYMMDD}
                    clipList={this.state.clipList}
                    getCamerasAndRules={this.getAllCamerasAndRules}
                    getThumbnailUri={this.sighthoundXMLRPC.getClipThumbnailURIs.bind(this)}
                    getClipUri={this.sighthoundXMLRPC.getClipURI.bind(this)}
                    getClipUriForDownload={this.sighthoundXMLRPC.getClipURIForDownload.bind(this)}
                    rpcGetClipsForCameraRule={this.sighthoundXMLRPC.getClipsForCameraRule.bind(this)}
                    submitClipToSighthound={this.sighthoundXMLRPC.submitClipToSighthound.bind(this)}
                    updateAppState={this.updateAppState.bind(this)}
                    routerHistory={reactRouter.history} />
        );
    }

    render() {
        console.log("App - render");
        const cameraCount = this.getCameraCount();
        const offButtonStyle = cameraCount.turnedOn === 0 ? 'button active' : 'button';
        const onButtonStyle = cameraCount.turnedOn === cameraCount.total ? 'button active' : 'button';
        return (
            <Router>
                <div className="App">
                    <div className="container">
                        <div className="header">
                            <div className="logo"><Link to="/"><img src="img/logo.png" height="80" /></Link></div>

                            <div className="pageNav buttonBar">
                                <NavLink to="/" exact className="button" activeClassName="active">Grid</NavLink>
                                <NavLink to="/live" className="button" activeClassName="active">Live</NavLink>
                               <NavLink to="/clips" className="button" activeClassName="active">Clips</NavLink>
                            </div>

                            <div className="on-off buttonBar">
                                <a id="allOffButton" className={offButtonStyle} onClick={()=>this.turnAllCamerasOnOrOff(false)}>Off</a>
                                <a id="allOnButton" className={onButtonStyle} onClick={()=>this.turnAllCamerasOnOrOff(true)}>On</a>
                            </div>

                            <div className="cameras">
                                All Cameras<br />
                                <strong>
                                    <span id="liveCameraCount"></span>{cameraCount.turnedOn}/
                                    <span id="totalCameraCount">{cameraCount.total}</span>
                                    <span className="expressive"> ON</span>
                                </strong>
                            </div>

                        </div>
                        <Switch>
                            <Route exact path='/' render={(props) => (
                                <CameraGrid
                                    cameraGridSize={this.state.layout.cameraGridSize}
                                    cameras={this.getActiveCameras()}
                                    onCameraRefreshRequest={this.handleCameraRefreshRequest}
                                    updateAppState={this.updateAppState.bind(this)}/>
                            )}/>
                            <Route exact path='/live'render={()=>( <Redirect to={`/live/${this.getFirstLiveCameraName()}`}/> )} />
                            <Route path='/live/:cameraName' render={(props) => (
                                <LiveViewer
                                    selectedCameraName={props.match.params.cameraName}
                                    cameras={this.state.cameras}
                                    getRulesForCamera={this.getRulesForCamera}
                                    refreshCamera={this.handleCameraRefreshRequest}
                                    onTurnCameraOnOff={this.handleTurnCameraOnOff}
                                    onTurnRuleOnOff={this.handleTurnRuleOnOff}
                                    svHost={this.state.svHost} />
                            )}/>
                             <Route path='/clips/:cameraName?/:ruleName?/:searchYYYYMMDD?' render={(props) => (
                                this.renderClipViewer(props.match.params.cameraName, props.match.params.ruleName, props.match.params.searchYYYYMMDD, props)
                            )} />
                            <Route render={()=>( <Redirect to="/"/> )} />
                        </Switch>
                    </div>
                </div>
            </Router>
        );
    }
}

export default App;
