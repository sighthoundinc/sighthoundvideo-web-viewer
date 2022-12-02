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
const videojs = require('video.js');

require('../styles/clips.scss');

interface Props {
    videoUri: string;
}

interface State {}

class VideoPlayer extends React.Component<Props, State> {
    htmlVideoElement: HTMLVideoElement;
    videoPlayer: any;

    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        if (!this.props.videoUri) return;
        this.initVideoJs();
    }

    componentWillUnmount() {
        console.log("ClipViewer - Component Will Unmount");
        // Must unmount VideoJS
        this.disposeVideoPlayer();
        this.htmlVideoElement = undefined;
    }

    disposeVideoPlayer() {
        console.log("VideoPlayer - Disposing video player");
        if (!this.videoPlayer) return;
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
            autoplay: false
        };

        this.videoPlayer = videojs(this.htmlVideoElement, vjsOptions, ()=>{
            console.log("VJS Ready");
            this.playVideo();
        });
    }

    playVideo() {
        this.videoPlayer.src({src: this.props.videoUri, type: "application/x-mpegURL"});
        this.videoPlayer.play();
    }

    render() {
        if (!this.props.videoUri) return;

        // Must wrap video element in empty div to make videojs and react play nicely
        return (
            <div>
                <video id="liveVideo" ref={(c) => this.htmlVideoElement = c } controls className="video-js vjs-default-skin"></video>
            </div>
        );
    }
}

export default VideoPlayer;
