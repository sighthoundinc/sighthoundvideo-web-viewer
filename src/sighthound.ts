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

import {SighthoundRemoteXMLRPC, arrayToEpoch, epochDaysAgo} from './sighthoundxmlrpc';
import * as _ from 'underscore';
import * as Promise from 'bluebird';

/*********************************************************************************/
// Sighthound First Class Objects
/*********************************************************************************/

export interface RuleXmlrpcObject {
    name: string;
    enabled: boolean;
    schedule: string;
}

export interface Rule {
    name: string;
    schedule: string;
    enabled: boolean;
}

interface CameraXmlrpcObject {
    name: string;
    active: boolean;
    enabled: boolean;
    frozen: boolean;
    liveJpegUri: string;
    liveH264Uri: string;
    sighthoundXMLRPC: any;
    status: string;
    rules?: RuleXmlrpcObject[];
}

enum CameraState {
    OFF,
    CONNECTING,
    CONNECTED,
    FAILED,
    NO_SCHEDULED_RULES,
    UNKNOWN
}

export class Camera {
    static STATES = CameraState;

    name: string;
    active: boolean;
    enabled: boolean;
    frozen: boolean;
    liveJpegUri: string;
    liveH264Uri: string;
    sighthoundXMLRPC: any;
    status: string;
    rules: RuleXmlrpcObject[];

    constructor(sighthoundXMLRPC: SighthoundRemoteXMLRPC, camera: Camera);
    constructor (sighthoundXMLRPC: SighthoundRemoteXMLRPC, cameraObj: CameraXmlrpcObject);

    constructor(sighthoundXMLRPC: SighthoundRemoteXMLRPC, camera: Camera | CameraXmlrpcObject ) {
        console.log("Camera constructor", camera);
        this.name = camera.name;
        this.active = camera.active;
        this.enabled = camera.enabled;
        this.frozen = camera.frozen;
        this.liveJpegUri = camera.liveJpegUri || '';
        this.liveH264Uri = camera.liveH264Uri || '';
        this.sighthoundXMLRPC = sighthoundXMLRPC;
        this.status = camera.status;
        this.rules = camera.rules;
    }

    getCameraState() {
        if (!this.enabled) return Camera.STATES.OFF;
        if (this.status === 'failed') return Camera.STATES.FAILED;
        if (this.status === 'on' || this.status === 'off') return Camera.STATES.NO_SCHEDULED_RULES;
        if (this.liveH264Uri === '') return Camera.STATES.CONNECTING;
        return Camera.STATES.CONNECTED;
    }

    getThumbnailSrc() {
        console.log("Camera getThumbnailSrc", this);
        switch(this.getCameraState()) {
            case Camera.STATES.OFF:
                return '/img/cameraOff.jpg';
            case Camera.STATES.FAILED:
                return 'img/could-not-connect.png';
            case Camera.STATES.NO_SCHEDULED_RULES:
                return 'img/noRules.jpg';
            case Camera.STATES.CONNECTING:
                return '/img/connecting.gif';
            case Camera.STATES.CONNECTED:
                return this.liveJpegUri;
            default:
                console.error("Camera - getThumbnailSrc returning default connecting image", this.getCameraState(), this);
                return '/img/connecting.gif';
        }
    }
}
