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

/*********************************************************************************/
// Sighthound API - includes mimic xmlrpc code, then Sighthound API code.
/*********************************************************************************/
const xmlrpc = require('xmlrpc');
import * as Promise from 'bluebird';

function nowEpoch( ){ return new Date().getTime() / 1000;}

export function epochDaysAgo(days: number){ return new Date().getTime() / 1000 - 86400*days;}

export function arrayToEpoch( a: number[] ) {
    return a[0]+(a[1]/1000);
}

Promise.config({
    cancellation: true
});

export class SighthoundRemoteXMLRPC {
    uri: string;
    host: string;
    port: number;
    protocol: string;
    leadingURI: string;
    xrr: any;
    requestID: number;

    constructor (protocol: string, uri: string, host: string, port: number) {
        this.uri = uri;
        this.host = host;
        this.port = port;
        this.protocol = protocol;
        this.leadingURI = this.protocol + "://" + this.host + ":" + this.port;
        this.xrr = xmlrpc.createClient({ host, port, path: '/xmlrpc/' });
        this.requestID = Math.floor(Math.random()*1000);

        this.getClipThumbnailURIs = this.getClipThumbnailURIs.bind(this);
        this.getClipURIBase = this.getClipURIBase.bind(this);
        this.getClipURI = this.getClipURI.bind(this);
        this.getClipURIForDownload = this.getClipURIForDownload.bind(this);
        this.getClipsForCameraRule = this.getClipsForCameraRule.bind(this);
        this.getCameraDetailsAndRules = this.getCameraDetailsAndRules.bind(this);
    }

    ping() {
        return new Promise((resolve, reject) => {
            let result = false;
            try {
                this.xrr.methodCall('ping', [], (error: string, value: string) => {
                    if (error) {
                        console.log("**** ping response - ERROR: ", error);
                    } else {
                        console.log("**** ping response - success value", value);
                        result = value !== null ? true : false;
                    }
                });
            } catch(TypeError) {
                // result = false;
            } finally {
                resolve(result);
            }
        });
    }

    getActiveCamerasAndUris() {
        console.log("getActiveCamerasAndUris method");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetActiveCamerasAndUris', [this.requestID], (error: string, value: string) => {
                if (error) {
                    console.log("**** getActiveCamerasAndUris response - getActiveCamerasAndUris failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** 1 getActiveCamerasAndUris response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getActiveCamerasAndUris failed.");
                    }
                }
            });
        });
    }

    getCameraDetailsAndRules(cameraName: string) {
        /*
         * @response [status, clipsArray, numberOfClips]
         */
        console.log("getCameraDetailsAndRules method", cameraName);
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetCameraDetailsAndRules', [cameraName, this.requestID], (error: string, value: string) => {
                if (error) {
                    console.log("**** getCameraDetailsAndRules response - getCameraDetailsAndRules failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** 1 getCameraDetailsAndRules response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getCameraDetailsAndRules failed.");
                    }
                }
            });
        });
    }

    getAllCamerasAndRules() {
        console.log("getAllCamerasAndRules method");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetAllCamerasDetailsAndRules', [this.requestID], (error: string, value: string) => {
                if (error) {
                    console.log("**** getAllCamerasAndRules response - getAllCamerasAndRules failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** 1 getAllCamerasAndRules response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getAllCamerasAndRules failed.");
                    }
                }
            });
        });
    }

    getCameraNames() {
        console.log("getCamerasNames method");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetCameraNames', [], (error: string, value: string) => {
                if (error) {
                    console.log("**** remoteGetCameraNames response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** 1 remoteGetCameraNames response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getCameraNames failed.");
                    }
                }
            });
        });
    }

    getRulesForCamera(cameraName: string) {
        console.log("XMLRPC - getRulesForCamera", cameraName);
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetRulesForCamera', [cameraName], (error: string, value: string) => {
                if (error) {
                    console.log("**** getRulesForCamera response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** getRulesForCamera response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getRulesForCamera failed.");
                    }
                }
            });
        });
    }

    getDetailedRulesForCamera(cameraName: string) {
        console.log("getDetailedRulesForCamera method", cameraName);
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetDetailedRulesForCamera', [cameraName], (error: string, value: string) => {
                if (error) {
                    console.log("**** getDetailedRulesForCamera response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** getDetailedRulesForCamera response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getDetailedRulesForCamera failed.");
                    }
                }
            });
        });
    }

    getClipsForCameraRule(cameraName: string, ruleName: string, searchTime: number, numClips: number, firstClipNum: number, oldestFirst: boolean) {
        console.log("XMLRPC - getClipsForCameraRule method", cameraName, ruleName, searchTime, numClips, firstClipNum, oldestFirst );
        if (firstClipNum < 0) firstClipNum = 0;
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetClipsForRule2', [cameraName, ruleName, searchTime, numClips, firstClipNum, oldestFirst, true], (error: string, value: string) => {
                if (error) {
                    console.log("**** XMLRPC - getClipsForCameraRule response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** XMLRPC - getClipsForCameraRule response - success value", value);
                    if (value[0]) {
                        resolve(value);
                    } else {
                        reject("getDetailedRulesForCamera failed." + value[1]);
                    }
                }
            });
        });
    }

    enableRule(ruleName: any, enabled: boolean) {
        console.log("XMLRPC - enableRule method");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteEnableRule', [ruleName, enabled], (error: string, value: string) => {
                if (error) {
                    console.log("**** XMLRPC - enableRule response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** XMLRPC - enableRule response - success value", value);
                    resolve(value);
                }
            });
        });
    }

    getLiveCameras() {
        console.log("getLiveCameras method");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetLiveCameras', [], (error: string, value: string) => {
                if (error) {
                    console.log("**** getLiveCameras response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** getLiveCameras response - success value", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        reject("getLiveCameras failed.");
                    }
                }
            });
        });
    }

    getClipURIBase(methodName: string, cameraName: string, startTimeArray: any, stopTimeArray: any, mimeType: string, extras: any) {
        console.log("XMLRPC - getClipURIBase method", cameraName, startTimeArray, stopTimeArray, this.requestID, mimeType, extras );
        return new Promise((resolve, reject, onCancel) => {
            this.xrr.methodCall(methodName, [cameraName, startTimeArray, stopTimeArray, this.requestID, mimeType, extras], (error: string, value: string) => {
                if (error) {
                    console.log(methodName, ": **** XMLRPC - response -  failed.: ", error);
                    reject(error);
                } else {
                    console.log(methodName, ":**** XMLRPC - response - success ", value);
                    if (value[0]) {
                        resolve(value[1]);
                    } else {
                        // error
                        reject(methodName + ": failed.");
                    }
                }
            });
            onCancel(()=>{
                console.log(methodName, ": XMLRPC - promise cancelled");
            });
        });
    }

    submitClipToSighthound = (cameraName: string, userNote: string = "", startTimeArray: any, stopTimeArray: any) => {
        console.log("XMLRPC - submitClipToSighthound method", cameraName, userNote, startTimeArray, stopTimeArray);
        const methodName = "remoteSubmitClipToSighthound";
        return new Promise((resolve, reject, onCancel) => {
            this.xrr.methodCall(methodName, [cameraName, userNote, startTimeArray, stopTimeArray], (error: string, value: string) => {
                if (error) {
                    console.log(methodName, ": **** XMLRPC - response -  failed.: ", error);
                    reject(error);
                } else {
                    console.log(methodName, ":**** XMLRPC - response - success ", value);
                }
            });
            onCancel(()=>{
                console.log(methodName, ": XMLRPC - promise cancelled");
            });
        });
    }

    getClipURIForDownload(cameraName: string, startTimeArray: any, stopTimeArray: any, mimeType: string, extras: any) {
    	return this.getClipURIBase('remoteGetClipUriForDownload', cameraName, startTimeArray, stopTimeArray, mimeType, extras)
    }

    getClipURI(cameraName: string, startTimeArray: any, stopTimeArray: any, mimeType: string, extras: any) {
    	return this.getClipURIBase('remoteGetClipUri', cameraName, startTimeArray, stopTimeArray, mimeType, extras)
    }

    getLiveCameraJPEGURI(cameraName: string){
        console.log("***** getLiveCameraJPEGURI method", cameraName, this.requestID, "", "image/jpeg");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetCameraUri', [cameraName, this.requestID, "", "image/jpeg"], (error: string, result: string) => {
                if (error) {
                    console.log("**** getLiveCameraJPEGURI response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** getLiveCameraJPEGURI response - success result", result);
                    if (result[0]) {
                        resolve(result[1]);
                    } else {
                        reject("getLiveCameraJPEGURI failed.");
                    }
                }
            });
        });
    }

    getLiveCameraH264URI(cameraName: string){
        console.log("***** getLiveCameraH264URI method", cameraName, this.requestID, "", "video/h264");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetCameraUri', [cameraName, this.requestID, "", "video/h264"], (error: string, result: string) => {
                if (error) {
                    console.log("**** getLiveCameraH264URI response - getCameraNames failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** getLiveCameraH264URI response - success result", result);
                    if (result[0]) {
                        resolve(result[1]);
                    } else {
                        reject("getLiveCameraH264URI failed.");
                    }
                }
            });
        });
    }

    getCameraStatus(cameraName: string) {
        console.log("getCameraStatus method for camera", cameraName, cameraName);
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('getCameraStatusAndEnabled', [cameraName], (error: string, value: string) => {
                if (error) {
                    console.log("**** getCameraStatus response - failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** getCameraStatus response - success value", value);
                    if (value) {
                        resolve(value);
                    } else {
                        reject("getCameraStatus failed.");
                    }
                }
            });
        });
    }

    getRuleInfo(ruleName: string) {
        // console.log("getRuleInfo method for rule", ruleName, ruleName);
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('getRuleInfo', [ruleName], (error: string, value: string) => {
                if (error) {
                    // console.log("**** getRuleInfo response - failed.: ", error);
                    reject(error);
                } else {
                    // console.log("**** getRuleInfo response - success value", value);
                    if (value) {
                        resolve(value);
                    } else {
                        reject("getRuleInfo failed.");
                    }
                }
            });
        });
    }

    getClipThumbnailURIs(thumbnailComboInfoList: any) {
        console.log("***** getClipThumbnailURIs method", thumbnailComboInfoList);
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('remoteGetThumbnailUris', [thumbnailComboInfoList, "image/jpeg", {"maxSize":[200,120]}], (error: any, result: string) => {
                if (error) {
                    const statusCode = error.res && error.res.statusCode; // 502 is server overloaded. retry
                    console.log("**** getClipThumbnailURIs response - getCameraNames failed.: ", statusCode, error);
                    reject(error);
                } else {
                    console.log("**** getClipThumbnailURIs response - success result", result);
                    if (result[0]) {
                        resolve(result[1]);
                    } else {
                        reject("getClipThumbnailURIs failed.");
                    }
                }
            });
        });
    }

    turnCameraOff(cameraName: string) {
        console.log("***** XMLRPC - turnCameraOff method", cameraName, this.requestID, "", "video/h264");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('enableCamera', [cameraName, false], (error: string, result: string) => {
                if (error) {
                    console.log("**** XMLRPC - turnCameraOff response -  failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** XMLRPC - turnCameraOff response - success result", result);
                    resolve();
                }
            });
        });
    }

    turnCameraOn(cameraName: string) {
        console.log("***** XMLRPC - turnCameraOn method", cameraName, this.requestID, "", "video/h264");
        return new Promise((resolve, reject) => {
            this.xrr.methodCall('enableCamera', [cameraName, true], (error: string, result: string) => {
                if (error) {
                    console.log("**** XMLRPC - turnCameraOn - failed.: ", error);
                    reject(error);
                } else {
                    console.log("**** XMLRPC - turnCameraOn - success - result", result);
                    resolve();
                }
            });
        });
    }
}
