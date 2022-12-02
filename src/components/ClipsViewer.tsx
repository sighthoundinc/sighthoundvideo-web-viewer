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
import {Camera, Rule} from './../sighthound';
import MessageOverlay from './MessageOverlay';
import fecha from 'fecha';
import ClipThumbnail from './ClipThumbnail';
import {ClipObjectTypes} from './ClipObjectTypes';
import VideoPlayer from './VideoPlayer';
import LazyLoad from 'react-lazy-load';
import DayPicker from "react-day-picker";
import * as Promise from 'bluebird';
const Queue = require('promise-queue');
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Checkbox from '@material-ui/core/Checkbox';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContent from '@material-ui/core/SnackbarContent';

require("react-day-picker/lib/style.css");
require('../styles/clips.scss');

const NUM_CLIPS_PER_REQUEST = 500;

interface ClipsViewerProps {
    clipList: Map<string, Map<string, Map<string, ClipsQueryDetail>>>;
    cameras: Map<string, Camera> | any;
    cameraName: string;
    ruleName: string;
    searchYYYYMMDD: string;
    filterRule?: string;
    filterCamera?: string;
    getCamerasAndRules: ()=>void;
    getThumbnailUri: any;
    getClipUri: any;
    getClipUriForDownload: any;
    rpcGetClipsForCameraRule: any;
    submitClipToSighthound: (cameraName: string, userNote: string, startTimeArray: any, stopTimeArray: any) => any;
    updateAppState: ({}) => void;
    routerHistory: {push: (uri: string) => void};
}

interface ClipsViewerState {
    dialogOpen: boolean;
    videoUri: string;
    loadingVideo: boolean;
    loadingClips: boolean;
    reportNote: string;
    selectedClipKey: string;
    showDayPicker: boolean;
    snackbarOpen: boolean;
    errorMessage?: {title: string, message: string};
}

export interface Clip extends Array<any> {
    [0]: string;            // cameraName
    [1]: [number, number];  // startTimeArray
    [2]: [number, number];  // stopTimeArray
    [3]: [number, number];  // thumbTimeArray
    [4]: string;            // clipTime
    [5]: [[number, string]];  // objects: [id, type];
}

interface ClipRule {
    name: string;
}

export interface ClipsQueryDetail {
    lastSearchTime: number;
    lastClipIndex: number;
    initialClipCount: number;
    currentClipCount: number;
    clips: Map<string, Clip>;
}

Queue.configure(Promise);

class ClipsViewer extends React.Component<ClipsViewerProps, ClipsViewerState> {
    builtin: {camera: string, rules: string[]};
    loadClipPromise: Promise<Clip[]>;
    clipThumbQueue: any; // promise-queue

    constructor(props: ClipsViewerProps) {
        super(props);
        console.log("ClipsViewer - constructor - props:", this.props);

        this.builtin = {
            camera: "Any camera",
            rules: ["All objects", "People", "Vehicles", "Animals", "Unknown objects"]
        };

        this.state = {
            dialogOpen: false,
            videoUri: undefined,
            loadingVideo: false,
            loadingClips: false,
            reportNote: "",
            selectedClipKey: '',
            snackbarOpen: false,
            showDayPicker: false
        };

        // Setup Queue for Clip Thumb generation reqs to not max out 22 conn limit of SV XMLRPC
        const QUEUE_MAX_CONCURRENT = 10; // 10 seemed to be best balance of speed and concurrency
        const QUEUE_MAX_ITEMS = Infinity;
        this.clipThumbQueue = new Queue(QUEUE_MAX_CONCURRENT, QUEUE_MAX_ITEMS);

        this.getClipUri = this.getClipUri.bind(this);
        this.playFirstClip = this.playFirstClip.bind(this);
        this.changeSearchDate = this.changeSearchDate.bind(this);
        this.getClipThumbUriQueuePromise = this.getClipThumbUriQueuePromise.bind(this);
    }

    componentDidMount() {
        console.log("ClipsViewer - ComponentDidMount");
        this.props.getCamerasAndRules();
        if (this.props.cameraName && this.props.ruleName && this.props.searchYYYYMMDD) {
            this.getLatestClips();
        }
    }

    componentWillUpdate(nextProps: ClipsViewerProps, nextState: ClipsViewerState) {
        if ((nextProps && nextProps.cameraName && nextProps.ruleName && nextProps.searchYYYYMMDD) &&
            (nextProps.cameraName !== this.props.cameraName || nextProps.ruleName !== this.props.ruleName || nextProps.searchYYYYMMDD !== this.props.searchYYYYMMDD)) {
            console.warn("Getting new clips list",nextProps.cameraName, nextProps.ruleName, nextProps.searchYYYYMMDD);
            this.cancelLoadClipPromise();
            this.getLatestClips(nextProps.cameraName, nextProps.ruleName, nextProps.searchYYYYMMDD);
        }
    }

    getServerTimeFromYYYYMMDD(YYYYMMDD: string) {
        // Returns current time in GMT
        const now = new Date();
        const dateString = `${YYYYMMDD} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        let time = (fecha.parse(dateString, 'YYYYMMDD HH:mm:ss') as Date).getTime() / 1000;
        return time;
    }

    clipListContainsRuleAndDate() {
        return this.props.clipList.has(this.props.cameraName) &&
               this.props.clipList.get(this.props.cameraName).has(this.props.ruleName) &&
               this.props.clipList.get(this.props.cameraName).get(this.props.ruleName).has(this.props.searchYYYYMMDD);
    }

    getYYYYMMDD(date: number) {
        return fecha.format(date, 'YYYYMMDD');
    }

    handleDialogClickOpen = () => {
        this.setState({
            dialogOpen: true,
            reportNote: "",
        });
    }

    handleDialogClickClose = () => {
        this.setState({ dialogOpen: false });
    }

    loadOlderClips() {
        if (this.state.loadingClips) return;
        this.getClipsForCameraRule(this.props.cameraName, this.props.ruleName, this.getServerTimeFromYYYYMMDD(this.props.searchYYYYMMDD), NUM_CLIPS_PER_REQUEST, false);
    }

    getNextClipIndex(ruleName: string, searchDateSec: number, numClipsToLoad: number) {
        console.log("*** getNextClipIndex ruleName, searchDateSec", ruleName, searchDateSec);
        if (!searchDateSec || !ruleName || !this.clipListContainsRuleAndDate() || !this.hasClipListForSelectedCameraRuleDay()) return 0;

        const YYYYMMDD = fecha.format(searchDateSec * 1000, 'YYYYMMDD');
        console.log("*** getNextClipIndex YYYYMMDD", YYYYMMDD);
        console.log("*** getNextClipIndex clip.lastClipIndex", this.props.clipList.get(this.props.cameraName).get(ruleName).get(YYYYMMDD).lastClipIndex);
        const lastClipIndex = this.props.clipList.get(this.props.cameraName).get(ruleName).get(YYYYMMDD).lastClipIndex;
        const nextStartIndex = lastClipIndex - numClipsToLoad;
        return nextStartIndex < 0 ? 0 : nextStartIndex;
    }

    getClipsForCameraRule(cameraName: string, ruleName: string, searchTimeSec: number, numClips: number, getNewest?: boolean){
        console.log("getClipsForCameraRule", cameraName, ruleName, searchTimeSec, numClips);
        this.setState({
            loadingClips: true,
            errorMessage: undefined
        });
        const YYYYMMDD = fecha.format(searchTimeSec * 1000, 'YYYYMMDD');
        const firstClipNum = getNewest ? 0 : this.getNextClipIndex(ruleName, searchTimeSec, numClips);
        console.log("getClipsForCamera firstClip Num", firstClipNum);
        let oldestFirst = true;

        if (!this.props.clipList) console.log("&&&&&&&& No clips returning", JSON.stringify(this.props.clipList));
        if (!this.props.clipList.has(cameraName) || !this.props.clipList.get(cameraName).has(ruleName) || !this.props.clipList.get(cameraName).get(ruleName).has(YYYYMMDD) || getNewest) {
            // Rule doesn't exist yet or at least not for the given date.
            // Start with newest rules
            oldestFirst = false;
        }

        this.props.rpcGetClipsForCameraRule(cameraName, ruleName, searchTimeSec, numClips, firstClipNum, oldestFirst).then(
                (response: [boolean, Clip[], number]): null => {
                    let clipsMap: any;
                    let newClipList;
                    let clipsData;
                    let lastClipIndex;

                    if (!this.props.clipList.has(cameraName) || !this.props.clipList.get(cameraName).has(ruleName) || !this.props.clipList.get(cameraName).get(ruleName).has(YYYYMMDD) || getNewest) {
                        console.log("********* Initial population - !this.props.clipList.has(ruleName) || !this.props.clipList.get(ruleName).has(YYYYMMDD) || getNewest");
                        const newMap = new Map();
                        let uniqueId;
                        for (let index = 0; index < response[1].length; index++) {
                            const clipIndex = response[2] - 1  - index;
                            console.log("clipIndex", clipIndex);
                            if (clipIndex < 0) break;
                            const clip = response[1][index];
                            console.log("setting initial clipsMap", clipIndex);
                            newMap.set(this.getUniqueClipId(clip), clip); // for newest to oldest
                        }

                        clipsData = {} as any;
                        clipsData.initialClipCount = response[2] ;

                        // TODO What happens when clips get deleted from server and lastClipIndex points to different clip???
                        if (getNewest && this.props.clipList.has(cameraName) && this.props.clipList.get(cameraName).has(ruleName) && this.props.clipList.get(cameraName).get(ruleName).has(YYYYMMDD)) {
                            console.log("Got newest and old records exist. Appending.");
                            console.log("New MAP", newMap);
                            const oldMap = new Map(this.props.clipList.get(cameraName).get(ruleName).get(YYYYMMDD).clips);
                            console.warn("OLD MAP", oldMap);
                            const clipGap = clipsData.initialClipCount - this.props.clipList.get(cameraName).get(ruleName).get(YYYYMMDD).initialClipCount - numClips;
                            const firstOldClip = oldMap.keys().next().value;
                            const firstOldClipIsNotInNewClips = newMap.has(firstOldClip);
                            if (clipGap > 0 || firstOldClipIsNotInNewClips) {
                                console.warn("****** FIXME: Appending newest clip list but there will be a gap of " + clipGap + " records.");
                                console.warn("****** FIXME: Does the firstOldClip exist in the new Map?", firstOldClipIsNotInNewClips);
                            } else {
                                console.log("Appending clips and have no gap. ", clipGap);
                            }
                            clipsMap = new Map([...newMap, ...oldMap]);
                            lastClipIndex = this.props.clipList.get(cameraName).get(ruleName).get(YYYYMMDD).lastClipIndex;
                        } else {
                            clipsMap = newMap;
                            lastClipIndex = response[2] - newMap.size;
                        }

                    } else {
                        console.warn("********* Already have clips - appending to list");
                        clipsData = Object.assign({}, this.props.clipList.get(cameraName).get(ruleName).get(YYYYMMDD));
                        const oldClipsMap = new Map(clipsData.clips);
                        console.log("oldClipsMap", oldClipsMap);
                        const newClipsMap = new Map();
                        lastClipIndex = firstClipNum;
                        for (let index = 0; index < response[1].length; index++) {
                            const clip = response[1][index];
                            newClipsMap.set(this.getUniqueClipId(clip), clip); // for newest to oldest
                        }
                        console.warn("new clipsMap", newClipsMap );
                        const reversedMap = new Map([...newClipsMap].reverse());
                        clipsMap = new Map([...oldClipsMap, ...reversedMap]);
                    }

                    clipsData.lastSearchTime = searchTimeSec * 1000;
                    clipsData.lastClipIndex = lastClipIndex;
                    clipsData.currentClipCount = response[2];
                    clipsData.clips = clipsMap;
                    console.warn("clipsData", clipsData);

                    const clipsByDateMap = new Map([[YYYYMMDD, clipsData]]);

                    if (!this.props.clipList.has(cameraName) || !this.props.clipList.get(cameraName).has(ruleName)) {
                        newClipList = new Map([[cameraName, new Map([[ruleName, clipsByDateMap]])]]);
                        newClipList = new Map([...this.props.clipList, ...newClipList]);
                    } else {
                        newClipList = new Map(this.props.clipList);
                        newClipList.get(cameraName).get(ruleName).set(YYYYMMDD, clipsData);
                    }

                    this.props.updateAppState({clipList: newClipList});
                    this.setState({
                        loadingClips: false
                    }, () => {
                        // COMMENTED OUT LOADING FIRST CLIP TO SAVE PROCESSING TIME ON INITIAL SERVER REQUEST
                        // if (!this.state.selectedClipKey && this.props.clipList.size && this.clipListContainsRuleAndDate() && this.getClipsCount() > 0) {
                        //     this.playFirstClip();
                        // }
                    });

                    return null; // Stop bluebird warning of non-returned promise after adding catch below
                }
            ).catch(()=>{
                this.setState({
                    errorMessage: {title: 'An error occurred. Please try again.', message: ''}
                });
            });
    }

    cancelLoadClipPromise() {
        console.log("ClipsViewer - cancelLoadClipPromise", this.loadClipPromise);
        if (!this.loadClipPromise) return;
        console.log("ClipsViewer - cancelLoadClipPromise - Calling cancel promise");
        this.loadClipPromise.cancel();
        this.loadClipPromise = undefined;
        this.setState({
            loadingVideo: false
        });
    }

    getMsFromYYYYMMDD(YYYYMMDD: string) {
        return (fecha.parse(this.props.searchYYYYMMDD, 'YYYYMMDD') as Date).getTime();
    }

    showDayPicker() {
        this.setState({
            showDayPicker: true
        });
    }

    changeSearchDate(toPreviousDay: boolean) {
        console.log("Changing search Date - previous day?", toPreviousDay);
        const oneDayMs = 24 * 60 * 60 * 1000;
        let searchDate = this.getMsFromYYYYMMDD(this.props.searchYYYYMMDD);

        if (toPreviousDay) {
            searchDate -= oneDayMs;
        } else {
            searchDate += oneDayMs;
        }

        this.navigateToNewUri(this.props.cameraName, this.props.ruleName, this.getYYYYMMDD(searchDate));
    }

    navigateToNewUri(cameraName: string, ruleName: string, searchDate: string) {
        this.setState({
            showDayPicker: false,
            videoUri: undefined,
            selectedClipKey: undefined
        }, () => this.props.routerHistory.push(`/clips/${cameraName}/${ruleName}/${searchDate}`));
    }

    getClipUri(cameraName: string, startTimeArray: any, stopTimeArray: any, objectIds: number[], clipId: string) {
        console.log("ClipsViewer - getClipUri - Clip clicked.", cameraName, startTimeArray, stopTimeArray, objectIds);
        if (this.loadClipPromise) {
            console.log("ClipsViewer - getClipUri - this.loadClipPromise exists. Cancelling it...", this.loadClipPromise);
            this.cancelLoadClipPromise();
        }

        if (this.state.selectedClipKey === clipId) return; // Same clip was clicked
        this.setState({
            loadingVideo: true,
            errorMessage: undefined,
            selectedClipKey: clipId
        }, () => {
            this.loadClipPromise = this.props.getClipUri(cameraName, startTimeArray, stopTimeArray, 'video/h264', {objectIds}
            ).then((result: string)=>{
                console.log("playing clip: ", result[1]);
                this.setState({videoUri: `${result}?${clipId}`, loadingVideo: false});
            }).catch(
                (response: any) => {
                    console.log("Clips Viewer - getClipUri error", response);
                    // Error with request. Commonly caused by clip not being available on server.
                    this.setState({
                        loadingVideo: false,
                        errorMessage: {
                            title: 'Error loading clip',
                            message: 'Select another clip and try again shortly.'}
                    }, () => {
                        console.log("Error message set.");
                    });
            }).finally((): void => {
                this.loadClipPromise = undefined;
            });
        });

    }

    getLatestClips(cameraName?: string, ruleName?: string, YYYYMMDD?: string) {
        if (this.state.loadingClips) return;
        if (!cameraName) cameraName = this.props.cameraName;
        if (!ruleName) ruleName = this.props.ruleName;
        if (!YYYYMMDD) YYYYMMDD = this.props.searchYYYYMMDD;
        this.getClipsForCameraRule(cameraName, ruleName, this.getServerTimeFromYYYYMMDD(YYYYMMDD), NUM_CLIPS_PER_REQUEST, true);
    }

    getUniqueClipId(clipArray: Clip) {
        return `${clipArray[0]}${clipArray[1][0]}`;
    }

    getObjectIds(clip: Clip) {
        return clip[5].map((item: [number, string]) => {
            return item[0];
        });
    }

    playFirstClip() {
        console.warn("Playing first clip");
        console.log("this.props.clipList.has(this.props.ruleName)", this.props.clipList.size, this.props.ruleName, this.props.clipList.has(this.props.ruleName));
        const firstClip = this.props.clipList.get(this.props.cameraName).get(this.props.ruleName).get(this.props.searchYYYYMMDD).clips.values().next().value;
        this.getClipUri(firstClip[0], firstClip[1], firstClip[2], this.getObjectIds(firstClip), this.getUniqueClipId(firstClip));
    }

    handleDayClick(day: any, { disabled }: {disabled: boolean}) {
        const selectedDay = day.getTime();
        if (disabled) return;
        if (this.getYYYYMMDD(selectedDay) === this.props.searchYYYYMMDD) {
            // Same day selected. Just hide DayPicker
            this.setState({
                showDayPicker: false
            });
        } else {
            // Different day chosen
            this.navigateToNewUri(this.props.cameraName, this.props.ruleName, this.getYYYYMMDD(selectedDay));
        }
    }

    cameraContainsRule(cameraName: string, ruleName: string) {
        if (this.builtin.camera === cameraName || this.builtin.rules.includes(ruleName)) return true;
        if (!this.props.cameras.has(cameraName)) return false;
        const result = this.props.cameras.get(cameraName).rules.reduce((foundRule: boolean, rule: Rule) => {
            return foundRule || rule.name === ruleName;
        }, false);

        return result;
    }

    onCameraChange(evt: React.ChangeEvent<HTMLSelectElement>) {
        console.warn("onCameraChange", evt.target.value);
        let ruleName: string;
        if (this.cameraContainsRule(evt.target.value, this.props.ruleName)) {
            ruleName = this.props.ruleName;
        } else {
            ruleName = this.builtin.rules[0];
        }
        this.navigateToNewUri(evt.target.value, ruleName, this.props.searchYYYYMMDD);
    }

    onRuleChange(evt: React.ChangeEvent<HTMLSelectElement>) {
        console.warn("onRuleChange", evt.target.value);
        this.navigateToNewUri(this.props.cameraName, evt.target.value, this.props.searchYYYYMMDD);
    }

    onRefreshClicked() {
        this.getLatestClips(this.props.cameraName, this.props.ruleName);
    }

    renderMessageOverlay() {
        const messageProps = this.getMessageOverlayContents();
        if (!messageProps) return;
        return <MessageOverlay {...messageProps} />;
    }

    handleReportNoteChange = (event: any) => {
        this.setState({reportNote: event.target.value});
    }

    handleSnackbarClose = (event: any, reason: any) => {
        if (reason === 'clickaway') {
          return;
        }

        this.setState({ snackbarOpen: false });
      };

    showSnackbar = () => {
        return (
            <Snackbar
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                open={this.state.snackbarOpen}
                autoHideDuration={3000}
                onClose={this.handleSnackbarClose}
                >
                    <SnackbarContent
                        className="success"
                        aria-describedby="client-snackbar"
                        message={
                            <span id="client-snackbar">
                            Sending video to Sighthound. Thank you.
                            </span>
                        }
                    />
                </Snackbar>
          );
    }

    renderDialogButton() {
        return (
          <React.Fragment>
            <Button
                disabled={!this.state.videoUri || this.state.dialogOpen}
                variant="outlined"
                color="primary"
                onClick={this.handleDialogClickOpen}>
              Send to Sighthound
            </Button>
            <Dialog
              open={this.state.dialogOpen}
              onClose={this.handleDialogClickClose}
              aria-labelledby="form-dialog-title"
            >
              <DialogTitle id="form-dialog-title">Send Video to Sighthound</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Help improve the accuracy of Sighthound Video by sharing videos with detection or any other issues.
                </DialogContentText>
                <br />
                <DialogContentText>
                  By clicking <b>Send Video</b>, you agree to provide this content (including any notes) in accordance with the <a href="https://www.sighthound.com/privacy" target="_blank">Sighthound Privacy Policy</a> and <a href="https://www.sighthound.com/terms" target="_blank">Terms of Use</a>. Your data will be only used by Sighthound and not shared with any 3rd parties.
                </DialogContentText>
                <form id="myform" onSubmit={this.submitClipToSighthound}>
                    <TextField
                        id="problemNote"
                        label="(Optional) Describe the issue"
                        onChange={this.handleReportNoteChange}
                        value={this.state.reportNote}
                        fullWidth
                        autoFocus
                    />
                </form>
              </DialogContent>
              <DialogActions>
                <Button onClick={this.handleDialogClickClose} color="primary">
                  Cancel
                </Button>
                <Button
                    type= "submit"
                    form= "myform"
                    color="primary">
                        Send Video
                </Button>
              </DialogActions>
            </Dialog>
          </React.Fragment>
        );
      }

    getMessageOverlayContents(): {title: string, message?: string, showSpinner?: boolean} {
        if (!this.state.loadingClips && !this.state.loadingVideo && !this.state.errorMessage && this.getClipsCount() > 0 && this.state.selectedClipKey) return;
        if (this.state.errorMessage) return this.state.errorMessage;
        if (this.state.loadingClips) return {title: 'Loading Clips', showSpinner: true};
        if (this.state.loadingVideo) return {title: 'Loading Video', showSpinner: true};
        if (this.getClipsCount() === 0) return {title: 'No clips exist for the selected date.'};
        if (!this.state.selectedClipKey) return {title: 'Select a Video.'};
    }

    getClipsCount() {
        if (!this.hasClipListForSelectedCameraRuleDay()) return 0;
        const clipList = this.getSearchDateClipListDetails();
        return clipList.currentClipCount;
    }

    hasClipListForSelectedCameraRuleDay() {
        const clipList = this.props.clipList;
        if (!clipList) return false;
        const clipListCamera = clipList.get(this.props.cameraName);
        if (!clipListCamera) return false;
        const clipListRule = clipListCamera.get(this.props.ruleName);
        if (!clipListRule) return false;
        const clipListDate = clipListRule.get(this.props.searchYYYYMMDD);
        if (!clipListDate) return false;

        return true;
    }

    getSearchDateClipListDetails() {
        // NOTE: Use hasClipListForSelectedCameraRuleDay to make sure clips exist for camera, rule, date
        return this.props.clipList.get(this.props.cameraName).get(this.props.ruleName).get(this.props.searchYYYYMMDD);
    }

    getClipThumbUriQueuePromise(params: any) {
        return new Promise((resolve, reject) => {
            this.clipThumbQueue.add(()=>{
                return this.props.getThumbnailUri(params).then((response: any) =>{
                    // console.log("ClipsViewer - getClipThumbUriQueuePromise - Queue length, #pending, response", this.clipThumbQueue.getQueueLength(), this.clipThumbQueue.pendingPromises, response);
                    resolve(response);
                }).catch((error: any)=> {
                    reject(error);
                });
            });
        });
    }

    renderClipList() {
        console.log("rendering clip list", this.props.clipList.size);
        console.log("rendering clip list - has ruleName", this.props.ruleName, this.props.clipList.has(this.props.ruleName));
        if (!this.clipListContainsRuleAndDate()) {
            console.log("ClipViewer - renderClipList - Nothing to render :(");
            return;
        }

        const queryResult = this.props.clipList.get(this.props.cameraName).get(this.props.ruleName).get(this.props.searchYYYYMMDD)
        if (!queryResult) return;

        const clipsMap = queryResult.clips;
        const clipElements: any = [];
        let counter = 1;
        clipsMap.forEach((value: Clip, key: string) => {
            const uniqueId = `${key}`;
            const onContentVisible = (this.getClipsCount() > clipsMap.size) && (counter === clipsMap.size)  ? this.loadOlderClips.bind(this) : undefined;

            if (this.props.cameraName === this.builtin.camera || this.props.cameraName === value[0]) {
                const cssClass = uniqueId === this.state.selectedClipKey ? "clipThumb clipLink active" : "clipThumb clipLink";
                clipElements.push(
                    <div key={uniqueId} id={uniqueId} className={cssClass} onClick={()=>this.getClipUri(value[0], value[1], value[2], this.getObjectIds(value), key)}>
                        <div className="clipThumbImage">
                            <LazyLoad offset={onContentVisible ? 100 : 700} onContentVisible={onContentVisible}>
                                    <ClipThumbnail
                                        id={`clip_image_${key}`}
                                        cameraName={value[0]}
                                        thumbnailTimeArray={value[3]}
                                        getThumbnailUri={this.getClipThumbUriQueuePromise} />
                            </LazyLoad>
                        </div>

                        <div className="clipThumbDescription">
                            <strong>{value[0]}</strong><br />
                            {value[4]}
                            <ClipObjectTypes objects={value[5]} />
                        </div>
                    </div>
                );
            }

            counter++;
        });

        return clipElements;
    }

    renderCameraSelect(selected: string) {
        let options: any = [];
        let camerasContainSelected = false;

        if (this.props.cameras.size) {
            this.props.cameras.forEach((camera: Camera) => {
                if (camera.name === selected) camerasContainSelected = true;
                options.push(<option key={camera.name}>{camera.name}</option>);
            });
        }

        if (!camerasContainSelected && this.builtin.camera !== selected) {
            options.push(<option key={selected}>{selected}</option>);
        }

        if (options.length !== 1) {
            options.unshift(<option key={this.builtin.camera}>{this.builtin.camera}</option>);
        }

        return (
            <select value={this.props.cameraName} onChange={this.onCameraChange.bind(this)}>
                {options}
            </select>
        );
    }

    renderRulesSelect(selected: string) {
        let ruleNames: any = [];
        let options: any = [];

        if (this.props.cameraName === this.builtin.camera) {
            // get all rules
            this.props.cameras.forEach((camera: Camera) => {
                camera.rules.forEach((rule: Rule) => {
                    ruleNames.push(rule.name);
                });
            });
        } else if (this.props.cameras.has(this.props.cameraName)) {
            this.props.cameras.get(this.props.cameraName).rules.forEach((rule: Rule) => {
                ruleNames.push(rule.name);
            });
        }

        if (!this.builtin.rules.includes(selected) && !ruleNames.includes(selected)) {
            console.log("ruleNames does not include selected", ruleNames, selected);
            ruleNames.push(selected);
        }

        ruleNames = ruleNames.sort();
        ruleNames = [...this.builtin.rules, ...ruleNames];

        ruleNames.forEach((ruleName: string) => {
            options.push(<option key={ruleName} value={ruleName}>{ruleName}</option>);
        });

        return (
            <select onChange={this.onRuleChange.bind(this)} value={this.props.ruleName}>
                {options}
            </select>
        );
    }

    renderClipDate() {
        console.log("Render clip date", Date.now(), this.getYYYYMMDD(Date.now()), this.props.searchYYYYMMDD, this.props.searchYYYYMMDD);
        return fecha.format((fecha.parse(this.props.searchYYYYMMDD, 'YYYYMMDD') as Date), 'MMM D, YYYY');
    }

    renderDayPicker() {
        if (!this.state.showDayPicker) return;
        const dateNow = new Date();
        return (
            <DayPicker
                selectedDays={(fecha.parse(this.props.searchYYYYMMDD, 'YYYYMMDD') as Date)}
                onDayClick={this.handleDayClick.bind(this)}
                toMonth={dateNow}
                disabledDays={[{ after: dateNow }]}/>
        );
    }

    downloadClip() {
        console.log("retrieving clip download uri");
        const clipsMap = this.props.clipList.get(this.props.cameraName).get(this.props.ruleName).get(this.props.searchYYYYMMDD).clips;
        const clipId = this.state.selectedClipKey;
        const clip = clipsMap.get(clipId);
        const objectIds = this.getObjectIds(clip);

        this.props.getClipUriForDownload(clip[0], clip[1], clip[2], "video/h264", {objectIds}
        ).then((result: string)=>{
            let uri = `${result}?${clipId}`;
            let parent = document;

            console.log("downloading clip: ", uri);

            let link = parent.createElement("a");
            if (link.download !== undefined) {
                //Set HTML5 download attribute. This will prevent file from opening if supported.
                let fileNameAndQuery = uri.substring(uri.lastIndexOf('/') + 1, uri.length);
                let fileName = fileNameAndQuery;
                let qm = fileName.indexOf("?");
                if ( qm != -1 ) {
                    fileName = fileName.substring(0, qm);
                }
                link.download = fileName;
            }
            link.href = uri;
            parent.body.appendChild(link);
            link.click();
            parent.body.removeChild(link);
        }).catch(
            (response: any) => {
                console.log("Clips Viewer - getClipUri error", response);
        }).finally((): void => {
        });
    }

    renderDownloadButton() {
        let dlClass: string;

        if (this.state.videoUri) {
            dlClass += ' active';
        }

        return (
            <Button
                disabled={!this.state.videoUri}
                variant="outlined"
                color="primary"
                onClick={this.downloadClip.bind(this)}
                className={dlClass}>
              Download
            </Button>
        );
    }

    renderVideoPlayer() {
        if (!this.state.videoUri || this.state.loadingVideo) return;
        return <VideoPlayer key={this.state.videoUri} videoUri={this.state.videoUri}/>;
    }

    submitClipToSighthound = () => {
        const clipsMap = this.props.clipList.get(this.props.cameraName).get(this.props.ruleName).get(this.props.searchYYYYMMDD).clips;
        const clipId = this.state.selectedClipKey;
        const clip = clipsMap.get(clipId);
        this.props.submitClipToSighthound(clip[0], this.state.reportNote, clip[1], clip[2]);
        this.setState({snackbarOpen: true});
        this.handleDialogClickClose();
    }

    render() {
        const clipList = this.props.clipList;
        if (clipList.size && clipList.has(this.props.ruleName) && clipList.get(this.props.ruleName).has(this.props.searchYYYYMMDD)) {
            console.log("lastClipIndex",  clipList.get(this.props.cameraName).get(this.props.ruleName).get(this.props.searchYYYYMMDD).lastClipIndex);
        }
        console.log("ClipsViewer rendered", JSON.stringify(this.props), JSON.stringify(this.state.videoUri) );

        const forwardArrowStyle: any = this.getYYYYMMDD(Date.now()) === this.props.searchYYYYMMDD ? {visibility: 'hidden'} : {visibility: 'visible'};
        console.log("forward arrow style", this.getYYYYMMDD(Date.now()), this.props.searchYYYYMMDD, forwardArrowStyle);

        console.log("rendering ClipsViewer", JSON.stringify(this.props));
        return (
            <div className="content ClipsViewer">
                {this.showSnackbar()}
                <div className="clipsMenu">
                    {this.renderDayPicker()}
                    <div className="clipsNavigation">
                        <div className="clipsNavigationContainer">
                                <div id="navClipsLeft" className="clipsNavArrowLeft" onClick={()=>this.changeSearchDate(true)}>
                                    <img src="img/iconArrowLeft.png" />
                                </div>

                                <div id="navClipsRight" className="clipsNavArrowRight" style={forwardArrowStyle} onClick={()=>this.changeSearchDate(false)}>
                                    <img src="img/iconArrowRight.png" />
                                </div>
                            <div className="clipsDate">
                                <img src="img/iconCalendar.png" id="iconCalendar" height="15" onClick={this.showDayPicker.bind(this)}/>
                                <span id="clipDay" onClick={this.showDayPicker.bind(this)}>{this.renderClipDate()}</span>
                            </div>
                        </div>
                        <div className="clipsResults">
                            <div className="resultNumber"><span id="clipCount">{this.getClipsCount()}</span> Results</div>
                            <div className="resultRefresh"><a id="refreshClips" onClick={this.onRefreshClicked.bind(this)}>Refresh</a></div>
                        </div>
                    </div>


                    <div id="clipsList" className="clipsList">{this.renderClipList()}</div>
                </div>

                <div className="clips">
                    <div className="contextMenu">
                    <div className="title ellipsis">Camera {this.renderCameraSelect(this.props.cameraName)} &nbsp; Rule {this.renderRulesSelect(this.props.ruleName)} &nbsp; {this.renderDownloadButton()} &nbsp; {this.renderDialogButton()}</div>
                </div>

                    <div className="videoClip">
                        <div id="videoClip">
                            {this.renderMessageOverlay()}
                            {this.renderVideoPlayer()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default ClipsViewer;
